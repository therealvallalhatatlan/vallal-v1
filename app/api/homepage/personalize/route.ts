import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit"
import { buildHomepageContext, recordHomepageVisit } from "@/lib/homepage-ai/context"
import { prepareHomepagePlan } from "@/lib/homepage-ai/planner"
import type { HomepagePlan } from "@/lib/homepage-ai/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function parseBoolean(value: unknown) {
  return value === true || value === "true"
}

function fallbackFirstName(email: string | null, metadata: Record<string, unknown> | null) {
  const metadataName =
    typeof metadata?.name === "string"
      ? metadata.name
      : typeof metadata?.full_name === "string"
        ? metadata.full_name
        : null

  if (metadataName?.trim()) return metadataName.trim().split(/\s+/)[0]
  if (email?.includes("@")) return email.split("@")[0]
  return "NODE"
}

function isPlan(value: unknown): value is HomepagePlan {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as HomepagePlan).greeting === "string" &&
      Array.isArray((value as HomepagePlan).blocks),
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = parseBearerToken(request.headers)
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "missing_token" },
        { status: 401 },
      )
    }

    const user = await getUserFromToken(token)
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "unauthenticated" },
        { status: 401 },
      )
    }

    const rate = checkRateLimit(
      "homepage-ai:user:" + user.id,
      8,
      10 * 60_000,
    )

    if (!rate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: "rate_limited",
          retryAfterSeconds: rate.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSeconds),
            "Cache-Control": "no-store",
          },
        },
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      sessionId?: unknown
      isMobile?: unknown
      isInAppBrowser?: unknown
      referrerHost?: unknown
    }

    const url = new URL(request.url)
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() || null : null

    const admin = supabaseAdmin()
    const authUserRes = await admin.auth.admin.getUserById(user.id)
    const authUser = authUserRes.data.user
    const email = authUser?.email ?? user.email ?? null

    const firstName = fallbackFirstName(
      email,
      authUser?.user_metadata ?? null,
    )

    const context = await buildHomepageContext({
      userId: user.id,
      email,
      firstName,
      request,
      sessionId,
      hour: Number(url.searchParams.get("hour") ?? new Date().getHours()),
      isMobile: parseBoolean(body.isMobile),
      isInAppBrowser: parseBoolean(body.isInAppBrowser),
      referrerHost:
        typeof body.referrerHost === "string"
          ? body.referrerHost.slice(0, 180)
          : null,
      utmSource: url.searchParams.get("utm_source"),
      utmCampaign: url.searchParams.get("utm_campaign"),
    })

    if (sessionId && context.previousHomepage.sessionId === sessionId) {
      const cached = await admin
        .from("homepage_memory")
        .select("last_plan")
        .eq("user_id", user.id)
        .maybeSingle()

      if (isPlan(cached.data?.last_plan)) {
        await recordHomepageVisit(context, user.id, sessionId)
        return NextResponse.json(
          { ok: true, plan: cached.data.last_plan, cached: true },
          { headers: { "Cache-Control": "no-store" } },
        )
      }
    }

    const plan = await prepareHomepagePlan(context)

    await recordHomepageVisit(context, user.id, sessionId)

    const firstProduct = plan.blocks.find((block) => block.type === "product")
    const firstStory = plan.blocks.find((block) => block.type === "story")

    const memoryUpdate = await admin.from("homepage_memory").upsert(
      {
        user_id: user.id,
        last_plan: plan,
        last_session_id: sessionId,
        last_hook: plan.greeting,
        last_product_id:
          firstProduct?.type === "product" ? firstProduct.productId : null,
        last_story_slug:
          firstStory?.type === "story" ? firstStory.storySlug : null,
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (memoryUpdate.error) {
      console.error("[homepage-ai] memory save failed", memoryUpdate.error)
    }

    return NextResponse.json(
      { ok: true, plan, cached: false },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("[homepage-ai] route failed", error)
    return NextResponse.json(
      { ok: false, error: "homepage_personalization_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    )
  }
}

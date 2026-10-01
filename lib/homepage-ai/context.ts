import type { NextRequest } from "next/server"
import { getAllStories, type Story } from "@/lib/content"
import { products, type Product } from "@/lib/shop/products"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserBadges } from "@/lib/userBadges"
import type {
  HomepageContext,
  HomepageOrderContext,
  HomepageOrderStatus,
  HomepageProductCandidate,
  HomepageSource,
} from "./types"

type BuildHomepageContextInput = {
  userId: string
  email: string | null
  firstName: string
  request: NextRequest
  sessionId: string | null
  hour: number
  isMobile: boolean
  isInAppBrowser: boolean
  utmSource: string | null
  utmCampaign: string | null
}

function sourceFrom(
  utmSource: string | null,
  referrerHost: string | null,
  isInAppBrowser: boolean,
  userAgent: string,
): HomepageSource {
  const source = (utmSource ?? "").toLowerCase()

  if (source.includes("facebook") || source === "fb") return "facebook"
  if (source.includes("instagram") || source === "ig") return "instagram"
  if (source.includes("reddit")) return "reddit"
  if (source.includes("substack")) return "substack"
  if (source.includes("google")) return "google"
  if (source.includes("qr")) return "qr"

  const host = (referrerHost ?? "").toLowerCase()
  if (host.includes("facebook.") || host.includes("l.facebook.")) return "facebook"
  if (host.includes("instagram.")) return "instagram"
  if (host.includes("reddit.")) return "reddit"
  if (host.includes("substack.")) return "substack"
  if (host.includes("google.")) return "google"

  if (isInAppBrowser) {
    if (/FBAN|FBAV/i.test(userAgent)) return "facebook"
    if (/Instagram/i.test(userAgent)) return "instagram"
  }

  return referrerHost ? "unknown" : "direct"
}

function availableProduct(product: Product): boolean {
  if (product.comingSoon) return false
  if (typeof product.stock === "number" && product.stock > 0) return true
  if (product.sizeStock && Object.values(product.sizeStock).some((value) => Number(value) > 0)) {
    return true
  }
  if (product.colorStock && Object.values(product.colorStock).some((value) => Number(value) > 0)) {
    return true
  }
  return Boolean(product.preorder?.preorderOnly)
}

function orderStatus(value: string): HomepageOrderStatus {
  if (
    value === "pending" ||
    value === "paid" ||
    value === "ready_to_dispatch" ||
    value === "dispatched" ||
    value === "fulfilled" ||
    value === "cancelled"
  ) {
    return value
  }

  return "pending"
}

function mapBookLabel(productId: string | null): string {
  if (!productId) return "Vállalhatatlan rendelés"
  if (productId === "book-2" || productId.includes("book_2") || productId.includes("book-ii")) {
    return "Vállalhatatlan könyv II."
  }
  if (productId.toLowerCase().includes("book")) return "Vállalhatatlan könyv"
  return productId
}

function daysBetween(now: number, value: string | null): number | null {
  if (!value) return null
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return null
  return Math.floor(Math.max(0, now - time) / 86400000)
}

export async function buildHomepageContext(
  input: BuildHomepageContextInput,
): Promise<HomepageContext> {
  const db = supabaseAdmin()
  const now = Date.now()
  const referrer = input.request.headers.get("referer") ?? ""
  let referrerHost: string | null = null

  try {
    referrerHost = referrer ? new URL(referrer).host : null
  } catch {
    referrerHost = null
  }

  const source = sourceFrom(
    input.utmSource,
    referrerHost,
    input.isInAppBrowser,
    input.request.headers.get("user-agent") ?? "",
  )

  const [
    profileRes,
    bookOrdersRes,
    shopOrdersRes,
    claimsRes,
    spotsRes,
    copiesRes,
    visitsRes,
    visitCountRes,
    memoryRes,
    badges,
    stories,
  ] = await Promise.all([
    db
      .from("users")
      .select("created_at")
      .eq("id", input.userId)
      .maybeSingle(),
    db
      .from("orders")
      .select("id, created_at, status, product_id, delivery_type, user_received_at")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("shop_orders")
      .select("id, created_at, status, user_received_at, metadata")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("claims")
      .select("created_at, status")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("sticker_spots")
      .select("created_at, status")
      .eq("creator_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("book_copies")
      .select("copy_number, status")
      .eq("order_email", input.email ?? "")
      .eq("status", "sold")
      .limit(100),
    db
      .from("homepage_visits")
      .select("visited_at, session_id")
      .eq("user_id", input.userId)
      .order("visited_at", { ascending: false })
      .limit(12),
    db
      .from("homepage_visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", input.userId)
      .gte("visited_at", new Date(now - 30 * 86400000).toISOString()),
    db
      .from("homepage_memory")
      .select("last_plan, last_session_id, last_hook, last_product_id, last_story_slug, last_generated_at")
      .eq("user_id", input.userId)
      .maybeSingle(),
    getUserBadges(input.userId, input.email),
    getAllStories().catch(() => [] as Story[]),
  ])

  const badgeCodes = new Set(badges.map((badge) => badge.code))
  const book1 = badgeCodes.has("first_book") || (copiesRes.data?.length ?? 0) > 0
  const book2 = badgeCodes.has("second_book")
  const merch = badgeCodes.has("merch")
  const mecenas = badgeCodes.has("mecenas")
  const founder = badgeCodes.has("founder")

  const projectActivityDates = [
    ...(bookOrdersRes.data ?? []).map((order) => order.created_at),
    ...(shopOrdersRes.data ?? []).map((order) => order.created_at),
    ...(claimsRes.data ?? []).map((claim) => claim.created_at),
    ...(spotsRes.data ?? []).map((spot) => spot.created_at),
  ].filter((value): value is string => Boolean(value))

  const lastProjectActivity =
    projectActivityDates.length > 0
      ? projectActivityDates.reduce((latest, value) =>
          new Date(value).getTime() > new Date(latest).getTime() ? value : latest,
        )
      : null

  const priorVisit =
    (visitsRes.data ?? []).find(
      (visit) => !input.sessionId || visit.session_id !== input.sessionId,
    )?.visited_at ?? null

  const orderContexts: HomepageOrderContext[] = [
    ...(bookOrdersRes.data ?? []).map((order) => ({
      id: \`book:\${order.id}\`,
      label: mapBookLabel(order.product_id ?? null),
      status: orderStatus(order.status),
      createdAt: order.created_at,
      userReceivedAt: order.user_received_at ?? null,
      deliveryType: order.delivery_type ?? null,
    })),
    ...(shopOrdersRes.data ?? []).map((order) => ({
      id: \`shop:\${order.id}\`,
      label: "Merch rendelés",
      status: orderStatus(order.status),
      createdAt: order.created_at,
      userReceivedAt: order.user_received_at ?? null,
      deliveryType:
        order.metadata &&
        typeof order.metadata === "object" &&
        typeof (order.metadata as Record<string, unknown>).deliveryMethod === "string"
          ? String((order.metadata as Record<string, unknown>).deliveryMethod)
          : null,
    })),
  ].slice(0, 12)

  const storyCandidates = stories
    .filter((story) => story.id !== (memoryRes.data?.last_story_slug ?? null))
    .map((story) => ({
      slug: story.id,
      title: story.title,
      excerpt: story.text.replace(/\s+/g, " ").trim().slice(0, 420),
    }))
    .sort(() => Math.random() - 0.5)
    .slice(0, 18)

  const productCandidates: HomepageProductCandidate[] = products
    .filter(availableProduct)
    .map((product) => ({
      id: product.id,
      type: product.type,
      name: product.name,
      description: product.description,
      images: product.images,
      price: product.price,
    }))

  const visitCountLast30Days =
    typeof visitCountRes.count === "number" ? visitCountRes.count : 0

  const daysSinceLastVisit = daysBetween(now, priorVisit)
  const daysSinceProjectActivity = daysBetween(now, lastProjectActivity)

  const engagementLevel =
    visitCountLast30Days >= 8 || founder
      ? "core"
      : visitCountLast30Days >= 3
        ? "returning"
        : visitCountLast30Days > 0
          ? "casual"
          : "new"

  return {
    identity: {
      firstName: input.firstName,
      memberSince: profileRes.data?.created_at ?? null,
    },
    visit: {
      hour: input.hour,
      source,
      campaign: input.utmCampaign,
      path: new URL(input.request.url).pathname,
      referrerHost,
      isMobile: input.isMobile,
      isInAppBrowser: input.isInAppBrowser,
      visitsLast30Days: visitCountLast30Days,
      lastVisitAt: priorVisit,
      daysSinceLastVisit,
    },
    relationship: {
      daysSinceProjectActivity,
      engagementLevel,
    },
    ownership: {
      book1,
      book2,
      merch,
      mecenas,
      founder,
    },
    network: {
      acceptedClaims: (claimsRes.data ?? []).filter((claim) => claim.status === "accepted").length,
      activeSpots: (spotsRes.data ?? []).filter((spot) => spot.status === "active").length,
    },
    orders: orderContexts,
    products: productCandidates,
    stories: storyCandidates,
    offers: [],
    previousHomepage: {
      hook: typeof memoryRes.data?.last_hook === "string" ? memoryRes.data.last_hook : null,
      productId: typeof memoryRes.data?.last_product_id === "string" ? memoryRes.data.last_product_id : null,
      storySlug: typeof memoryRes.data?.last_story_slug === "string" ? memoryRes.data.last_story_slug : null,
      sessionId: typeof memoryRes.data?.last_session_id === "string" ? memoryRes.data.last_session_id : null,
      generatedAt: typeof memoryRes.data?.last_generated_at === "string" ? memoryRes.data.last_generated_at : null,
    },
  }
}

export async function recordHomepageVisit(
  context: HomepageContext,
  userId: string,
  sessionId: string | null,
) {
  if (!sessionId) return

  const db = supabaseAdmin()

  const { error } = await db.from("homepage_visits").upsert(
    {
      user_id: userId,
      session_id: sessionId,
      path: context.visit.path,
      source: context.visit.source,
      campaign: context.visit.campaign,
      referrer_host: context.visit.referrerHost,
    },
    {
      onConflict: "user_id,session_id",
      ignoreDuplicates: true,
    },
  )

  if (error) {
    console.error("[homepage-ai] visit record failed", error)
  }
}

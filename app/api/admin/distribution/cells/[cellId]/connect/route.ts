import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getSiteUrl } from "@/lib/stripe"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ cellId: string }> },
) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if (!isAdminEmail(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 })

  const { cellId } = await context.params
  const db = supabaseAdmin()

  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .select("id, name, city, stripe_connected_account_id")
    .eq("id", cellId)
    .maybeSingle()

  if (cellError || !cell) return NextResponse.json({ error: "cell_not_found" }, { status: 404 })

  let accountId = cell.stripe_connected_account_id

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "HU",
        metadata: {
          distribution_cell_id: cell.id,
          distribution_cell_code: cell.name,
        },
      })
      accountId = account.id

      await db
        .from("distribution_cells")
        .update({ stripe_connected_account_id: accountId, stripe_payouts_enabled: Boolean(account.payouts_enabled), updated_at: new Date().toISOString() })
        .eq("id", cell.id)
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: getSiteUrl() + "/admin/distribution?stripe=refresh&cell=" + encodeURIComponent(cell.id),
      return_url: getSiteUrl() + "/admin/distribution?stripe=return&cell=" + encodeURIComponent(cell.id),
      type: "account_onboarding",
    })

    return NextResponse.json({ ok: true, url: link.url, account_id: accountId })
  } catch (error) {
    console.error("[admin/distribution/cells/connect] Stripe error", error)
    return NextResponse.json({ error: "stripe_connect_failed" }, { status: 502 })
  }
}

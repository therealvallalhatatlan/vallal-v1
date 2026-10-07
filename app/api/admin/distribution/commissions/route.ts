import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

async function requireAdmin(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return { ok: false as const, response: NextResponse.json({ error: "missing_token" }, { status: 401 }) }

  const user = await getUserFromToken(token)
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) }
  if (!isAdminEmail(user.email)) return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) }

  return { ok: true as const, user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const db = supabaseAdmin()
  const { data, error } = await db
    .from("distribution_commissions")
    .select("id, order_id, cell_id, amount_huf, status, stripe_transfer_id, approved_at, transferred_at, created_at, distribution_cells:cell_id(id, code, name, city, stripe_connected_account_id, stripe_payouts_enabled)")
    .in("status", ["pending", "approved", "blocked"])
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[admin/distribution/commissions] query error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, commissions: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 })

  let body: { commission_id?: unknown; action?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const commissionId = typeof body.commission_id === "string" ? body.commission_id.trim() : ""
  const action = body.action === "approve" ? "approve" : null
  if (!commissionId || !action) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const db = supabaseAdmin()

  const { data: commission, error: commissionError } = await db
    .from("distribution_commissions")
    .select("id, order_id, cell_id, amount_huf, status, stripe_transfer_id")
    .eq("id", commissionId)
    .maybeSingle<{
      id: string
      order_id: string
      cell_id: string
      amount_huf: number
      status: "pending" | "approved" | "transferred" | "reversed" | "blocked"
      stripe_transfer_id: string | null
    }>()

  if (commissionError) {
    console.error("[admin/distribution/commissions] commission lookup", commissionError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!commission) return NextResponse.json({ error: "commission_not_found" }, { status: 404 })
  if (commission.status === "transferred") {
    return NextResponse.json({ ok: true, status: "transferred", already_done: true })
  }
  if (commission.status !== "pending") {
    return NextResponse.json({ error: "commission_not_pending", status: commission.status }, { status: 409 })
  }
  if (!Number.isInteger(commission.amount_huf) || commission.amount_huf <= 0) {
    return NextResponse.json({ error: "commission_amount_not_configured" }, { status: 409 })
  }

  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .select("id, name, stripe_connected_account_id, stripe_payouts_enabled")
    .eq("id", commission.cell_id)
    .maybeSingle<{
      id: string
      name: string
      stripe_connected_account_id: string | null
      stripe_payouts_enabled: boolean
    }>()

  if (cellError) {
    console.error("[admin/distribution/commissions] cell lookup", cellError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!cell?.stripe_connected_account_id || !cell.stripe_payouts_enabled) {
    return NextResponse.json({ error: "cell_stripe_not_ready" }, { status: 409 })
  }

  // Claim the commission before creating the external transfer so two admins
  // cannot approve the same commission at the same time.
  const approvedAt = new Date().toISOString()
  const { data: claimed, error: claimError } = await db
    .from("distribution_commissions")
    .update({ status: "approved", approved_at: approvedAt, updated_at: approvedAt })
    .eq("id", commission.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (claimError) {
    console.error("[admin/distribution/commissions] claim error", claimError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!claimed) return NextResponse.json({ error: "commission_was_claimed" }, { status: 409 })

  try {
    // HUF charges can be represented with two decimal API units in Stripe.
    // The project already uses the same convention for Checkout amounts.
    const transfer = await stripe.transfers.create({
      amount: Math.round(commission.amount_huf * 100),
      currency: "huf",
      destination: cell.stripe_connected_account_id,
      description: "Vállalhatatlan terjesztői jutalék",
      metadata: {
        commission_id: commission.id,
        order_id: commission.order_id,
        cell_id: commission.cell_id,
      },
      transfer_group: "distribution_" + commission.order_id,
    }, {
      idempotencyKey: "distribution-commission-" + commission.id,
    })

    const transferredAt = new Date().toISOString()
    const { error: finalError } = await db
      .from("distribution_commissions")
      .update({
        status: "transferred",
        stripe_transfer_id: transfer.id,
        transferred_at: transferredAt,
        updated_at: transferredAt,
      })
      .eq("id", commission.id)
      .eq("status", "approved")

    if (finalError) {
      console.error("[admin/distribution/commissions] final update failed", finalError)
      return NextResponse.json({
        ok: true,
        warning: "transfer_created_but_ledger_update_failed",
        transfer_id: transfer.id,
      }, { status: 200 })
    }

    await db.from("order_fulfillment_events").insert({
      order_id: commission.order_id,
      event_type: "distribution_commission_transferred",
      actor_email: auth.user.email,
      payload: {
        commission_id: commission.id,
        cell_id: commission.cell_id,
        amount_huf: commission.amount_huf,
        stripe_transfer_id: transfer.id,
      },
    })

    return NextResponse.json({
      ok: true,
      status: "transferred",
      transfer_id: transfer.id,
      amount_huf: commission.amount_huf,
    })
  } catch (error) {
    console.error("[admin/distribution/commissions] Stripe transfer failed", error)
    await db
      .from("distribution_commissions")
      .update({
        status: "blocked",
        note: "Stripe transfer failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", commission.id)
      .eq("status", "approved")

    return NextResponse.json({ error: "stripe_transfer_failed" }, { status: 502 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

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
  const [{ data: orders, error: ordersError }, { data: drops, error: dropsError }] = await Promise.all([
    db.from("orders")
      .select("id, created_at, amount, customer_email, customer_name, distribution_fulfillment_method, distribution_product_name, distribution_drop_id")
      .eq("distribution_fulfillment_method", "dead_drop")
      .eq("status", "paid")
      .is("distribution_drop_id", null)
      .order("created_at", { ascending: true })
      .limit(100),
    db.from("distribution_drops")
      .select("id, cell_id, product_id, product_name, price_huf, city, district, location_hint, hidden_at, status")
      .eq("status", "active")
      .order("hidden_at", { ascending: true })
      .limit(100),
  ])

  if (ordersError || dropsError) {
    console.error("[admin/distribution/queue] query error", ordersError || dropsError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, orders: orders || [], drops: drops || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { order_id?: unknown; drop_id?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const orderId = typeof body.order_id === "string" ? body.order_id.trim() : ""
  const dropId = typeof body.drop_id === "string" ? body.drop_id.trim() : ""
  if (!orderId || !dropId) return NextResponse.json({ error: "missing_ids" }, { status: 400 })

  const db = supabaseAdmin()

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, user_id, status, distribution_fulfillment_method, distribution_drop_id, metadata")
    .eq("id", orderId)
    .maybeSingle()

  if (orderError || !order) return NextResponse.json({ error: "order_not_found" }, { status: 404 })
  if (order.status !== "paid" || order.distribution_fulfillment_method !== "dead_drop" || order.distribution_drop_id) {
    return NextResponse.json({ error: "order_not_assignable" }, { status: 409 })
  }
  if (!order.user_id) return NextResponse.json({ error: "order_has_no_user" }, { status: 409 })

  const { data: drop, error: dropError } = await db
    .from("distribution_drops")
    .select("id, cell_id, product_id, product_name, status")
    .eq("id", dropId)
    .maybeSingle()

  if (dropError || !drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })
  if (drop.status !== "active") return NextResponse.json({ error: "drop_unavailable" }, { status: 409 })

  const { data: claimedDrop, error: claimError } = await db
    .from("distribution_drops")
    .update({
      status: "purchased",
      order_id: order.id,
      buyer_user_id: order.user_id,
      reserved_by_user_id: null,
      reserved_until: null,
      reserved_fulfillment_method: "dead_drop",
      updated_at: new Date().toISOString(),
    })
    .eq("id", drop.id)
    .eq("status", "active")
    .is("order_id", null)
    .select("id")
    .maybeSingle()

  if (claimError) {
    console.error("[admin/distribution/queue] drop claim error", claimError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!claimedDrop) return NextResponse.json({ error: "drop_was_claimed" }, { status: 409 })

  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .select("commission_default_huf")
    .eq("id", drop.cell_id)
    .maybeSingle<{ commission_default_huf: number }>()

  if (cellError) {
    await db.from("distribution_drops").update({ status: "active", order_id: null, buyer_user_id: null, updated_at: new Date().toISOString() }).eq("id", drop.id).eq("status", "purchased").eq("order_id", order.id)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const commission = Math.max(0, Math.round(Number(cell?.commission_default_huf || 0)))

  const { data: updatedOrder, error: updateError } = await db
    .from("orders")
    .update({
      distribution_drop_id: drop.id,
      distribution_cell_id: drop.cell_id,
      distribution_commission_huf: commission,
      metadata: {
        ...(order.metadata && typeof order.metadata === "object" ? order.metadata : {}),
        distribution_waitlist_assigned_at: new Date().toISOString(),
      },
    })
    .eq("id", order.id)
    .eq("status", "paid")
    .is("distribution_drop_id", null)
    .select("id")
    .maybeSingle()

  if (updateError || !updatedOrder) {
    await db.from("distribution_drops")
      .update({ status: "active", order_id: null, buyer_user_id: null, updated_at: new Date().toISOString() })
      .eq("id", drop.id)
      .eq("status", "purchased")
      .eq("order_id", order.id)
    return NextResponse.json({ error: "order_assignment_failed" }, { status: 500 })
  }

  if (commission > 0) {
    await db.from("distribution_commissions").upsert({
      order_id: order.id,
      cell_id: drop.cell_id,
      amount_huf: commission,
      status: "pending",
    }, { onConflict: "order_id" })
  }

  return NextResponse.json({ ok: true, order_id: order.id, drop_id: drop.id, commission_huf: commission })
}

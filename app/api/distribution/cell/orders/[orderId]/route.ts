import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const TRANSITIONS: Record<string, string[]> = {
  paid: ["ready_to_dispatch", "fulfilled"],
  ready_to_dispatch: ["dispatched", "fulfilled"],
  dispatched: ["fulfilled"],
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  let body: { status?: unknown; note?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const toStatus = typeof body.status === "string" ? body.status : ""
  if (!["ready_to_dispatch", "dispatched", "fulfilled"].includes(toStatus)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 })
  }

  const { orderId } = await context.params
  const db = supabaseAdmin()

  const { data: membership } = await db
    .from("distribution_cell_members")
    .select("cell_id, role")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: "not_cell_member" }, { status: 403 })

  const { data: order, error: orderError } = await db
    .from("orders")
    .select("id, status, distribution_cell_id, distribution_fulfillment_method")
    .eq("id", orderId)
    .maybeSingle<{
      id: string
      status: string
      distribution_cell_id: string | null
      distribution_fulfillment_method: string | null
    }>()

  if (orderError) {
    console.error("[distribution/cell/orders] order lookup", orderError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!order || order.distribution_cell_id !== membership.cell_id) return NextResponse.json({ error: "order_not_found" }, { status: 404 })

  const allowed = TRANSITIONS[order.status] || []
  if (!allowed.includes(toStatus)) {
    return NextResponse.json({ error: "invalid_transition", from_status: order.status, to_status: toStatus }, { status: 409 })
  }

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = { status: toStatus }
  if (toStatus === "dispatched") payload.dispatch_sent_at = now
  if (toStatus === "fulfilled") {
    payload.fulfilled_at = now
    payload.fulfilled_by = user.email ?? user.id
  }

  const { data: updated, error: updateError } = await db
    .from("orders")
    .update(payload)
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id, status, fulfilled_at, dispatch_sent_at")
    .maybeSingle()

  if (updateError) {
    console.error("[distribution/cell/orders] update error", updateError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: "order_changed_retry" }, { status: 409 })

  await db.from("order_fulfillment_events").insert({
    order_id: order.id,
    event_type: "distribution_cell_status_updated",
    actor_email: user.email,
    payload: {
      cell_id: membership.cell_id,
      from_status: order.status,
      to_status: toStatus,
      note: typeof body.note === "string" ? body.note.slice(0, 500) : null,
      fulfillment_method: order.distribution_fulfillment_method,
    },
  })

  return NextResponse.json({ ok: true, order: updated })
}

import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const db = supabaseAdmin()
  const { data: memberships, error: membershipError } = await db
    .from("distribution_cell_members")
    .select("cell_id")
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("[distribution/cell/orders] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const cellIds = (memberships || []).map((row) => row.cell_id)
  if (!cellIds.length) return NextResponse.json({ ok: true, orders: [] })

  const { data, error } = await db
    .from("orders")
    .select("id, created_at, status, amount, currency, product_id, delivery_type, customer_email, customer_name, distribution_drop_id, distribution_cell_id, distribution_fulfillment_method, distribution_product_name, distribution_commission_huf, shipping_address, fulfilled_at, dispatch_sent_at, metadata")
    .in("distribution_cell_id", cellIds)
    .in("status", ["paid", "ready_to_dispatch", "dispatched"])
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) {
    console.error("[distribution/cell/orders] query error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, orders: data || [] })
}

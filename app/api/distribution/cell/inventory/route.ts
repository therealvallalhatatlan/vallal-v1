import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const PRODUCTS: Record<string, { name: string; price: number }> = {
  book_i: { name: "Vállalhatatlan I.", price: 10000 },
  book_ii: { name: "Vállalhatatlan II.", price: 10000 },
}

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const cellId = typeof body?.cell_id === "string" ? body.cell_id.trim() : ""
  const productId = typeof body?.product_id === "string" ? body.product_id.trim() : ""
  const quantity = Number(body?.quantity)

  if (!cellId || !PRODUCTS[productId] || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return NextResponse.json({ error: "invalid_inventory_fields" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: membership, error: membershipError } = await db
    .from("distribution_cell_members")
    .select("cell_id, role")
    .eq("cell_id", cellId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    console.error("[distribution/cell/inventory] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "cell_owner_required" }, { status: 403 })
  }

  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .select("id, status")
    .eq("id", cellId)
    .maybeSingle()

  if (cellError) {
    console.error("[distribution/cell/inventory] cell lookup error", cellError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!cell || cell.status !== "active") return NextResponse.json({ error: "cell_unavailable" }, { status: 409 })

  const { data: existing, error: inventoryError } = await db
    .from("distribution_cell_inventory")
    .select("id, quantity_total, quantity_available")
    .eq("cell_id", cellId)
    .eq("product_id", productId)
    .maybeSingle()

  if (inventoryError) {
    console.error("[distribution/cell/inventory] inventory lookup error", inventoryError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  let resultError: unknown = null
  if (existing) {
    const { data: updated, error } = await db
      .from("distribution_cell_inventory")
      .update({
        quantity_total: existing.quantity_total + quantity,
        quantity_available: existing.quantity_available + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("quantity_available", existing.quantity_available)
      .select("id")
      .maybeSingle()
    resultError = error
    if (!error && !updated) return NextResponse.json({ error: "inventory_changed_retry" }, { status: 409 })
  } else {
    const { error } = await db.from("distribution_cell_inventory").insert({
      cell_id: cellId,
      product_id: productId,
      product_name: PRODUCTS[productId].name,
      unit_price_huf: PRODUCTS[productId].price,
      quantity_total: quantity,
      quantity_available: quantity,
      updated_at: new Date().toISOString(),
    })
    resultError = error
  }

  if (resultError) {
    console.error("[distribution/cell/inventory] update error", resultError)
    return NextResponse.json({ error: "inventory_update_failed" }, { status: 500 })
  }

  const { error: eventError } = await db.from("distribution_inventory_events").insert({
    cell_id: cellId,
    product_id: productId,
    delta_quantity: quantity,
    event_type: "stock_received",
    created_by_user_id: user.id,
    note: "Physical stock received and added by cell owner",
  })
  if (eventError) console.error("[distribution/cell/inventory] audit event insert failed", eventError)

  return NextResponse.json({ ok: true, quantity_added: quantity }, { status: 201 })
}

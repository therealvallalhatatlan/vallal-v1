import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const ALLOWED_FULFILLMENT = new Set([
  "dead_drop",
  "personal",
  "hu_shipping",
  "eu_shipping",
  "global_shipping",
])

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  let body: {
    cell_id?: unknown
    product_id?: unknown
    price_huf?: unknown
    city?: unknown
    district?: unknown
    location_hint?: unknown
    lat?: unknown
    lng?: unknown
    fulfillment_options?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const cellId = typeof body.cell_id === "string" ? body.cell_id.trim() : ""
  const productId = typeof body.product_id === "string" ? body.product_id.trim() : ""
  const priceHuf = Number(body.price_huf)
  const district = typeof body.district === "string" && body.district.trim() ? body.district.trim() : null
  const locationHint = typeof body.location_hint === "string" ? body.location_hint.trim() : ""
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const fulfillmentOptions = Array.isArray(body.fulfillment_options)
    ? Array.from(new Set(body.fulfillment_options.filter((value): value is string =>
        typeof value === "string" && ALLOWED_FULFILLMENT.has(value),
      )))
    : []

  if (!cellId || !productId || !locationHint || !Number.isFinite(priceHuf) || priceHuf <= 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "missing_or_invalid_fields" }, { status: 400 })
  }

  if (!fulfillmentOptions.length || fulfillmentOptions.length !== (Array.isArray(body.fulfillment_options) ? body.fulfillment_options.length : 0)) {
    return NextResponse.json({ error: "invalid_fulfillment_options" }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: membership, error: membershipError } = await db
    .from("distribution_cell_members")
    .select("cell_id, role")
    .eq("cell_id", cellId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    console.error("[distribution/cell/drops] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!membership) return NextResponse.json({ error: "not_cell_member" }, { status: 403 })

  const [{ data: cell, error: cellError }, { data: inventory, error: inventoryError }] = await Promise.all([
    db.from("distribution_cells").select("id, city, status").eq("id", cellId).maybeSingle(),
    db.from("distribution_cell_inventory")
      .select("id, cell_id, product_id, product_name, unit_price_huf, quantity_total, quantity_available")
      .eq("cell_id", cellId)
      .eq("product_id", productId)
      .maybeSingle(),
  ])

  if (cellError || inventoryError) {
    console.error("[distribution/cell/drops] lookup error", cellError || inventoryError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!cell || cell.status !== "active") return NextResponse.json({ error: "cell_unavailable" }, { status: 409 })
  if (cell.city !== cityFromBody(body.city)) return NextResponse.json({ error: "cell_city_mismatch" }, { status: 409 })
  if (!inventory) return NextResponse.json({ error: "inventory_not_found" }, { status: 409 })
  if (inventory.quantity_available < 1) return NextResponse.json({ error: "inventory_empty" }, { status: 409 })

  // The inventory decrement is conditional, so concurrent cell requests cannot
  // both consume the same last book.
  const { data: decremented, error: decrementError } = await db
    .from("distribution_cell_inventory")
    .update({
      quantity_available: inventory.quantity_available - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inventory.id)
    .eq("quantity_available", inventory.quantity_available)
    .gte("quantity_available", 1)
    .select("id")
    .maybeSingle()

  if (decrementError) {
    console.error("[distribution/cell/drops] inventory decrement error", decrementError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!decremented) return NextResponse.json({ error: "inventory_changed_retry" }, { status: 409 })

  const { data: drop, error: dropError } = await db
    .from("distribution_drops")
    .insert({
      cell_id: cellId,
      product_id: inventory.product_id,
      product_name: inventory.product_name,
      price_huf: Math.round(priceHuf),
      city: cell.city,
      district,
      location_hint: locationHint,
      lat,
      lng,
      fulfillment_options: fulfillmentOptions,
      hidden_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (dropError || !drop?.id) {
    console.error("[distribution/cell/drops] drop insert error", dropError)
    await db
      .from("distribution_cell_inventory")
      .update({ quantity_available: inventory.quantity_available, updated_at: new Date().toISOString() })
      .eq("id", inventory.id)
    return NextResponse.json({ error: "drop_create_failed" }, { status: 500 })
  }

  await db.from("distribution_inventory_events").insert({
    cell_id: cellId,
    product_id: inventory.product_id,
    delta_quantity: -1,
    event_type: "drop_allocated",
    reference_id: drop.id,
    created_by_user_id: user.id,
    note: "Book allocated to distribution drop",
  })

  return NextResponse.json({ ok: true, drop_id: drop.id })
}

function cityFromBody(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

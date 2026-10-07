import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

type CreateBody = {
  cell_id?: unknown
  product_id?: unknown
  product_name?: unknown
  price_huf?: unknown
  city?: unknown
  district?: unknown
  location_hint?: unknown
  lat?: unknown
  lng?: unknown
  fulfillment_options?: unknown
}

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const cellId = typeof body.cell_id === "string" ? body.cell_id.trim() : ""
  const productId = typeof body.product_id === "string" ? body.product_id.trim() : ""
  const productName = typeof body.product_name === "string" ? body.product_name.trim() : ""
  const priceHuf = Number(body.price_huf)
  const city = typeof body.city === "string" ? body.city.trim() : ""
  const district = typeof body.district === "string" ? body.district.trim() : null
  const locationHint = typeof body.location_hint === "string" ? body.location_hint.trim() : ""
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const fulfillmentOptions = Array.isArray(body.fulfillment_options)
    ? body.fulfillment_options.filter((value): value is string => typeof value === "string")
    : []

  if (!cellId || !productId || !productName || !city || !locationHint) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 })
  }
  if (!Number.isFinite(priceHuf) || priceHuf <= 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "invalid_values" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: membership, error: membershipError } = await db
    .from("distribution_cell_members")
    .select("cell_id")
    .eq("cell_id", cellId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membershipError) {
    console.error("[distribution/cell/drops] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!membership) return NextResponse.json({ error: "not_cell_member" }, { status: 403 })

  const { data: dropId, error } = await db.rpc("create_distribution_drop_from_inventory", {
    p_cell_id: cellId,
    p_user_id: user.id,
    p_product_id: productId,
    p_product_name: productName,
    p_price_huf: Math.round(priceHuf),
    p_city: city,
    p_district: district,
    p_location_hint: locationHint,
    p_lat: lat,
    p_lng: lng,
    p_fulfillment_options: fulfillmentOptions,
  })

  if (error || !dropId) {
    console.error("[distribution/cell/drops] create error", error)
    const message = String(error?.message || "")
    if (message.includes("inventory_empty")) return NextResponse.json({ error: "inventory_empty" }, { status: 409 })
    if (message.includes("cell_city_mismatch")) return NextResponse.json({ error: "cell_city_mismatch" }, { status: 409 })
    if (message.includes("invalid_fulfillment_options")) return NextResponse.json({ error: "invalid_fulfillment_options" }, { status: 400 })
    return NextResponse.json({ error: "drop_create_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, drop_id: dropId }, { status: 201 })
}

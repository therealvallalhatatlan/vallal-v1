import { NextRequest, NextResponse } from "next/server"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { id } = await context.params
  const db = supabaseAdmin()

  const { data: drop, error } = await db
    .from("distribution_drops")
    .select("id, product_name, city, district, location_hint, lat, lng, fulfillment_options, reserved_fulfillment_method, status, buyer_user_id, found_at")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("[distribution/drops/access] lookup error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_not_found" }, { status: 404 })

  if (drop.buyer_user_id !== user.id || !["purchased", "collected"].includes(drop.status)) {
    return NextResponse.json({ error: "not_authorized" }, { status: 403 })
  }

  return NextResponse.json({
    ok: true,
    drop: {
      id: drop.id,
      product_name: drop.product_name,
      city: drop.city,
      district: drop.district,
      location_hint: drop.location_hint,
      lat: drop.lat,
      lng: drop.lng,
      fulfillment_method: drop.reserved_fulfillment_method,
      status: drop.status,
      found_at: drop.found_at,
    },
  })
}

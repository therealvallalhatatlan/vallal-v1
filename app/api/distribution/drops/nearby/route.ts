import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getDistanceMeters } from "@/lib/matrica"

export const dynamic = "force-dynamic"

const SAFE_FIELDS = [
  "id","product_id","product_name","price_huf","city","district",
  "location_hint","fulfillment_options","status","hidden_at","lat","lng",
].join(", ")

function maskCoordinate(value: number) {
  return Number(value.toFixed(2))
}

function distanceBand(distanceMeters: number | null) {
  if (distanceMeters === null) return null
  if (distanceMeters < 500) return "500 M-EN BELÜL"
  if (distanceMeters < 1000) return "0,5-1 KM"
  if (distanceMeters < 2000) return "1-2 KM"
  if (distanceMeters < 5000) return "2-5 KM"
  return "5 KM+"
}

function parseCoordinate(value: string | null) {
  if (value === null || value.trim() === "") return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const lat = typeof body?.lat === "number"
      ? body.lat
      : parseCoordinate(request.nextUrl.searchParams.get("lat"))
    const lng = typeof body?.lng === "number"
      ? body.lng
      : parseCoordinate(request.nextUrl.searchParams.get("lng"))
    const city = typeof body?.city === "string"
      ? body.city.trim()
      : request.nextUrl.searchParams.get("city")?.trim() || null

    if (lat !== null && (lat < -90 || lat > 90)) {
      return NextResponse.json({ ok: false, error: "invalid_lat" }, { status: 400 })
    }
    if (lng !== null && (lng < -180 || lng > 180)) {
      return NextResponse.json({ ok: false, error: "invalid_lng" }, { status: 400 })
    }

    const db = supabaseAdmin()
    const now = new Date().toISOString()

    await db
      .from("distribution_drops")
      .update({
        status: "active",
        reserved_by_user_id: null,
        reserved_until: null,
        reserved_fulfillment_method: null,
        updated_at: now,
      })
      .eq("status", "reserved")
      .lt("reserved_until", now)

    let query = db
      .from("distribution_drops")
      .select(SAFE_FIELDS)
      .eq("status", "active")

    if (city && city !== "ALL") query = query.eq("city", city)

    const { data, error } = await query
    if (error) {
      console.error("[distribution/drops/nearby] query error", error)
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
    }

    const mapped = (data || []).map((drop) => {
      const dropLat = Number(drop.lat)
      const dropLng = Number(drop.lng)
      const distance =
        lat !== null && lng !== null && Number.isFinite(dropLat) && Number.isFinite(dropLng)
          ? getDistanceMeters(lat, lng, dropLat, dropLng)
          : null

      return {
        id: drop.id,
        product_id: drop.product_id,
        product_name: drop.product_name,
        price_huf: drop.price_huf,
        city: drop.city,
        district: drop.district,
        location_hint: drop.location_hint,
        fulfillment_options: drop.fulfillment_options,
        hidden_at: drop.hidden_at,
        map_lat: maskCoordinate(dropLat),
        map_lng: maskCoordinate(dropLng),
        distance_band: distanceBand(distance),
        _distance_sort: distance,
      }
    })

    mapped.sort((a, b) => {
      const da = a._distance_sort
      const db = b._distance_sort
      if (da !== null && db !== null) return da - db
      if (da !== null) return -1
      if (db !== null) return 1
      return new Date(a.hidden_at).getTime() - new Date(b.hidden_at).getTime()
    })

    const publicDrops = mapped.map(({ _distance_sort, ...drop }) => drop)

    const { data: cityRows } = await db
      .from("distribution_drops")
      .select("city")
      .eq("status", "active")

    const cities = Array.from(new Set(
      (cityRows || [])
        .map((row) => String(row.city || "").trim())
        .filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, "hu"))

    return NextResponse.json({
      ok: true,
      drops: publicDrops,
      cities,
      located: lat !== null && lng !== null,
    })
  } catch (error) {
    console.error("[distribution/drops/nearby] server error", error)
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}

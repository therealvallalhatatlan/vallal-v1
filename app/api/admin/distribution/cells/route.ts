import { randomUUID } from "node:crypto"
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
  const { data: cells, error } = await db
    .from("distribution_cells")
    .select("id, code, name, city, country_code, status, commission_default_huf, stripe_connected_account_id, stripe_payouts_enabled, pickup_enabled, pickup_public_name, pickup_area, pickup_description, pickup_sort_order, created_at, updated_at")
    .order("city", { ascending: true })
    .order("name", { ascending: true })

  if (error) {
    console.error("[admin/distribution/cells] list error", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cells: cells || [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  let body: { name?: unknown; pickup_area?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const pickupArea = typeof body.pickup_area === "string" ? body.pickup_area.trim() : ""

  if (!name || name.length > 100 || !pickupArea || pickupArea.length > 120) {
    return NextResponse.json({ error: "name_and_pickup_area_required" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: lastPoint, error: sortError } = await db
    .from("distribution_cells")
    .select("pickup_sort_order")
    .eq("pickup_enabled", true)
    .order("pickup_sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ pickup_sort_order: number }>()

  if (sortError) {
    console.error("[admin/distribution/cells] pickup sort lookup failed", sortError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  const code = "PICKUP-" + randomUUID().slice(0, 8).toUpperCase()
  const pickupSortOrder = (lastPoint?.pickup_sort_order ?? 0) + 10
  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .insert({
      code,
      name,
      city: "Budapest",
      country_code: "HU",
      commission_default_huf: 0,
      pickup_enabled: true,
      pickup_public_name: name,
      pickup_area: pickupArea,
      pickup_sort_order: pickupSortOrder,
    })
    .select("id, code, name, city, status, pickup_enabled, pickup_public_name, pickup_area, pickup_description, pickup_sort_order")
    .single()

  if (cellError || !cell) {
    console.error("[admin/distribution/cells] pickup point create error", cellError)
    return NextResponse.json({ error: "pickup_point_create_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cell }, { status: 201 })
}

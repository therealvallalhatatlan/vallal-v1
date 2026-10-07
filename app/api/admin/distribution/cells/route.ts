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
    .select("id, code, name, city, country_code, status, commission_default_huf, stripe_connected_account_id, stripe_payouts_enabled, created_at, updated_at")
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

  let body: {
    code?: unknown
    name?: unknown
    city?: unknown
    owner_email?: unknown
    commission_default_huf?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""
  const city = typeof body.city === "string" ? body.city.trim() : ""
  const ownerEmail = typeof body.owner_email === "string" ? body.owner_email.trim().toLowerCase() : ""
  const commission = Math.max(0, Math.round(Number(body.commission_default_huf)))

  if (!code || !name || !city || !ownerEmail || !Number.isFinite(commission)) {
    return NextResponse.json({ error: "missing_or_invalid_fields" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: authUsers, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (usersError) {
    console.error("[admin/distribution/cells] user lookup error", usersError)
    return NextResponse.json({ error: "user_lookup_failed" }, { status: 500 })
  }

  const owner = authUsers.users.find((candidate) => candidate.email?.trim().toLowerCase() === ownerEmail)
  if (!owner?.id) return NextResponse.json({ error: "owner_not_found" }, { status: 404 })

  const { data: existing, error: existingError } = await db
    .from("distribution_cells")
    .select("id")
    .eq("code", code)
    .maybeSingle()

  if (existingError) {
    console.error("[admin/distribution/cells] existing check", existingError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
  if (existing) return NextResponse.json({ error: "cell_code_taken" }, { status: 409 })

  const { data: cell, error: cellError } = await db
    .from("distribution_cells")
    .insert({
      code,
      name,
      city,
      country_code: "HU",
      commission_default_huf: commission,
    })
    .select("id, code, name, city, status, commission_default_huf")
    .single()

  if (cellError || !cell) {
    console.error("[admin/distribution/cells] cell create error", cellError)
    return NextResponse.json({ error: "cell_create_failed" }, { status: 500 })
  }

  const membershipResult = await db
    .from("distribution_cell_members")
    .insert({
      cell_id: cell.id,
      user_id: owner.id,
      role: "owner",
    })

  if (membershipResult.error) {
    await db.from("distribution_cells").delete().eq("id", cell.id)
    console.error("[admin/distribution/cells] membership create error", membershipResult.error)
    return NextResponse.json({ error: "membership_create_failed" }, { status: 500 })
  }

  const starterItems = [
    { product_id: "book_ii", product_name: "Vállalhatatlan II.", unit_price_huf: 15000, quantity: 3 },
    { product_id: "men-shirt-1", product_name: "Vállalhatatlan Póló", unit_price_huf: 10000, quantity: 3 },
  ]

  const { error: inventoryError } = await db
    .from("distribution_cell_inventory")
    .insert(starterItems.map((item) => ({
      cell_id: cell.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price_huf: item.unit_price_huf,
      quantity_total: item.quantity,
      quantity_available: item.quantity,
    })))

  if (inventoryError) {
    await db.from("distribution_cell_members").delete().eq("cell_id", cell.id)
    await db.from("distribution_cells").delete().eq("id", cell.id)
    console.error("[admin/distribution/cells] starter inventory error", inventoryError)
    return NextResponse.json({ error: "starter_inventory_failed" }, { status: 500 })
  }

  await db.from("distribution_inventory_events").insert(
    starterItems.map((item) => ({
      cell_id: cell.id,
      product_id: item.product_id,
      delta_quantity: item.quantity,
      event_type: "starter_allocation",
      created_by_user_id: auth.user.id,
      note: "Starter allocation: free initial distribution stock",
    })),
  )

  return NextResponse.json({
    ok: true,
    cell,
    starter_inventory: starterItems,
    owner_user_id: owner.id,
  }, { status: 201 })
}

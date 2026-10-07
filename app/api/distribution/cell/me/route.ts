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
    .select("cell_id, role")
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("[distribution/cell/me] membership error", membershipError)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  if (!memberships?.length) return NextResponse.json({ ok: true, cells: [] })

  const cellIds = memberships.map((item) => item.cell_id)
  const [{ data: cells }, { data: inventory }, { data: drops }] = await Promise.all([
    db.from("distribution_cells")
      .select("id, code, name, city, country_code, status, commission_default_huf, stripe_connected_account_id, stripe_payouts_enabled")
      .in("id", cellIds),
    db.from("distribution_cell_inventory")
      .select("id, cell_id, product_id, product_name, unit_price_huf, quantity_total, quantity_available, updated_at")
      .in("cell_id", cellIds)
      .order("product_name"),
    db.from("distribution_drops")
      .select("id, cell_id, product_name, price_huf, city, district, location_hint, fulfillment_options, status, hidden_at, found_at")
      .in("cell_id", cellIds)
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  return NextResponse.json({
    ok: true,
    cells: (cells || []).map((cell) => ({
      ...cell,
      role: memberships.find((item) => item.cell_id === cell.id)?.role || "member",
      inventory: (inventory || []).filter((item) => item.cell_id === cell.id),
      drops: (drops || []).filter((item) => item.cell_id === cell.id),
    })),
  })
}

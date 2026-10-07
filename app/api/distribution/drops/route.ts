import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export const dynamic = "force-dynamic"

const SAFE_FIELDS = [
  "id",
  "product_id",
  "product_name",
  "price_huf",
  "city",
  "district",
  "location_hint",
  "fulfillment_options",
  "status",
  "hidden_at",
].join(", ")

export async function GET(request: NextRequest) {
  try {
    const city = request.nextUrl.searchParams.get("city")?.trim() || null
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
      .order("hidden_at", { ascending: true })

    if (city && city !== "ALL") query = query.eq("city", city)

    const { data, error } = await query
    if (error) {
      console.error("[distribution/drops] query error", error)
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 })
    }

    const { data: cityRows } = await db
      .from("distribution_drops")
      .select("city")
      .eq("status", "active")

    const cities = Array.from(new Set(
      (cityRows || []).map((row) => String(row.city || "").trim()).filter(Boolean),
    )).sort((a, b) => a.localeCompare(b, "hu"))

    return NextResponse.json({ ok: true, drops: data || [], cities })
  } catch (error) {
    console.error("[distribution/drops] server error", error)
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 })
  }
}

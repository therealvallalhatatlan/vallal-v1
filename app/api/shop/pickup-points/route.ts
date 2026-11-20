import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin()
      .from("distribution_cells")
      .select("id, name, city, country_code, pickup_public_name, pickup_area, pickup_description, pickup_sort_order")
      .eq("status", "active")
      .eq("pickup_enabled", true)
      .order("pickup_sort_order", { ascending: true })
      .order("city", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[shop/pickup-points] lookup failed", error);
      return NextResponse.json({ error: "pickup_points_unavailable" }, { status: 500 });
    }

    const pickupPoints = (data ?? []).map((row) => ({
      id: row.id,
      name: row.pickup_public_name?.trim() || row.name,
      city: row.city,
      countryCode: row.country_code,
      area: row.pickup_area,
      description: row.pickup_description,
    }));

    return NextResponse.json({ ok: true, pickupPoints });
  } catch (error) {
    console.error("[shop/pickup-points] unexpected failure", error);
    return NextResponse.json({ error: "pickup_points_unavailable" }, { status: 500 });
  }
}

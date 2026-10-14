import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin()
    .from("book_registry_copies")
    .select("public_id,serial_number,location_lat,location_lng,edition:book_editions!inner(code,title,serial_prefix)")
    .eq("status", "registered")
    .eq("map_visible", true)
    .not("location_lat", "is", null)
    .not("location_lng", "is", null);

  if (error) {
    console.error("[book-registry/map] public map query failed", error.message);
    return NextResponse.json({ error: "map_unavailable" }, { status: 500 });
  }

  const copies = (data ?? []).flatMap((row: any) => {
    const edition = Array.isArray(row.edition) ? row.edition[0] : row.edition;
    if (!edition || row.location_lat === null || row.location_lng === null) return [];
    const prefix = String(edition.serial_prefix || "");
    return [{
      id: row.public_id,
      editionCode: edition.code,
      editionTitle: edition.title,
      serialLabel: prefix + "-" + String(row.serial_number).padStart(3, "0"),
      lat: Number(row.location_lat),
      lng: Number(row.location_lng),
    }];
  });

  return NextResponse.json({ copies }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

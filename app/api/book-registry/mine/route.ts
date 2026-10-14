import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const bearer = parseBearerToken(request.headers);
  if (!bearer) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let user;
  try {
    user = await getUserFromToken(bearer);
  } catch {
    return NextResponse.json({ error: "authentication_failed" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("book_registry_copies")
    .select("id,public_id,serial_number,printed_copy_number,status,map_visible,location_lat,location_lng,registered_at,edition:book_editions!inner(code,title,serial_prefix)")
    .eq("owner_user_id", user.id)
    .order("registered_at", { ascending: false });

  if (error) {
    console.error("[book-registry/mine] database query failed", error.message);
    return NextResponse.json({ error: "copies_unavailable" }, { status: 500 });
  }

  const copies = (data ?? []).map((row: any) => {
    const edition = Array.isArray(row.edition) ? row.edition[0] : row.edition;
    const prefix = typeof edition?.serial_prefix === "string" ? edition.serial_prefix : "";
    return {
      id: row.id,
      publicId: row.public_id,
      editionCode: edition?.code ?? "",
      editionTitle: edition?.title ?? "Vállalhatatlan",
      serialLabel: prefix ? prefix + "-" + String(row.serial_number).padStart(3, "0") : String(row.serial_number),
      serialNumber: row.serial_number,
      printedCopyNumber: row.printed_copy_number,
      status: row.status,
      mapVisible: row.map_visible,
      locationLat: row.location_lat === null ? null : Number(row.location_lat),
      locationLng: row.location_lng === null ? null : Number(row.location_lng),
      registeredAt: row.registered_at,
    };
  });

  return NextResponse.json({ ok: true, copies }, { headers: { "Cache-Control": "no-store" } });
}

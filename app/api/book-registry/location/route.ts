import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidRegistryUuid } from "@/lib/bookRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const bearer = parseBearerToken(request.headers);
  if (!bearer) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let user;
  try {
    user = await getUserFromToken(bearer);
  } catch {
    return NextResponse.json({ error: "authentication_failed" }, { status: 401 });
  }
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const publicId = body?.publicId;
  const mapVisible = body?.mapVisible;
  const lat = body?.lat;
  const lng = body?.lng;

  if (!isValidRegistryUuid(publicId) || typeof mapVisible !== "boolean") {
    return NextResponse.json({ error: "invalid_location_request" }, { status: 400 });
  }
  if (mapVisible && (
    typeof lat !== "number" || typeof lng !== "number"
    || !Number.isFinite(lat) || !Number.isFinite(lng)
    || lat < -90 || lat > 90 || lng < -180 || lng > 180
  )) {
    return NextResponse.json({ error: "valid_coordinates_required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc("set_book_registry_location", {
    p_public_id: publicId,
    p_user_id: user.id,
    p_map_visible: mapVisible,
    p_lat: mapVisible ? lat : null,
    p_lng: mapVisible ? lng : null,
  });

  if (error) {
    const message = String(error.message || "");
    if (/copy_not_found_or_not_owner/i.test(message)) {
      return NextResponse.json({ error: "copy_not_found_or_not_owner" }, { status: 404 });
    }
    console.error("[book-registry/location] RPC failed", message);
    return NextResponse.json({ error: "location_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, location: data }, { headers: { "Cache-Control": "no-store" } });
}

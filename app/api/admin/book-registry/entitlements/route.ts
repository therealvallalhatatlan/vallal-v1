import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createBookRegistryToken, hashBookRegistryToken } from "@/lib/bookRegistryTokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const bearer = parseBearerToken(request.headers);
  if (!bearer) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  let user;
  try {
    user = await getUserFromToken(bearer);
  } catch {
    return NextResponse.json({ error: "authentication_failed" }, { status: 401 });
  }
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "admin_required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const editionCode = typeof body?.editionCode === "string" ? body.editionCode.trim() : "";
  const sourceType = body?.sourceType;
  const historicalSerial = body?.historicalSerial;
  const sourceReference = typeof body?.sourceReference === "string" ? body.sourceReference.trim().slice(0, 160) : null;
  const expiresInDays = body?.expiresInDays;

  if (!["book_1", "book_2"].includes(editionCode)
      || !["historical", "purchase", "distributor", "admin"].includes(sourceType)) {
    return NextResponse.json({ error: "invalid_entitlement_request" }, { status: 400 });
  }
  if (sourceType === "historical" && (!Number.isSafeInteger(historicalSerial) || historicalSerial < 1
      || historicalSerial > (editionCode === "book_1" ? 100 : 80))) {
    return NextResponse.json({ error: "valid_historical_serial_required" }, { status: 400 });
  }
  if (sourceType !== "historical" && historicalSerial !== undefined && historicalSerial !== null) {
    return NextResponse.json({ error: "historical_serial_not_allowed" }, { status: 400 });
  }
  if (expiresInDays !== undefined && (!Number.isSafeInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90)) {
    return NextResponse.json({ error: "expires_in_days_must_be_1_to_90" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: edition, error: editionError } = await db
    .from("book_editions").select("id,code,title").eq("code", editionCode).single();
  if (editionError || !edition) {
    console.error("[admin/book-registry/entitlements] edition lookup failed", editionError?.message);
    return NextResponse.json({ error: "edition_unavailable" }, { status: 500 });
  }

  if (sourceType === "historical") {
    const { data: slot, error: slotError } = await db
      .from("book_registry_copies")
      .select("id,status,owner_user_id")
      .eq("edition_id", edition.id)
      .eq("serial_number", historicalSerial)
      .single();
    if (slotError || !slot || slot.status !== "awaiting_claim" || slot.owner_user_id) {
      return NextResponse.json({ error: "historical_slot_unavailable" }, { status: 409 });
    }

    const { data: existing, error: existingError } = await db
      .from("book_registry_entitlements")
      .select("id,status")
      .eq("edition_id", edition.id)
      .eq("assigned_serial", historicalSerial)
      .neq("status", "revoked")
      .limit(1);
    if (existingError) {
      console.error("[admin/book-registry/entitlements] existing token lookup failed", existingError.message);
      return NextResponse.json({ error: "entitlement_lookup_failed" }, { status: 500 });
    }
    if (existing?.length) {
      return NextResponse.json({ error: "historical_entitlement_already_issued" }, { status: 409 });
    }
  }

  const token = createBookRegistryToken();
  const expiresAt = Number.isSafeInteger(expiresInDays)
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const { data: entitlement, error } = await db
    .from("book_registry_entitlements")
    .insert({
      edition_id: edition.id,
      token_hash: hashBookRegistryToken(token),
      source_type: sourceType,
      assigned_serial: sourceType === "historical" ? historicalSerial : null,
      source_reference: sourceReference,
      expires_at: expiresAt,
      created_by: user.id,
      status: "pending",
    })
    .select("id,source_type,assigned_serial,expires_at,created_at")
    .single();

  if (error || !entitlement) {
    console.error("[admin/book-registry/entitlements] insert failed", error?.message);
    return NextResponse.json({ error: "entitlement_create_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    edition: { code: edition.code, title: edition.title },
    entitlement,
    token,
    claimUrl: new URL("/konyv-1-qr?claim=" + encodeURIComponent(token), process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).toString(),
    note: "A token csak most látható. Biztonságos csatornán add át a jogosult tulajdonosnak.",
  }, { headers: { "Cache-Control": "no-store" } });
}

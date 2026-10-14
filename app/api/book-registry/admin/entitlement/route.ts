import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, isAdminEmail, parseBearerToken } from "@/lib/auth";
import { createBookRegistryToken, hashBookRegistryToken } from "@/lib/bookRegistryTokens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceType = "historical" | "purchase" | "distributor" | "admin";

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
  const sourceType = body?.sourceType as SourceType;
  const allowedSources: SourceType[] = ["historical", "purchase", "distributor", "admin"];
  const serial = body?.serialNumber;
  const sourceReference = typeof body?.sourceReference === "string" ? body.sourceReference.trim() : null;

  if (!/^book_[a-z0-9_]+$/.test(editionCode) || !allowedSources.includes(sourceType)) {
    return NextResponse.json({ error: "invalid_edition_or_source" }, { status: 400 });
  }
  if (sourceType === "historical" && (!Number.isSafeInteger(serial) || serial < 1)) {
    return NextResponse.json({ error: "historical_serial_required" }, { status: 400 });
  }
  if (sourceType !== "historical" && serial !== undefined && serial !== null) {
    return NextResponse.json({ error: "serial_only_for_historical_claims" }, { status: 400 });
  }
  if (sourceReference && sourceReference.length > 180) {
    return NextResponse.json({ error: "source_reference_too_long" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: edition, error: editionError } = await db
    .from("book_editions")
    .select("id,code,title")
    .eq("code", editionCode)
    .single();

  if (editionError || !edition) {
    return NextResponse.json({ error: "edition_not_found" }, { status: 404 });
  }

  if (sourceType === "historical") {
    const { data: slot, error: slotError } = await db
      .from("book_registry_copies")
      .select("id,status,owner_user_id")
      .eq("edition_id", edition.id)
      .eq("serial_number", serial)
      .single();

    if (slotError || !slot || slot.status !== "awaiting_claim" || slot.owner_user_id) {
      return NextResponse.json({ error: "historical_slot_unavailable" }, { status: 409 });
    }
  }

  let expiresAt: string | null = null;
  if (body?.expiresAt !== null && body?.expiresAt !== undefined) {
    if (typeof body.expiresAt !== "string" || !Number.isFinite(Date.parse(body.expiresAt))) {
      return NextResponse.json({ error: "invalid_expiry" }, { status: 400 });
    }
    expiresAt = new Date(body.expiresAt).toISOString();
    if (new Date(expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "invalid_expiry" }, { status: 400 });
    }
  }

  const rawToken = createBookRegistryToken();
  const { data: entitlement, error } = await db
    .from("book_registry_entitlements")
    .insert({
      edition_id: edition.id,
      token_hash: hashBookRegistryToken(rawToken),
      source_type: sourceType,
      assigned_serial: sourceType === "historical" ? serial : null,
      source_reference: sourceReference,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("id,edition_id,source_type,assigned_serial,expires_at,created_at")
    .single();

  if (error || !entitlement) {
    console.error("[book-registry/admin/entitlement] issuance failed", error?.message);
    return NextResponse.json({ error: "entitlement_issue_failed" }, { status: 409 });
  }

  // Plaintext token is returned exactly once. Keep it private and send it to
  // the intended owner through a trusted channel.
  return NextResponse.json({
    ok: true,
    entitlement: {
      id: entitlement.id,
      editionCode: edition.code,
      editionTitle: edition.title,
      sourceType: entitlement.source_type,
      reservedSerial: entitlement.assigned_serial,
      expiresAt: entitlement.expires_at,
    },
    token: rawToken,
    claimUrl: request.nextUrl.origin + "/konyv-1-qr#claim=" + encodeURIComponent(rawToken),
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidRegistryUuid } from "@/lib/bookRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function generateToken() {
  return randomBytes(32).toString("base64url");
}
function hashToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function requireUser(request: NextRequest) {
  const bearer = parseBearerToken(request.headers);
  if (!bearer) return null;
  try {
    return await getUserFromToken(bearer);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isValidRegistryUuid(body?.publicId)) {
    return NextResponse.json({ error: "valid_public_id_required" }, { status: 400 });
  }

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin().rpc("create_book_registry_transfer", {
    p_public_id: body.publicId,
    p_user_id: user.id,
    p_token_hash: hashToken(rawToken),
    p_expires_at: expiresAt,
  });

  if (error) {
    const message = String(error.message || "");
    if (/copy_not_found_or_not_owner/i.test(message)) {
      return NextResponse.json({ error: "copy_not_found_or_not_owner" }, { status: 404 });
    }
    console.error("[book-registry/transfer] create RPC failed", message);
    return NextResponse.json({ error: "transfer_create_failed" }, { status: 500 });
  }

  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  // Hash fragments are not sent to the server or in HTTP Referer headers.
  return NextResponse.json({
    ok: true,
    expiresAt,
    transferUrl: new URL("/konyv-1-qr#transfer=" + encodeURIComponent(rawToken), siteOrigin).toString(),
    transfer: data,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ error: "valid_transfer_token_required" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const { data, error } = await supabaseAdmin().rpc("accept_book_registry_transfer", {
    p_token_hash: tokenHash,
    p_target_user_id: user.id,
  });

  if (error) {
    const message = String(error.message || "");
    if (/transfer_expired/i.test(message)) return NextResponse.json({ error: "transfer_expired" }, { status: 410 });
    if (/already_used|transfer_invalid|transfer_owner_changed|target_must_be_different/i.test(message)) {
      return NextResponse.json({ error: "transfer_invalid_or_used" }, { status: 409 });
    }
    console.error("[book-registry/transfer] accept RPC failed", message);
    return NextResponse.json({ error: "transfer_accept_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, copy: data }, { headers: { "Cache-Control": "no-store" } });
}

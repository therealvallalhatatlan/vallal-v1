import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { isValidRegistryToken } from "@/lib/bookRegistry";
import { hashBookRegistryToken } from "@/lib/bookRegistryTokens";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  if (!user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!isValidRegistryToken(token)) {
    return NextResponse.json({ error: "valid_transfer_token_required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin().rpc("accept_book_registry_transfer", {
    p_token_hash: hashBookRegistryToken(token),
    p_target_user_id: user.id,
  });

  if (error) {
    const message = String(error.message || "");
    if (/transfer_invalid|transfer_expired|already_used|target_must_be_different|owner_changed/i.test(message)) {
      return NextResponse.json({ error: "transfer_invalid_or_expired" }, { status: 409 });
    }
    console.error("[book-registry/transfer/accept] acceptance failed", message);
    return NextResponse.json({ error: "transfer_accept_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, copy: data }, { headers: { "Cache-Control": "no-store" } });
}

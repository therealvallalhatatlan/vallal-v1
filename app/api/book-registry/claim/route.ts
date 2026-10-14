import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidRegistryToken } from "@/lib/bookRegistry";
import { hashBookRegistryToken } from "@/lib/bookRegistryTokens";

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
    return NextResponse.json({ error: "valid_claim_token_required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin().rpc("claim_book_registry_entitlement", {
      p_token_hash: hashBookRegistryToken(token),
      p_user_id: user.id,
    });

    if (error) {
      const message = String(error.message || "");
      if (/entitlement_invalid|entitlement_expired|already_used|historical_slot_unavailable/i.test(message)) {
        return NextResponse.json({ error: "claim_token_invalid_or_used" }, { status: 409 });
      }
      console.error("[book-registry/claim] claim RPC failed", message);
      return NextResponse.json({ error: "claim_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, copy: data });
  } catch (error) {
    console.error("[book-registry/claim] unexpected failure", error);
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }
}

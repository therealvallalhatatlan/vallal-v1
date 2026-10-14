import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EditionCode = "book_1" | "book_2";

function parseEditionCode(value: unknown): EditionCode | null {
  return value === "book_1" || value === "book_2" ? value : null;
}

async function authenticatedUser(request: NextRequest) {
  const bearer = parseBearerToken(request.headers);
  if (!bearer) return { user: null, response: NextResponse.json({ error: "authentication_required" }, { status: 401 }) };

  try {
    const user = await getUserFromToken(bearer);
    if (!user) return { user: null, response: NextResponse.json({ error: "authentication_required" }, { status: 401 }) };
    return { user, response: null };
  } catch {
    return { user: null, response: NextResponse.json({ error: "authentication_failed" }, { status: 401 }) };
  }
}

async function getVerifiedEmail(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(userId);
  if (error || !data.user?.email_confirmed_at || !data.user.email) return null;
  return data.user.email;
}

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser(request);
  if (auth.response) return auth.response;

  const editionCode = parseEditionCode(request.nextUrl.searchParams.get("edition") || "book_1");
  if (!editionCode) return NextResponse.json({ error: "invalid_edition" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin().rpc("preview_book_registry_registration", {
      p_edition_code: editionCode,
      p_user_id: auth.user!.id,
      p_user_email: await getVerifiedEmail(auth.user!.id),
    });

    if (error) {
      const message = String(error.message || "");
      if (/edition_not_found/i.test(message)) {
        return NextResponse.json({ error: "edition_unavailable" }, { status: 409 });
      }
      console.error("[book-registry/register] purchase preview failed", message);
      return NextResponse.json({ error: "suggested_identifier_unavailable" }, { status: 500 });
    }

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[book-registry/register] preview RPC failed", error);
    return NextResponse.json({ error: "suggested_identifier_unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticatedUser(request);
  if (auth.response) return auth.response;

  const body = await request.json().catch(() => null);
  const editionCode = parseEditionCode(body?.editionCode);
  if (!editionCode) return NextResponse.json({ error: "invalid_edition" }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin().rpc("register_book_registry_copy", {
      p_edition_code: editionCode,
      p_user_id: auth.user!.id,
      p_user_email: await getVerifiedEmail(auth.user!.id),
    });

    if (error) {
      const message = String(error.message || "");
      if (/purchase_required/i.test(message)) {
        return NextResponse.json({ error: "purchase_required" }, { status: 403 });
      }
      if (/purchase_already_used/i.test(message)) {
        return NextResponse.json({ error: "purchase_already_used" }, { status: 409 });
      }
      if (/historical_slot_unavailable/i.test(message)) {
        return NextResponse.json({ error: "historical_slot_unavailable" }, { status: 409 });
      }
      if (/edition_not_found/i.test(message)) {
        return NextResponse.json({ error: "edition_unavailable" }, { status: 409 });
      }
      if (/invalid_registration_request/i.test(message)) {
        return NextResponse.json({ error: "invalid_registration" }, { status: 400 });
      }
      console.error("[book-registry/register] registration RPC failed", message);
      return NextResponse.json({ error: "registration_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, copy: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[book-registry/register] unexpected failure", error);
    return NextResponse.json({ error: "registration_failed" }, { status: 500 });
  }
}

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

export async function GET(request: NextRequest) {
  const auth = await authenticatedUser(request);
  if (auth.response) return auth.response;

  const editionCode = parseEditionCode(request.nextUrl.searchParams.get("edition") || "book_1");
  if (!editionCode) return NextResponse.json({ error: "invalid_edition" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: edition, error: editionError } = await db
    .from("book_editions")
    .select("id,code,title,serial_prefix")
    .eq("code", editionCode)
    .eq("is_active", true)
    .single();

  if (editionError || !edition) {
    console.error("[book-registry/register] edition lookup failed", editionError?.message);
    return NextResponse.json({ error: "edition_unavailable" }, { status: 500 });
  }

  const { data: lastCopy, error: copyError } = await db
    .from("book_registry_copies")
    .select("serial_number")
    .eq("edition_id", edition.id)
    .order("serial_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (copyError) {
    console.error("[book-registry/register] serial preview failed", copyError.message);
    return NextResponse.json({ error: "suggested_identifier_unavailable" }, { status: 500 });
  }

  const serialNumber = (lastCopy?.serial_number ?? 0) + 1;
  return NextResponse.json({
    ok: true,
    suggestion: {
      editionCode: edition.code,
      editionTitle: edition.title,
      serialPrefix: edition.serial_prefix,
      serialNumber,
      serialLabel: edition.serial_prefix + "-" + String(serialNumber).padStart(3, "0"),
    },
  }, { headers: { "Cache-Control": "no-store" } });
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
    });

    if (error) {
      const message = String(error.message || "");
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

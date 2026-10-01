import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_WINDOW_DAYS = 7;

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, parsed));
}

function parseSince(value: string | null): string {
  if (!value) {
    return new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date(Date.now() - DEFAULT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : date.toISOString();
}

export async function GET(req: NextRequest) {
  const limit = parseLimit(req.nextUrl.searchParams.get("limit"));
  const since = parseSince(req.nextUrl.searchParams.get("since"));

  const { data, error } = await supabaseAdmin()
    .from("notification_broadcasts")
    .select("id, title, body, created_at")
    .eq("type", "system")
    .eq("is_public", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[public-notifications] query failed", error);
    return NextResponse.json(
      { ok: false, error: "public_notifications_unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      notifications: (data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body ?? null,
        created_at: item.created_at,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, isAdminEmail, isEditorEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "pending",
  "paid",
  "ready_to_dispatch",
  "dispatched",
  "fulfilled",
  "cancelled",
] as const;

type OrderStatus = (typeof ALLOWED_STATUSES)[number];

function parseStatuses(raw: string | null): OrderStatus[] {
  if (!raw) return ["paid", "ready_to_dispatch", "dispatched"];

  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is OrderStatus => ALLOWED_STATUSES.includes(value as OrderStatus));

  if (values.length === 0) return ["paid", "ready_to_dispatch", "dispatched"];
  return values;
}

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!isAdminEmail(requester.email) && !isEditorEmail(requester.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 50));
  const statuses = parseStatuses(url.searchParams.get("status"));

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select(
      "id, created_at, stripe_session_id, user_id, anonymized_user_hash, telegram_chat_id, product_id, delivery_type, amount, currency, status, customer_email, customer_name, delivery_note, dispatch_photo_url, dispatch_coordinates, dispatch_sent_at, fulfilled_at, fulfilled_by, metadata",
    )
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[admin.orders] list error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    orders: data ?? [],
    statuses,
    total: data?.length ?? 0,
  });
}

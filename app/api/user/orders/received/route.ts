import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const SOURCES = ["book", "shop"] as const;
type OrderSource = (typeof SOURCES)[number];

export async function POST(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    source?: OrderSource;
  } | null;

  if (!body?.orderId || !body.source || !SOURCES.includes(body.source)) {
    return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  if (body.source === "book") {
    const { data: order, error: loadError } = await db
      .from("orders")
      .select("id, status, user_received_at")
      .eq("id", body.orderId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string; status: string; user_received_at: string | null }>();

    if (loadError) {
      console.error("[user/orders/received] book lookup error", loadError);
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    if (order.user_received_at) {
      return NextResponse.json({ ok: true, user_received_at: order.user_received_at });
    }

    if (!["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(order.status)) {
      return NextResponse.json({ ok: false, error: "receipt_not_available" }, { status: 409 });
    }

    const { data: updated, error: updateError } = await db
      .from("orders")
      .update({ user_received_at: now })
      .eq("id", order.id)
      .eq("user_id", user.id)
      .is("user_received_at", null)
      .select("user_received_at")
      .maybeSingle<{ user_received_at: string }>();

    if (updateError) {
      console.error("[user/orders/received] book update error", updateError);
      return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      user_received_at: updated?.user_received_at ?? now,
    });
  }

  const { data: order, error: loadError } = await db
    .from("shop_orders")
    .select("id, status, user_received_at")
    .eq("id", body.orderId)
    .eq("user_id", user.id)
    .maybeSingle<{ id: string; status: string; user_received_at: string | null }>();

  if (loadError) {
    console.error("[user/orders/received] shop lookup error", loadError);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (order.user_received_at) {
    return NextResponse.json({ ok: true, user_received_at: order.user_received_at });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ ok: false, error: "receipt_not_available" }, { status: 409 });
  }

  const { data: updated, error: updateError } = await db
    .from("shop_orders")
    .update({ user_received_at: now })
    .eq("id", order.id)
    .eq("user_id", user.id)
    .is("user_received_at", null)
    .select("user_received_at")
    .maybeSingle<{ user_received_at: string }>();

  if (updateError) {
    console.error("[user/orders/received] shop update error", updateError);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user_received_at: updated?.user_received_at ?? now,
  });
}

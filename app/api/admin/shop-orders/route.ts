import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, isAdminEmail, isEditorEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdminEmail(requester.email) && !isEditorEmail(requester.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 100));

  let query = supabaseAdmin()
    .from("shop_orders")
    .select("id, order_type, status, currency, subtotal_amount, stripe_checkout_session_id, customer_email, user_id, metadata, created_at, updated_at, paid_at, user_received_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    const statuses = status.split(",").map((value) => value.trim()).filter(Boolean);
    if (statuses.length) query = query.in("status", statuses);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin.shop-orders] list error", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // This queue is specifically for shop payment records that have no matching
  // operational orders row, so the same purchase is not worked twice in admin.
  const { data: operationalRows, error: operationalError } = await supabaseAdmin()
    .from("orders")
    .select("stripe_session_id, metadata");

  if (operationalError) {
    console.error("[admin.shop-orders] operational-link lookup error", operationalError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const operationalSessions = new Set(
    (operationalRows ?? [])
      .map((row) => row.stripe_session_id)
      .filter((value): value is string => Boolean(value)),
  );
  const operationalShopOrderIds = new Set(
    (operationalRows ?? [])
      .map((row) => {
        const metadata = row.metadata && typeof row.metadata === "object"
          ? row.metadata as Record<string, unknown>
          : {};
        return typeof metadata.order_id === "string" ? metadata.order_id : null;
      })
      .filter((value): value is string => Boolean(value)),
  );

  const orders = (data ?? [])
    .filter((order) =>
      !operationalShopOrderIds.has(order.id)
      && !(order.stripe_checkout_session_id && operationalSessions.has(order.stripe_checkout_session_id)),
    )
    .map((order) => {
      const metadata = order.metadata && typeof order.metadata === "object"
        ? order.metadata as Record<string, unknown>
        : {};
      const subtotal = Number(order.subtotal_amount ?? 0);
      const shipping = Number(metadata.shippingAmount ?? 0);
      const total = Number(metadata.totalAmount ?? subtotal + shipping);
      return {
        ...order,
        metadata,
        total_amount: Number.isFinite(total) ? total : subtotal,
      };
    });

  return NextResponse.json({ orders, total: orders.length });
}

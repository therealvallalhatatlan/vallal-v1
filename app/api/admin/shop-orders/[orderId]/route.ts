import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, isAdminEmail, isEditorEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function requireAdminOrEditor(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) return { ok: false as const, response: NextResponse.json({ error: "missing_token" }, { status: 401 }) };

  const requester = await getUserFromToken(token);
  if (!requester) return { ok: false as const, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };

  if (!isAdminEmail(requester.email) && !isEditorEmail(requester.email)) {
    return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, requester };
}

export async function GET(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminOrEditor(req);
  if (!auth.ok) return auth.response;

  const { orderId } = await context.params;
  const db = supabaseAdmin();

  const { data: order, error: orderError } = await db
    .from("shop_orders")
    .select("id, order_type, status, currency, subtotal_amount, stripe_checkout_session_id, stripe_payment_intent_id, customer_email, user_id, metadata, created_at, updated_at, paid_at, user_received_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("[admin.shop-orders] order lookup error", orderError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: items, error: itemsError } = await db
    .from("shop_order_items")
    .select("id, product_id, product_type, product_name, variant_id, quantity, unit_amount, metadata, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[admin.shop-orders] items lookup error", itemsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const metadata = order.metadata && typeof order.metadata === "object"
    ? order.metadata as Record<string, unknown>
    : {};
  const subtotal = Number(order.subtotal_amount ?? 0);
  const shipping = Number(metadata.shippingAmount ?? 0);
  const total = Number(metadata.totalAmount ?? subtotal + shipping);

  return NextResponse.json({
    order: { ...order, metadata, total_amount: Number.isFinite(total) ? total : subtotal },
    items: items ?? [],
  });
}

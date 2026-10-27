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

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["ready_to_dispatch", "cancelled"],
  ready_to_dispatch: ["dispatched", "cancelled"],
  dispatched: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

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

  const orderQuery = supabaseAdmin()
    .from("orders")
    .select(
      "id, created_at, stripe_session_id, user_id, anonymized_user_hash, telegram_chat_id, product_id, delivery_type, amount, currency, status, customer_email, customer_name, delivery_note, dispatch_photo_url, dispatch_coordinates, dispatch_sent_at, fulfilled_at, fulfilled_by, metadata",
    )
    .eq("id", orderId)
    .maybeSingle();

  const itemsQuery = supabaseAdmin()
    .from("order_items")
    .select("id, product_id, product_code, product_name, unit_price, quantity, line_total, metadata, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  const eventsQuery = supabaseAdmin()
    .from("order_fulfillment_events")
    .select("id, created_at, event_type, actor_email, payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(200);

  const [{ data: order, error: orderError }, { data: items, error: itemsError }, { data: events, error: eventsError }] =
    await Promise.all([orderQuery, itemsQuery, eventsQuery]);

  if (orderError) {
    console.error("[admin.orders] detail order error", orderError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (itemsError) {
    console.error("[admin.orders] detail items error", itemsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (eventsError) {
    console.error("[admin.orders] detail events error", eventsError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  let detailItems = items ?? [];

  // Shop purchases are stored in shop_order_items; the legacy operational
  // order_items table can be empty for those same paid orders. Resolve the
  // related shop order by its metadata ID first, then by Stripe session ID.
  if (detailItems.length === 0) {
    const orderMetadata =
      order.metadata && typeof order.metadata === "object"
        ? (order.metadata as Record<string, unknown>)
        : {};
    const metadataShopOrderId =
      typeof orderMetadata.order_id === "string" ? orderMetadata.order_id : null;

    let shopOrderId: string | null = null;

    if (metadataShopOrderId) {
      const { data: linkedShopOrder, error: linkedShopOrderError } = await supabaseAdmin()
        .from("shop_orders")
        .select("id")
        .eq("id", metadataShopOrderId)
        .maybeSingle<{ id: string }>();

      if (linkedShopOrderError) {
        console.warn("[admin.orders] linked shop order lookup failed", linkedShopOrderError);
      } else {
        shopOrderId = linkedShopOrder?.id ?? null;
      }
    }

    if (!shopOrderId && order.stripe_session_id) {
      const { data: sessionShopOrder, error: sessionShopOrderError } = await supabaseAdmin()
        .from("shop_orders")
        .select("id")
        .eq("stripe_checkout_session_id", order.stripe_session_id)
        .maybeSingle<{ id: string }>();

      if (sessionShopOrderError) {
        console.warn("[admin.orders] shop order session lookup failed", sessionShopOrderError);
      } else {
        shopOrderId = sessionShopOrder?.id ?? null;
      }
    }

    if (shopOrderId) {
      const { data: shopItems, error: shopItemsError } = await supabaseAdmin()
        .from("shop_order_items")
        .select("id, product_id, product_type, product_name, variant_id, quantity, unit_amount, metadata, created_at")
        .eq("order_id", shopOrderId)
        .order("created_at", { ascending: true });

      if (shopItemsError) {
        console.warn("[admin.orders] shop order items lookup failed", shopItemsError);
      } else {
        detailItems = (shopItems ?? []).map((item) => {
          const quantity = Number(item.quantity ?? 0);
          const unitAmount = Number(item.unit_amount ?? 0);

          return {
            id: item.id,
            product_id: item.product_id,
            product_code: item.variant_id ?? item.product_id,
            product_name: item.product_name,
            unit_price: unitAmount / 100,
            quantity,
            line_total: (unitAmount * quantity) / 100,
            metadata: item.metadata,
            created_at: item.created_at,
          };
        });
      }
    }
  }

  return NextResponse.json({
    order,
    items: detailItems,
    events: events ?? [],
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminOrEditor(req);
  if (!auth.ok) return auth.response;

  const { orderId } = await context.params;

  const body = (await req.json().catch(() => null)) as
    | {
        status?: OrderStatus;
        deliveryNote?: string;
        dispatchPhotoUrl?: string | null;
        dispatchCoordinates?: { lat: number; lng: number } | null;
      }
    | null;

  if (!body || !body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: existingOrder, error: existingError } = await supabaseAdmin()
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle<{ id: string; status: OrderStatus }>();

  if (existingError) {
    console.error("[admin.orders] patch lookup error", existingError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!existingOrder) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const fromStatus = existingOrder.status;
  const toStatus = body.status;
  if (fromStatus !== toStatus && !TRANSITIONS[fromStatus].includes(toStatus)) {
    return NextResponse.json({ error: "invalid_transition", fromStatus, toStatus }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status: toStatus,
    delivery_note: typeof body.deliveryNote === "string" ? body.deliveryNote : null,
    dispatch_photo_url: typeof body.dispatchPhotoUrl === "string" ? body.dispatchPhotoUrl : null,
    dispatch_coordinates: body.dispatchCoordinates ?? null,
  };

  if (toStatus === "dispatched") {
    updatePayload.dispatch_sent_at = now;
  }

  if (toStatus === "fulfilled") {
    updatePayload.fulfilled_at = now;
    updatePayload.fulfilled_by = auth.requester.email;
  }

  const { data: updatedOrder, error: updateError } = await supabaseAdmin()
    .from("orders")
    .update(updatePayload)
    .eq("id", orderId)
    .select(
      "id, created_at, stripe_session_id, user_id, anonymized_user_hash, telegram_chat_id, product_id, delivery_type, amount, currency, status, customer_email, customer_name, delivery_note, dispatch_photo_url, dispatch_coordinates, dispatch_sent_at, fulfilled_at, fulfilled_by, metadata",
    )
    .maybeSingle();

  if (updateError) {
    console.error("[admin.orders] patch update error", updateError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await supabaseAdmin().from("order_fulfillment_events").insert({
    order_id: orderId,
    event_type: "status_updated",
    actor_email: auth.requester.email,
    payload: {
      fromStatus,
      toStatus,
      deliveryNote: body.deliveryNote ?? null,
      dispatchPhotoUrl: body.dispatchPhotoUrl ?? null,
      dispatchCoordinates: body.dispatchCoordinates ?? null,
    },
  });

  return NextResponse.json({ order: updatedOrder });
}

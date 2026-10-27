import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, isAdminEmail, isEditorEmail, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type FulfillmentMapRow = {
  id: string;
  orders_order_id: string | null;
  shop_order_id: string | null;
  delivery_method: string;
  fulfillment_status: string;
  proposed_pickup_at: string | null;
  confirmed_pickup_at: string | null;
  pickup_point: string | null;
  pickup_instructions: string | null;
  pickup_lat: number;
  pickup_lng: number;
  location_released_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdminEmail(requester.email) && !isEditorEmail(requester.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: fulfillments, error: fulfillmentError } = await supabaseAdmin()
    .from("order_fulfillment")
    .select("id, orders_order_id, shop_order_id, delivery_method, fulfillment_status, proposed_pickup_at, confirmed_pickup_at, pickup_point, pickup_instructions, pickup_lat, pickup_lng, location_released_at, created_at, updated_at")
    .eq("delivery_method", "dead-drop")
    .in("fulfillment_status", ["location_released", "received"])
    .not("pickup_lat", "is", null)
    .not("pickup_lng", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (fulfillmentError) {
    console.error("[admin.order-fulfillment.map] fulfillment lookup failed", fulfillmentError);
    return NextResponse.json({ error: "fulfillment_map_unavailable" }, { status: 500 });
  }

  const rows = (fulfillments ?? []) as FulfillmentMapRow[];
  const operationalIds = [...new Set(rows.map((row) => row.orders_order_id).filter((value): value is string => Boolean(value)))];
  const shopIds = [...new Set(rows.map((row) => row.shop_order_id).filter((value): value is string => Boolean(value)))];

  const [opsResult, shopResult] = await Promise.all([
    operationalIds.length
      ? supabaseAdmin().from("orders").select("id, product_id, status").in("id", operationalIds)
      : Promise.resolve({ data: [], error: null }),
    shopIds.length
      ? supabaseAdmin().from("shop_orders").select("id, status, metadata").in("id", shopIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (opsResult.error || shopResult.error) {
    console.error("[admin.order-fulfillment.map] order lookup failed", opsResult.error ?? shopResult.error);
    return NextResponse.json({ error: "fulfillment_map_unavailable" }, { status: 500 });
  }

  const opsById = new Map((opsResult.data ?? []).map((row) => [row.id, row]));
  const shopById = new Map((shopResult.data ?? []).map((row) => [row.id, row]));

  const locations = rows.map((row) => {
    const ops = row.orders_order_id ? opsById.get(row.orders_order_id) : null;
    const shop = row.shop_order_id ? shopById.get(row.shop_order_id) : null;
    const shopMetadata = shop?.metadata && typeof shop.metadata === "object"
      ? shop.metadata as Record<string, unknown>
      : {};
    const productLabel = ops?.product_id
      ?? (typeof shopMetadata.cart_summary === "string" ? shopMetadata.cart_summary : null)
      ?? (typeof shopMetadata.product_id === "string" ? shopMetadata.product_id : "Könyvrendelés");
    const source = row.orders_order_id ? "orders" : "shop_orders";
    const orderId = row.orders_order_id ?? row.shop_order_id;

    return {
      id: row.id,
      orderId,
      source,
      orderReference: (orderId ?? row.id).replaceAll("-", "").slice(0, 8).toUpperCase(),
      productLabel,
      fulfillmentStatus: row.fulfillment_status,
      orderStatus: ops?.status ?? shop?.status ?? "unknown",
      lat: Number(row.pickup_lat),
      lng: Number(row.pickup_lng),
      pickupPoint: row.pickup_point,
      pickupInstructions: row.pickup_instructions,
      proposedPickupAt: row.confirmed_pickup_at ?? row.proposed_pickup_at,
      locationReleasedAt: row.location_released_at,
      updatedAt: row.updated_at,
      href: source === "orders" ? `/admin/orders/${orderId}` : `/admin/shop-orders/${orderId}`,
    };
  }).filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng));

  return NextResponse.json({ locations, total: locations.length });
}

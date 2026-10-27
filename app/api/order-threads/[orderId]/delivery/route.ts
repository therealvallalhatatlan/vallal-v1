import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import {
  getUserFromToken,
  isAdminEmail,
  isEditorEmail,
  parseBearerToken,
} from "@/lib/auth";
import { guardWriteOperation } from "@/lib/systemGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type OrderSource = "orders" | "shop_orders";
type DeliveryMethod = "dead-drop" | "postaautomata" | "eu" | "personal" | "unknown";
type FulfillmentStatus =
  | "awaiting_contact"
  | "pickup_date_proposed"
  | "pickup_date_confirmed"
  | "preparing"
  | "location_released"
  | "shipped"
  | "received"
  | "cancelled";

type OrderRow = {
  id: string;
  user_id: string | null;
  customer_email: string | null;
  status: string;
  delivery_type?: string | null;
  metadata?: Record<string, unknown> | null;
  stripe_session_id?: string | null;
  stripe_checkout_session_id?: string | null;
  dispatch_sent_at?: string | null;
  dispatch_coordinates?: Record<string, unknown> | null;
  user_received_at?: string | null;
};

type FulfillmentRow = {
  id: string;
  orders_order_id: string | null;
  shop_order_id: string | null;
  delivery_method: DeliveryMethod;
  fulfillment_status: FulfillmentStatus;
  proposed_pickup_at: string | null;
  confirmed_pickup_at: string | null;
  pickup_point: string | null;
  pickup_instructions: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  location_released_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_FULFILLMENT =
  "id, orders_order_id, shop_order_id, delivery_method, fulfillment_status, proposed_pickup_at, confirmed_pickup_at, pickup_point, pickup_instructions, pickup_lat, pickup_lng, location_released_at, carrier, tracking_number, tracking_url, shipped_at, delivered_at, created_at, updated_at";

function parseSource(value: string | null): OrderSource | null {
  if (value === "orders" || value === "shop_orders") return value;
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isStaff(email: string | null | undefined): boolean {
  return isAdminEmail(email) || isEditorEmail(email);
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function parseDeliveryMethod(raw: unknown): DeliveryMethod {
  switch (raw) {
    case "dead-drop":
    case "dead_drop":
      return "dead-drop";
    case "postaautomata":
    case "hu_shipping":
    case "anonymous_locker":
      return "postaautomata";
    case "eu":
    case "eu_shipping":
      return "eu";
    case "personal":
      return "personal";
    default:
      return "unknown";
  }
}

function deriveDeliveryMethod(source: OrderSource, order: OrderRow): DeliveryMethod {
  if (source === "shop_orders") {
    return parseDeliveryMethod(order.metadata?.deliveryMethod ?? order.metadata?.delivery_method);
  }
  return parseDeliveryMethod(order.delivery_type ?? order.metadata?.deliveryMethod);
}

async function loadOrder(source: OrderSource, orderId: string): Promise<OrderRow | null> {
  if (source === "orders") {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select("id, user_id, customer_email, status, delivery_type, metadata, stripe_session_id, dispatch_sent_at, dispatch_coordinates, user_received_at")
      .eq("id", orderId)
      .maybeSingle<OrderRow>();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin()
    .from("shop_orders")
    .select("id, user_id, customer_email, status, metadata, stripe_checkout_session_id, user_received_at")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (error) throw error;
  return data;
}

async function resolveLinkedOrderIds(source: OrderSource, orderId: string, order: OrderRow) {
  let ordersOrderId: string | null = source === "orders" ? orderId : null;
  let shopOrderId: string | null = source === "shop_orders" ? orderId : null;
  const db = supabaseAdmin();

  if (source === "shop_orders") {
    let linked = null as { id: string } | null;

    if (order.stripe_checkout_session_id) {
      const { data, error } = await db
        .from("orders")
        .select("id")
        .eq("stripe_session_id", order.stripe_checkout_session_id)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      linked = data;
    }

    if (!linked) {
      const { data, error } = await db
        .from("orders")
        .select("id")
        .eq("metadata->>order_id", orderId)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      linked = data;
    }

    ordersOrderId = linked?.id ?? null;
  } else {
    const metadataShopOrderId =
      typeof order.metadata?.order_id === "string" ? order.metadata.order_id : null;

    if (metadataShopOrderId && isUuid(metadataShopOrderId)) {
      const { data, error } = await db
        .from("shop_orders")
        .select("id")
        .eq("id", metadataShopOrderId)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      shopOrderId = data?.id ?? null;
    }

    if (!shopOrderId && order.stripe_session_id) {
      const { data, error } = await db
        .from("shop_orders")
        .select("id")
        .eq("stripe_checkout_session_id", order.stripe_session_id)
        .maybeSingle<{ id: string }>();
      if (error) throw error;
      shopOrderId = data?.id ?? null;
    }
  }

  return { ordersOrderId, shopOrderId };
}

async function findFulfillment(ordersOrderId: string | null, shopOrderId: string | null) {
  let query = supabaseAdmin().from("order_fulfillment").select(SELECT_FULFILLMENT);
  if (ordersOrderId && shopOrderId) {
    query = query.or(`orders_order_id.eq.${ordersOrderId},shop_order_id.eq.${shopOrderId}`) as typeof query;
  } else if (ordersOrderId) {
    query = query.eq("orders_order_id", ordersOrderId) as typeof query;
  } else if (shopOrderId) {
    query = query.eq("shop_order_id", shopOrderId) as typeof query;
  } else {
    return null;
  }

  const { data, error } = await query.maybeSingle<FulfillmentRow>();
  if (error) throw error;
  return data;
}

async function resolveRequestContext(
  source: OrderSource,
  orderId: string,
  requester: { id: string; email: string | null },
) {
  const order = await loadOrder(source, orderId);
  if (!order) {
    return { ok: false as const, response: NextResponse.json({ error: "order_not_found" }, { status: 404 }) };
  }

  const staff = isStaff(requester.email);
  const emailMatches = normalizeEmail(order.customer_email) !== ""
    && normalizeEmail(order.customer_email) === normalizeEmail(requester.email);

  if (!staff && (order.user_id ? order.user_id !== requester.id : !emailMatches)) {
    return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  const orderIds = await resolveLinkedOrderIds(source, orderId, order);
  const fulfillment = await findFulfillment(orderIds.ordersOrderId, orderIds.shopOrderId);
  return {
    ok: true as const,
    source,
    orderId,
    order,
    staff,
    orderIds,
    fulfillment,
    deliveryMethod: fulfillment?.delivery_method ?? deriveDeliveryMethod(source, order),
  };
}

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const emailFrom = process.env.EMAIL_FROM;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatEmailDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Budapest",
  }).format(date);
}

async function sendFulfillmentEmail(input: {
  recipients: string[];
  subject: string;
  body: string;
  actionUrl: string;
}) {
  const recipients = [...new Set(input.recipients.map((item) => item.trim()).filter(Boolean))];
  if (!resendClient || !emailFrom || recipients.length === 0) return;

  const safeSubject = escapeHtml(input.subject);
  const safeBody = escapeHtml(input.body).replace(/\\r?\\n/g, "<br />");
  const safeUrl = escapeHtml(input.actionUrl);
  try {
    await resendClient.emails.send({
      from: emailFrom,
      to: recipients,
      subject: input.subject,
      html: `
        <div style="margin:0;background:#050505;color:#f4f4f4;font-family:Arial,sans-serif;padding:28px;line-height:1.6">
          <div style="max-width:620px;margin:0 auto;border:1px solid #2a2a2a;background:#0b0b0b;padding:24px">
            <p style="margin:0 0 10px;color:#b7ed78;font-size:11px;letter-spacing:.16em;text-transform:uppercase">VÁLLALHATATLAN / KÉZBESÍTÉS</p>
            <h1 style="font-size:21px;margin:0 0 16px;color:#fff">${safeSubject}</h1>
            <div style="border:1px solid #242424;background:#060606;padding:14px;color:#eee;font-size:14px;overflow-wrap:anywhere">${safeBody}</div>
            <p style="margin:22px 0 0"><a href="${safeUrl}" style="color:#b7ed78">Rendelés megnyitása →</a></p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    // Do not roll back a successful state change if email delivery is unavailable.
    console.warn("[order-fulfillment] status notification failed", error);
  }
}

function adminNotificationRecipients(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

async function resolveCustomerEmail(
  source: OrderSource,
  order: OrderRow,
  orderIds: { ordersOrderId: string | null; shopOrderId: string | null },
): Promise<string | null> {
  if (order.customer_email?.trim()) return order.customer_email.trim();

  if (orderIds.shopOrderId) {
    const { data, error } = await supabaseAdmin()
      .from("shop_orders")
      .select("customer_email, user_id")
      .eq("id", orderIds.shopOrderId)
      .maybeSingle<{ customer_email: string | null; user_id: string | null }>();
    if (error) console.warn("[order-fulfillment] linked shop order email lookup failed", error);
    if (data?.customer_email) return data.customer_email;
    if (data?.user_id) {
      const { data: authUser } = await supabaseAdmin().auth.admin.getUserById(data.user_id);
      if (authUser.user?.email) return authUser.user.email;
    }
  }

  if (orderIds.ordersOrderId) {
    const { data, error } = await supabaseAdmin()
      .from("orders")
      .select("customer_email, user_id")
      .eq("id", orderIds.ordersOrderId)
      .maybeSingle<{ customer_email: string | null; user_id: string | null }>();
    if (error) console.warn("[order-fulfillment] linked operational order email lookup failed", error);
    if (data?.customer_email) return data.customer_email;
    if (data?.user_id) {
      const { data: authUser } = await supabaseAdmin().auth.admin.getUserById(data.user_id);
      if (authUser.user?.email) return authUser.user.email;
    }
  }

  if (order.user_id) {
    const { data: authUser } = await supabaseAdmin().auth.admin.getUserById(order.user_id);
    if (authUser.user?.email) return authUser.user.email;
  }

  return null;
}

async function notifyFulfillmentCounterparty(input: {
  action: string;
  staff: boolean;
  source: OrderSource;
  orderId: string;
  order: OrderRow;
  orderIds: { ordersOrderId: string | null; shopOrderId: string | null };
  previousStatus: FulfillmentStatus;
  updated: FulfillmentRow;
}) {
  const customerEmail = await resolveCustomerEmail(input.source, input.order, input.orderIds);
  const siteUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.vallalhatatlan.online").replace(/\\/$/, "");
  const adminUrl = input.orderIds.ordersOrderId
    ? `${siteUrl}/admin/orders/${input.orderIds.ordersOrderId}`
    : `${siteUrl}/admin/shop-orders/${input.orderIds.shopOrderId ?? input.orderId}`;
  const customerUrl = `${siteUrl}/dashboard`;
  let subject = "";
  let body = "";

  switch (input.action) {
    case "propose_pickup_date":
      subject = "Átvételi időpontjavaslat érkezett";
      body = `A javasolt átvételi időpont: ${formatEmailDate(input.updated.proposed_pickup_at)}. Jelentkezz be a fiókodba, hogy elfogadd az időpontot.`;
      break;
    case "confirm_pickup_date":
      subject = "A vásárló elfogadta az átvételi időpontot";
      body = `A vásárló elfogadta a javasolt időpontot: ${formatEmailDate(input.updated.confirmed_pickup_at)}. Most már megosztható a dead-drop helyszín.`;
      break;
    case "release_location":
      subject = "Az átvételi helyszín elérhető";
      body = [
        "Az egyeztetett átvételi helyszínt feloldottuk.",
        `Koordináták: ${input.updated.pickup_lat}, ${input.updated.pickup_lng}`,
        `Útmutató: ${input.updated.pickup_instructions ?? "Lépj be a fiókodba az átvételi részletekért."}`,
      ].join("\\n");
      break;
    case "mark_shipped":
      if (input.previousStatus !== "shipped") {
        subject = "A rendelésedet feladtuk";
        body = [
          `Szolgáltató: ${input.updated.carrier ?? "nincs megadva"}`,
          `Nyomkövetési szám: ${input.updated.tracking_number ?? "nincs megadva"}`,
          input.updated.tracking_url ? `Nyomkövetés: ${input.updated.tracking_url}` : "",
        ].filter(Boolean).join("\\n");
      }
      break;
    case "mark_received":
      subject = "A vásárló átvette a rendelést";
      body = "A vásárló átvettként jelölte a rendelést.";
      break;
    case "cancel_fulfillment":
      subject = "A kézbesítési folyamat megszakadt";
      body = "A rendelés kézbesítési folyamata megszakításra került. Lépj be a fiókodba a további egyeztetéshez.";
      break;
  }

  if (!subject) return;
  const to = input.staff
    ? (customerEmail ? [customerEmail] : [])
    : adminNotificationRecipients();
  const actionUrl = input.staff ? customerUrl : adminUrl;

  await sendFulfillmentEmail({ recipients: to, subject, body, actionUrl });
}

function safeFulfillment(row: FulfillmentRow | null, deliveryMethod: DeliveryMethod, order: OrderRow, staff: boolean) {
  const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const defaultPickupPoint = typeof metadata.pickupPoint === "string" ? metadata.pickupPoint : null;
  const base = row ?? {
    id: null,
    orders_order_id: null,
    shop_order_id: null,
    delivery_method: deliveryMethod,
    fulfillment_status: order.user_received_at || order.status === "fulfilled" ? "received" : "awaiting_contact",
    proposed_pickup_at: null,
    confirmed_pickup_at: null,
    pickup_point: defaultPickupPoint,
    pickup_instructions: null,
    pickup_lat: null,
    pickup_lng: null,
    location_released_at: order.dispatch_sent_at ?? null,
    carrier: null,
    tracking_number: null,
    tracking_url: null,
    shipped_at: order.dispatch_sent_at ?? null,
    delivered_at: order.user_received_at ?? null,
    created_at: null,
    updated_at: null,
  };

  const locationIsReleased =
    staff || Boolean(base.location_released_at)
    || base.fulfillment_status === "location_released"
    || base.fulfillment_status === "received";

  return {
    ...base,
    pickup_lat: locationIsReleased ? base.pickup_lat : null,
    pickup_lng: locationIsReleased ? base.pickup_lng : null,
    pickup_instructions: locationIsReleased ? base.pickup_instructions : null,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });
  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const source = parseSource(new URL(req.url).searchParams.get("source"));
  if (!source) return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  const { orderId } = await context.params;
  if (!isUuid(orderId)) return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });

  try {
    const resolved = await resolveRequestContext(source, orderId, requester);
    if (!resolved.ok) return resolved.response;

    return NextResponse.json({
      fulfillment: safeFulfillment(
        resolved.fulfillment,
        resolved.deliveryMethod,
        resolved.order,
        resolved.staff,
      ),
      isStaff: resolved.staff,
      canConfirmPickup: !resolved.staff
        && resolved.fulfillment?.fulfillment_status === "pickup_date_proposed",
      canMarkReceived: !resolved.staff
        && ["location_released", "shipped"].includes(resolved.fulfillment?.fulfillment_status ?? ""),
    });
  } catch (error) {
    console.error("[order-fulfillment] GET failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const guardResponse = await guardWriteOperation(req);
  if (guardResponse) return guardResponse;

  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });
  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null) as Record<string, unknown> | null;
  const source = parseSource(typeof json?.source === "string" ? json.source : null);
  if (!source) return NextResponse.json({ error: "invalid_source" }, { status: 400 });
  const action = typeof json?.action === "string" ? json.action : "";
  const { orderId } = await context.params;
  if (!isUuid(orderId)) return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });

  try {
    const resolved = await resolveRequestContext(source, orderId, requester);
    if (!resolved.ok) return resolved.response;

    const staffActions = ["propose_pickup_date", "release_location", "mark_shipped", "cancel_fulfillment"];
    const customerActions = ["confirm_pickup_date", "mark_received"];
    if (resolved.staff && !staffActions.includes(action)) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }
    if (!resolved.staff && !customerActions.includes(action)) {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }

    const db = supabaseAdmin();
    let fulfillment = resolved.fulfillment;
    if (!fulfillment) {
      const insert = {
        orders_order_id: resolved.orderIds.ordersOrderId,
        shop_order_id: resolved.orderIds.shopOrderId,
        delivery_method: resolved.deliveryMethod,
        pickup_point: typeof resolved.order.metadata?.pickupPoint === "string"
          ? resolved.order.metadata.pickupPoint
          : null,
        updated_by_user_id: requester.id,
      };
      const { data, error } = await db
        .from("order_fulfillment")
        .insert(insert)
        .select(SELECT_FULFILLMENT)
        .single<FulfillmentRow>();

      if (error) {
        fulfillment = await findFulfillment(resolved.orderIds.ordersOrderId, resolved.orderIds.shopOrderId);
        if (!fulfillment) {
          console.error("[order-fulfillment] create record failed", error);
          return NextResponse.json({ error: "server_error" }, { status: 500 });
        }
      } else {
        fulfillment = data;
      }
    }

    const previousStatus = fulfillment.fulfillment_status;
    const now = new Date().toISOString();
    let update: Record<string, unknown> = {
      updated_at: now,
      updated_by_user_id: requester.id,
    };

    if (action === "propose_pickup_date") {
      if (!["dead-drop", "personal"].includes(fulfillment.delivery_method)) {
        return NextResponse.json({ error: "pickup_date_not_applicable" }, { status: 409 });
      }
      if (!["awaiting_contact", "pickup_date_proposed", "pickup_date_confirmed"].includes(fulfillment.fulfillment_status)) {
        return NextResponse.json({ error: "pickup_date_flow_already_advanced" }, { status: 409 });
      }
      const raw = typeof json?.proposedPickupAt === "string" ? json.proposedPickupAt : "";
      const proposedDate = new Date(raw);
      if (!raw || Number.isNaN(proposedDate.getTime()) || proposedDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "invalid_pickup_date" }, { status: 400 });
      }
      update = {
        ...update,
        fulfillment_status: "pickup_date_proposed",
        proposed_pickup_at: proposedDate.toISOString(),
        confirmed_pickup_at: null,
        location_released_at: null,
        pickup_lat: null,
        pickup_lng: null,
        pickup_instructions: null,
      };
    } else if (action === "confirm_pickup_date") {
      if (fulfillment.fulfillment_status !== "pickup_date_proposed" || !fulfillment.proposed_pickup_at) {
        return NextResponse.json({ error: "pickup_date_not_proposed" }, { status: 409 });
      }
      update = {
        ...update,
        fulfillment_status: "pickup_date_confirmed",
        confirmed_pickup_at: fulfillment.proposed_pickup_at,
      };
    } else if (action === "release_location") {
      if (fulfillment.fulfillment_status !== "pickup_date_confirmed") {
        return NextResponse.json({ error: "pickup_date_must_be_confirmed" }, { status: 409 });
      }
      if (fulfillment.delivery_method !== "dead-drop") {
        return NextResponse.json({ error: "location_release_not_applicable" }, { status: 409 });
      }
      const lat = Number(json?.pickupLat);
      const lng = Number(json?.pickupLng);
      const instructions = typeof json?.pickupInstructions === "string"
        ? json.pickupInstructions.trim().slice(0, 2000)
        : "";
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !instructions) {
        return NextResponse.json({ error: "valid_coordinates_and_instructions_required" }, { status: 400 });
      }
      update = {
        ...update,
        fulfillment_status: "location_released",
        pickup_lat: lat,
        pickup_lng: lng,
        pickup_instructions: instructions,
        location_released_at: now,
      };
    } else if (action === "mark_shipped") {
      if (!["postaautomata", "eu"].includes(fulfillment.delivery_method)) {
        return NextResponse.json({ error: "shipping_not_applicable" }, { status: 409 });
      }
      const carrier = typeof json?.carrier === "string" ? json.carrier.trim().slice(0, 120) : "";
      const trackingNumber = typeof json?.trackingNumber === "string" ? json.trackingNumber.trim().slice(0, 160) : "";
      const trackingUrl = typeof json?.trackingUrl === "string" ? json.trackingUrl.trim().slice(0, 500) : "";
      if (!trackingNumber) return NextResponse.json({ error: "tracking_number_required" }, { status: 400 });
      if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) {
        return NextResponse.json({ error: "tracking_url_must_be_https" }, { status: 400 });
      }
      update = {
        ...update,
        fulfillment_status: "shipped",
        carrier: carrier || null,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || null,
        shipped_at: now,
      };
    } else if (action === "mark_received") {
      if (!["location_released", "shipped"].includes(fulfillment.fulfillment_status)) {
        return NextResponse.json({ error: "order_not_ready_for_receipt" }, { status: 409 });
      }
      update = {
        ...update,
        fulfillment_status: "received",
        delivered_at: now,
      };
    } else if (action === "cancel_fulfillment") {
      if (["received", "cancelled"].includes(fulfillment.fulfillment_status)) {
        return NextResponse.json({ error: "fulfillment_already_closed" }, { status: 409 });
      }
      update = { ...update, fulfillment_status: "cancelled" };
    }

    const { data: updated, error: updateError } = await db
      .from("order_fulfillment")
      .update(update)
      .eq("id", fulfillment.id)
      .select(SELECT_FULFILLMENT)
      .single<FulfillmentRow>();

    if (updateError || !updated) {
      console.error("[order-fulfillment] update failed", updateError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (action === "mark_received") {
      if (resolved.orderIds.ordersOrderId) {
        await db.from("orders")
          .update({ user_received_at: now })
          .eq("id", resolved.orderIds.ordersOrderId)
          .is("user_received_at", null);
      }
      if (resolved.orderIds.shopOrderId) {
        await db.from("shop_orders")
          .update({ user_received_at: now })
          .eq("id", resolved.orderIds.shopOrderId)
          .is("user_received_at", null);
      }
    }

    if (resolved.orderIds.ordersOrderId) {
      const { error: eventError } = await db.from("order_fulfillment_events").insert({
        order_id: resolved.orderIds.ordersOrderId,
        event_type: `fulfillment_${action}`,
        actor_email: requester.email,
        payload: {
          fulfillment_status: updated.fulfillment_status,
          proposed_pickup_at: updated.proposed_pickup_at,
          confirmed_pickup_at: updated.confirmed_pickup_at,
          location_released_at: updated.location_released_at,
          shipped_at: updated.shipped_at,
          delivered_at: updated.delivered_at,
        },
      });
      if (eventError) console.warn("[order-fulfillment] event log failed", eventError);
    }

    try {
      await notifyFulfillmentCounterparty({
        action,
        staff: resolved.staff,
        source: resolved.source,
        orderId,
        order: resolved.order,
        orderIds: resolved.orderIds,
        previousStatus,
        updated,
      });
    } catch (notificationError) {
      // The state change has already been committed. Never make the client retry
      // and accidentally repeat a successful fulfillment transition due to email.
      console.warn("[order-fulfillment] status changed but notification failed", notificationError);
    }

    return NextResponse.json({
      ok: true,
      fulfillment: safeFulfillment(updated, updated.delivery_method, resolved.order, resolved.staff),
    });
  } catch (error) {
    console.error("[order-fulfillment] PATCH failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import {
  getUserFromToken,
  isAdminEmail,
  isEditorEmail,
  parseBearerToken,
} from "@/lib/auth";
import { guardWriteOperation } from "@/lib/systemGuard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MAX_BODY_CHARS = 2000;
type OrderSource = "orders" | "shop_orders";
type OrderRow = {
  id: string;
  user_id: string | null;
  customer_email: string | null;
  status: string;
  stripe_session_id?: string | null;
  stripe_checkout_session_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

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

async function loadOrder(source: OrderSource, orderId: string): Promise<OrderRow | null> {
  const db = supabaseAdmin();
  if (source === "orders") {
    const { data, error } = await db
      .from("orders")
      .select("id, user_id, customer_email, status, stripe_session_id, metadata")
      .eq("id", orderId)
      .maybeSingle<OrderRow>();
    if (error) throw error;
    return data;
  }

  const { data, error } = await db
    .from("shop_orders")
    .select("id, user_id, customer_email, status, stripe_checkout_session_id, metadata")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();
  if (error) throw error;
  return data;
}

async function findOperationalOrderForShopOrder(order: OrderRow, shopOrderId: string): Promise<string | null> {
  const db = supabaseAdmin();
  if (order.stripe_checkout_session_id) {
    const { data, error } = await db
      .from("orders")
      .select("id")
      .eq("stripe_session_id", order.stripe_checkout_session_id)
      .maybeSingle<{ id: string }>();
    if (error) throw error;
    if (data?.id) return data.id;
  }

  const { data, error } = await db
    .from("orders")
    .select("id")
    .eq("metadata->>order_id", shopOrderId)
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data?.id ?? null;
}

async function findAuthUserByEmail(email: string | null): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin().auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error("[order-threads] user lookup failed", error);
    return null;
  }

  return data.users.find((candidate) => normalizeEmail(candidate.email) === normalized)?.id ?? null;
}

function orderKey(source: OrderSource): "orders_order_id" | "shop_order_id" {
  return source === "orders" ? "orders_order_id" : "shop_order_id";
}

async function resolveConversationContext(
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

  // A linked user_id is authoritative. Email is only used for legacy orders
  // that have not yet been linked to an Auth user.
  if (!staff && (order.user_id ? order.user_id !== requester.id : !emailMatches)) {
    return { ok: false as const, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  const customerUserId = order.user_id
    ?? (staff ? await findAuthUserByEmail(order.customer_email) : requester.id);

  if (!customerUserId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "customer_account_unavailable" },
        { status: 409 },
      ),
    };
  }

  // If a webshop order also has an operational orders row, both sides share
  // one conversation so neither the buyer nor admin sees a split thread.
  let threadSource = source;
  let threadOrderId = orderId;
  if (source === "shop_orders") {
    const linkedOperationalOrderId = await findOperationalOrderForShopOrder(order, orderId);
    if (linkedOperationalOrderId) {
      threadSource = "orders";
      threadOrderId = linkedOperationalOrderId;
    }
  }

  return {
    ok: true as const,
    staff,
    order,
    customerUserId,
    threadSource,
    threadOrderId,
    key: orderKey(threadSource),
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
    const resolved = await resolveConversationContext(source, orderId, requester);
    if (!resolved.ok) return resolved.response;

    const db = supabaseAdmin();
    const { data: conversation, error: conversationError } = await db
      .from("order_conversations")
      .select("id, customer_user_id, last_message_at")
      .eq(resolved.key, resolved.threadOrderId)
      .maybeSingle<{ id: string; customer_user_id: string; last_message_at: string | null }>();

    if (conversationError) {
      console.error("[order-threads] conversation lookup failed", conversationError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json({ conversation: null, messages: [], canMessage: true });
    }

    if (conversation.customer_user_id !== resolved.customerUserId) {
      console.error("[order-threads] customer mismatch for order thread", { orderId, source });
      return NextResponse.json({ error: "conversation_owner_mismatch" }, { status: 409 });
    }

    const readColumn = resolved.staff ? "admin_last_read_at" : "customer_last_read_at";
    await db
      .from("order_conversations")
      .update({ [readColumn]: new Date().toISOString() })
      .eq("id", conversation.id);

    const { data: messages, error: messagesError } = await db
      .from("order_messages")
      .select("id, conversation_id, sender_user_id, sender_role, sender_email, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (messagesError) {
      console.error("[order-threads] messages lookup failed", messagesError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages: (messages ?? []).reverse(),
      canMessage: true,
    });
  } catch (error) {
    console.error("[order-threads] GET failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const guardResponse = await guardWriteOperation(req);
  if (guardResponse) return guardResponse;

  const token = parseBearerToken(req.headers);
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 });

  const requester = await getUserFromToken(token);
  if (!requester) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const json = await req.json().catch(() => null) as { source?: unknown; body?: unknown } | null;
  const source = parseSource(typeof json?.source === "string" ? json.source : null);
  if (!source) return NextResponse.json({ error: "invalid_source" }, { status: 400 });

  const body = typeof json?.body === "string" ? json.body.trim().slice(0, MAX_BODY_CHARS) : "";
  if (!body) return NextResponse.json({ error: "missing_body" }, { status: 400 });

  const { orderId } = await context.params;
  if (!isUuid(orderId)) return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });

  try {
    const resolved = await resolveConversationContext(source, orderId, requester);
    if (!resolved.ok) return resolved.response;

    const db = supabaseAdmin();
    const { data: existingConversation, error: conversationLookupError } = await db
      .from("order_conversations")
      .select("id, customer_user_id")
      .eq(resolved.key, orderId)
      .maybeSingle<{ id: string; customer_user_id: string }>();

    if (conversationLookupError) {
      console.error("[order-threads] conversation lookup failed", conversationLookupError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    let conversationId = existingConversation?.id ?? null;

    if (existingConversation && existingConversation.customer_user_id !== resolved.customerUserId) {
      console.error("[order-threads] refusing thread owner mismatch", { orderId, source });
      return NextResponse.json({ error: "conversation_owner_mismatch" }, { status: 409 });
    }

    if (!conversationId) {
      const insertPayload = {
        [resolved.key]: resolved.threadOrderId,
        customer_user_id: resolved.customerUserId,
      };
      const { data: created, error: createError } = await db
        .from("order_conversations")
        .insert(insertPayload)
        .select("id, customer_user_id")
        .single<{ id: string; customer_user_id: string }>();

      if (createError) {
        // A simultaneous first message can race the unique per-order index.
        const { data: raced } = await db
          .from("order_conversations")
          .select("id, customer_user_id")
          .eq(resolved.key, orderId)
          .maybeSingle<{ id: string; customer_user_id: string }>();

        if (!raced || raced.customer_user_id !== resolved.customerUserId) {
          console.error("[order-threads] conversation create failed", createError);
          return NextResponse.json({ error: "server_error" }, { status: 500 });
        }
        conversationId = raced.id;
      } else {
        conversationId = created.id;
      }
    }

    const { data: message, error: messageError } = await db
      .from("order_messages")
      .insert({
        conversation_id: conversationId,
        sender_user_id: requester.id,
        sender_role: resolved.staff ? "admin" : "customer",
        sender_email: requester.email,
        body,
      })
      .select("id, conversation_id, sender_user_id, sender_role, sender_email, body, created_at")
      .single();

    if (messageError || !message) {
      console.error("[order-threads] message insert failed", messageError);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const readColumn = resolved.staff ? "admin_last_read_at" : "customer_last_read_at";
    const { error: updateError } = await db
      .from("order_conversations")
      .update({
        last_message_at: now,
        updated_at: now,
        [readColumn]: now,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.warn("[order-threads] message saved but conversation timestamp update failed", updateError);
    }

    return NextResponse.json({ ok: true, message }, { status: 201 });
  } catch (error) {
    console.error("[order-threads] POST failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

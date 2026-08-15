import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, isAdminEmail, isEditorEmail, parseBearerToken } from "@/lib/auth";
import { sendTelegramMessage } from "@/lib/telegram";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type DispatchBody = {
  coordinatesText?: string;
  photoUrl?: string;
  description?: string;
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

export async function POST(req: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireAdminOrEditor(req);
  if (!auth.ok) return auth.response;

  const { orderId } = await context.params;
  const body = (await req.json().catch(() => ({}))) as DispatchBody;

  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramToken) {
    return NextResponse.json({ error: "telegram_not_configured" }, { status: 503 });
  }

  const { data: order, error: orderError } = await supabaseAdmin()
    .from("orders")
    .select("id, status, telegram_chat_id, product_id, amount, currency")
    .eq("id", orderId)
    .maybeSingle<{
      id: string;
      status: string;
      telegram_chat_id: string | null;
      product_id: string;
      amount: number;
      currency: string;
    }>();

  if (orderError) {
    console.error("[admin.orders.dispatch] order lookup error", orderError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!order.telegram_chat_id) {
    return NextResponse.json({ error: "missing_telegram_chat_id" }, { status: 400 });
  }

  const coordinatesText = (body.coordinatesText ?? "").trim();
  const description = (body.description ?? "").trim();
  const photoUrl = (body.photoUrl ?? "").trim();

  if (!coordinatesText || !description) {
    return NextResponse.json({ error: "coordinates_and_description_required" }, { status: 400 });
  }

  const messageLines = [
    "[DROP_DISPATCH]",
    "A csomag elrejtve, indulhat az átvétel.",
    `Rendelés: ${order.id}`,
    `Csomag: ${order.product_id}`,
    `Összeg: ${order.amount} ${(order.currency || "huf").toUpperCase()}`,
    "",
    `Koordináták: ${coordinatesText}`,
    `Leírás: ${description}`,
  ];

  if (photoUrl) {
    messageLines.push(`Fotó: ${photoUrl}`);
  }

  try {
    await sendTelegramMessage({
      token: telegramToken,
      chatId: order.telegram_chat_id,
      text: messageLines.join("\n"),
    });
  } catch (error) {
    console.error("[admin.orders.dispatch] telegram send failed", error);

    await supabaseAdmin().from("order_fulfillment_events").insert({
      order_id: order.id,
      event_type: "dispatch_send_failed",
      actor_email: auth.requester.email,
      payload: {
        error: error instanceof Error ? error.message : "telegram_send_failed",
        coordinatesText,
        description,
        photoUrl: photoUrl || null,
      },
    });

    return NextResponse.json({ error: "telegram_send_failed" }, { status: 502 });
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin()
    .from("orders")
    .update({
      status: "dispatched",
      dispatch_sent_at: now,
      dispatch_photo_url: photoUrl || null,
      delivery_note: description,
      dispatch_coordinates: { text: coordinatesText },
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("[admin.orders.dispatch] order update failed", updateError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await supabaseAdmin().from("order_fulfillment_events").insert({
    order_id: order.id,
    event_type: "dispatch_sent",
    actor_email: auth.requester.email,
    payload: {
      coordinatesText,
      description,
      photoUrl: photoUrl || null,
      sentAt: now,
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id, sentAt: now });
}

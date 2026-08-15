import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { CATALOG } from "@/config/catalog";
import { hashTelegramId } from "@/lib/security/hash";
import { validateTelegramInitData } from "@/lib/security/telegram";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { SupabaseClient } from "@supabase/supabase-js";

type CreateIntentBody = {
  initData?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

function getProduct(productId: string) {
  const product = CATALOG[productId];
  if (!product || !product.active) return null;
  return product;
}

type NormalizedItem = {
  productId: string;
  quantity: number;
};

function extractMissingColumn(errorMessage: string | undefined): string | null {
  if (!errorMessage) return null;
  const match = errorMessage.match(/Could not find the '([^']+)' column/);
  return match?.[1] ?? null;
}

async function insertOrderWithSchemaFallback(
  db: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const candidatePayload: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await db.from("orders").insert(candidatePayload);
    if (!error) return { ok: true };

    console.error("[telegram.create-intent] order insert attempt failed", {
      attempt: attempt + 1,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payloadKeys: Object.keys(candidatePayload),
    });

    if (error.code !== "PGRST204") {
      break;
    }

    const missingColumn = extractMissingColumn(error.message);
    if (!missingColumn || !(missingColumn in candidatePayload)) {
      break;
    }

    delete candidatePayload[missingColumn];
  }

  return { ok: false };
}

function normalizeItems(items: CreateIntentBody["items"]): NormalizedItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("empty_cart");
  }

  const merged = new Map<string, number>();

  for (const item of items) {
    const productId = String(item?.productId ?? "").trim();
    const quantity = Number.parseInt(String(item?.quantity ?? ""), 10);

    if (!productId) throw new Error("invalid_product_id");
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error("invalid_quantity");

    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as CreateIntentBody;
    const rawInitData = String(body.initData ?? "").trim();

    let telegramUserId: number;
    let telegramAuthDate: number;
    let telegramQueryId = "";
    let isDevBypass = false;

    if (rawInitData) {
      const validation = validateTelegramInitData(rawInitData);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 401 });
      }

      telegramUserId = validation.payload.user.id;
      telegramAuthDate = validation.payload.authDate;
      telegramQueryId = validation.payload.queryId ?? "";
    } else if (process.env.NODE_ENV !== "production") {
      const fallbackUserIdRaw = Number.parseInt(process.env.TELEGRAM_DEV_USER_ID ?? "900000001", 10);
      telegramUserId = Number.isFinite(fallbackUserIdRaw) ? fallbackUserIdRaw : 900000001;
      telegramAuthDate = Math.floor(Date.now() / 1000);
      telegramQueryId = "dev-localhost";
      isDevBypass = true;
    } else {
      return NextResponse.json({ error: "missing_init_data" }, { status: 401 });
    }

    const normalizedItems = normalizeItems(body.items);
    const cart = normalizedItems.map((item) => {
      const product = getProduct(item.productId);
      if (!product) {
        throw new Error("product_not_available");
      }
      if (item.quantity < product.minPerOrder) {
        throw new Error(`min_order_not_met:${product.id}:${product.minPerOrder}`);
      }

      const unitAmountMinor = product.priceHuf * 100;
      const lineTotalMinor = unitAmountMinor * item.quantity;

      return {
        product,
        quantity: item.quantity,
        unitAmountMinor,
        lineTotalMinor,
      };
    });

    const totalAmountMinor = cart.reduce((sum, item) => sum + item.lineTotalMinor, 0);
    if (!Number.isFinite(totalAmountMinor) || totalAmountMinor <= 0) {
      return NextResponse.json({ error: "invalid_total_amount" }, { status: 400 });
    }

    const orderId = crypto.randomUUID();
    const cartSummary = cart.map((item) => `${item.product.code} x${item.quantity}`).join(", ");
    const anonymizedUserHash = process.env.HASH_SALT?.trim()
      ? hashTelegramId(String(telegramUserId))
      : `raw_${telegramUserId}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountMinor,
      currency: "huf",
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: "telegram-mini-app",
        order_id: orderId,
        telegram_chat_id: String(telegramUserId),
        telegram_user_id: String(telegramUserId),
        telegram_user_hash: anonymizedUserHash,
        telegram_auth_date: String(telegramAuthDate),
        telegram_query_id: telegramQueryId,
        telegram_init_bypass: isDevBypass ? "1" : "0",
        cart_summary: cartSummary.slice(0, 450),
        item_count: String(cart.length),
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "missing_client_secret" }, { status: 500 });
    }

    let db: SupabaseClient | null = null;
    try {
      db = supabaseAdmin();
    } catch (dbInitError) {
      console.error("[telegram.create-intent] supabase init failed, continuing without order persistence", {
        error: dbInitError instanceof Error ? dbInitError.message : String(dbInitError),
      });
    }

    let orderPersisted = false;

    const fullOrderPayload: Record<string, unknown> = {
      id: orderId,
      user_id: String(telegramUserId),
      stripe_session_id: paymentIntent.id,
      anonymized_user_hash: anonymizedUserHash,
      product_id: cart.length === 1 ? cart[0].product.id : "multi_cart",
      delivery_type: "dead_drop",
      amount: totalAmountMinor,
      currency: paymentIntent.currency,
      status: "pending",
      customer_email: null,
      customer_name: null,
      shipping_address: null,
      metadata: {
        source: "telegram-mini-app",
        cart_summary: cartSummary,
        item_count: cart.length,
      },
    };

    if (db) {
      const fullInsert = await insertOrderWithSchemaFallback(db, fullOrderPayload);
      if (fullInsert.ok) {
        orderPersisted = true;
      } else {
        const minimalFallbackPayload: Record<string, unknown> = {
          id: orderId,
          user_id: String(telegramUserId),
          stripe_session_id: paymentIntent.id,
          product_id: cart.length === 1 ? cart[0].product.id : "multi_cart",
          amount: totalAmountMinor,
          status: "pending",
        };

        const fallbackInsert = await insertOrderWithSchemaFallback(db, minimalFallbackPayload);
        orderPersisted = fallbackInsert.ok;
      }
    }

    if (db && orderPersisted) {
      const { error: itemInsertError } = await db
        .from("order_items")
        .insert(
          cart.map((item) => ({
            order_id: orderId,
            product_id: item.product.id,
            product_code: item.product.code,
            product_name: item.product.name,
            unit_price: item.unitAmountMinor,
            quantity: item.quantity,
            line_total: item.lineTotalMinor,
            metadata: {
              min_per_order: item.product.minPerOrder,
            },
          })),
        );

      if (itemInsertError) {
        console.error("[telegram.create-intent] order_items insert failed", {
          code: itemInsertError.code,
          message: itemInsertError.message,
          details: itemInsertError.details,
          hint: itemInsertError.hint,
        });
      }
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      orderId,
      currency: paymentIntent.currency,
      amount: paymentIntent.amount,
      orderPersisted,
      items: cart.map((item) => ({
        productId: item.product.id,
        code: item.product.code,
        name: item.product.name,
        quantity: item.quantity,
        unitAmountMinor: item.unitAmountMinor,
        lineTotalMinor: item.lineTotalMinor,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "telegram_create_intent_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

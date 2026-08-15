import { NextRequest, NextResponse } from "next/server";

import { CATALOG } from "@/config/catalog";
import { hashTelegramId } from "@/lib/security/hash";
import { validateTelegramInitData } from "@/lib/security/telegram";
import { stripe } from "@/lib/stripe";

type CreateIntentBody = {
  initData?: string;
  productId?: string;
  quantity?: number;
};

function getProduct(productId: string) {
  const product = CATALOG[productId];
  if (!product || !product.active) return null;
  return product;
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

    const productId = String(body.productId ?? "").trim();
    const quantity = Number.parseInt(String(body.quantity ?? ""), 10);
    const product = getProduct(productId);

    if (!product) {
      return NextResponse.json({ error: "product_not_available" }, { status: 400 });
    }

    if (!Number.isFinite(quantity) || quantity < product.minPerOrder) {
      return NextResponse.json({ error: "invalid_quantity" }, { status: 400 });
    }

    const totalAmountHuf = product.priceHuf * quantity;
    const anonymizedUserHash = process.env.HASH_SALT?.trim()
      ? hashTelegramId(String(telegramUserId))
      : `raw_${telegramUserId}`;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountHuf * 100,
      currency: "huf",
      automatic_payment_methods: { enabled: true },
      metadata: {
        source: "telegram-mini-app",
        telegram_chat_id: String(telegramUserId),
        telegram_user_id: String(telegramUserId),
        telegram_user_hash: anonymizedUserHash,
        telegram_auth_date: String(telegramAuthDate),
        telegram_query_id: telegramQueryId,
        telegram_init_bypass: isDevBypass ? "1" : "0",
        telegram_product_id: product.id,
        telegram_product_code: product.code,
        telegram_quantity: String(quantity),
        product_id: product.id,
        product_code: product.code,
        quantity: String(quantity),
      },
    });

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "missing_client_secret" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      currency: paymentIntent.currency,
      amount: paymentIntent.amount,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        priceHuf: product.priceHuf,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "telegram_create_intent_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

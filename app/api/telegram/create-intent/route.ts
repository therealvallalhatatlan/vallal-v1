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
    const validation = validateTelegramInitData(body.initData ?? "");

    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
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
    const telegramUserId = validation.payload.user.id;
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
        telegram_auth_date: String(validation.payload.authDate),
        telegram_query_id: validation.payload.queryId ?? "",
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

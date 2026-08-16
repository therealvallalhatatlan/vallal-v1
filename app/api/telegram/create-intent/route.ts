import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";

import { CATALOG } from "@/config/catalog";
import { validateTelegramInitData } from "@/lib/security/telegram";
import {
  buildRevolutPaymentUrl,
  createPendingOrder,
  getRevolutRevtag,
} from "@/lib/telegram/revolutPendingOrders";

type CreateIntentBody = {
  initData?: string;
  items?: Array<{
    productId?: string;
    quantity?: number;
  }>;
};

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = telegramBotToken ? new TelegramBot(telegramBotToken) : null;

function getProduct(productId: string) {
  const product = CATALOG[productId];
  if (!product || !product.active) return null;
  return product;
}

type NormalizedItem = {
  productId: string;
  quantity: number;
};

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
  if (!telegramBotToken || !bot) {
    return NextResponse.json({ error: "missing_telegram_bot_token" }, { status: 503 });
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
    const totalAmountHuf = Math.floor(totalAmountMinor / 100);
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartSummary = cart.map((item) => `${item.product.code} x${item.quantity}`).join(", ");
    const pending = createPendingOrder({
      buyerChatId: telegramUserId,
      buyerTelegramUserId: telegramUserId,
      buyerUsername: null,
      productId: cart.length === 1 ? cart[0].product.id : "multi_cart",
      productCode: cart.length === 1 ? cart[0].product.code : "MULTI",
      productName: cart.length === 1 ? cart[0].product.name : `Tobb tetel: ${cartSummary.slice(0, 120)}`,
      quantity: totalQuantity,
      totalAmountHuf,
    });
    const paymentUrl = buildRevolutPaymentUrl(totalAmountHuf, pending.ref);
    const revtag = getRevolutRevtag();

    const notifyLines = [
      "<b>[PAYMENT_INIT_MINIAPP]</b>",
      "",
      `<b>Termek:</b> ${cartSummary}`,
      `<b>Mennyiseg:</b> ${totalQuantity} db`,
      `<b>Osszeg:</b> ${totalAmountHuf.toLocaleString("hu-HU")} HUF`,
      "",
      `<b>Revtag:</b> <code>${revtag}</code>`,
      `<b>Revolut Pro link:</b> <a href=\"${paymentUrl}\">${paymentUrl}</a>`,
      "",
      `<b>A megjegyzes rovatba ird ezt:</b> <code>${pending.ref}</code>`,
      "Fizetes utan nyomd meg a FIZETTEM gombot.",
    ];

    try {
      await bot.sendMessage(
        telegramUserId,
        notifyLines.join("\n"),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💸 OPEN REVOLUT", url: paymentUrl }],
              [{ text: "📋 REFERENCE KOD UJRA", callback_data: `showref:${pending.ref}` }],
              [{ text: "✅ I HAVE PAID / FIZETTEM", callback_data: `verify:${pending.ref}` }],
            ],
          },
        },
      );
    } catch (notifyError) {
      console.error("[telegram.create-intent] failed_to_send_buyer_message", {
        telegramUserId,
        ref: pending.ref,
        isDevBypass,
        error: notifyError instanceof Error ? notifyError.message : String(notifyError),
      });

      if (!isDevBypass) {
        return NextResponse.json({ error: "failed_to_send_telegram_instruction" }, { status: 502 });
      }
    }

    return NextResponse.json({
      ok: true,
      ref: pending.ref,
      paymentUrl,
      revtag,
      totalAmountHuf,
      checkoutLabel: cartSummary,
      buyerChatId: telegramUserId,
      telegramAuthDate,
      telegramQueryId,
      items: cart.map((item) => ({
        productId: item.product.id,
        code: item.product.code,
        name: item.product.name,
        quantity: item.quantity,
        unitAmountHuf: Math.floor(item.unitAmountMinor / 100),
        lineTotalHuf: Math.floor(item.lineTotalMinor / 100),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "telegram_create_revolut_instruction_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

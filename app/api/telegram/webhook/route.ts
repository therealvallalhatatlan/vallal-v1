import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";

import { CATALOG, type Product } from "@/config/catalog";
import { getTelegramMiniAppUrl } from "@/lib/security/telegram";

type TelegramUser = {
  id: number;
  username?: string;
};

type TelegramChat = {
  id: number;
};

type TelegramWebAppInfo = {
  url: string;
};

type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
};

type TelegramCallbackQuery = {
  id: string;
  from: TelegramUser;
  message?: {
    message_id: number;
    chat: TelegramChat;
  };
  data?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

type PendingOrderStatus = "created" | "pending_verification" | "approved" | "rejected";

type PendingOrder = {
  ref: string;
  createdAt: number;
  buyerChatId: number;
  buyerTelegramUserId: number;
  buyerUsername: string | null;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalAmountHuf: number;
  status: PendingOrderStatus;
};

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
const adminDashboardPin = process.env.ADMIN_DASHBOARD_PIN;

const revtag = "@c2node";
const revolutBaseUrl = "https://revolut.me/c2node";
const pendingOrderTtlMs = 24 * 60 * 60 * 1000;

const bot = telegramBotToken ? new TelegramBot(telegramBotToken) : null;
const pendingOrders = new Map<string, PendingOrder>();

function getActiveProducts(): Product[] {
  return Object.values(CATALOG).filter((item) => item.active);
}

function findActiveProductById(productId: string): Product | null {
  const product = CATALOG[productId];
  if (!product || !product.active) return null;
  return product;
}

function parseCommand(text: string | undefined): string | null {
  if (!text) return null;
  const normalized = text.trim();
  if (!normalized.startsWith("/")) return null;
  return normalized.split(" ")[0]?.toLowerCase() ?? null;
}

function toBuyCallback(productId: string): string {
  return `buy:${productId}`;
}

function toQtyCallback(productId: string, count: number): string {
  return `qty:${productId}:${count}`;
}

function parseBuyCallback(payload: string | undefined): { productId: string } | null {
  if (!payload || !payload.startsWith("buy:")) return null;
  const productId = payload.slice(4).trim();
  if (!productId) return null;
  return { productId };
}

function parseQtyCallback(payload: string | undefined): { productId: string; count: number } | null {
  if (!payload || !payload.startsWith("qty:")) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null;

  const productId = (parts[1] ?? "").trim();
  const count = Number.parseInt(parts[2] ?? "", 10);
  if (!productId || !Number.isFinite(count) || count < 1) return null;

  return { productId, count };
}

function parseVerifyCallback(payload: string | undefined): { ref: string } | null {
  if (!payload || !payload.startsWith("verify:")) return null;
  const ref = payload.slice(7).trim();
  if (!ref) return null;
  return { ref };
}

function parseApproveCallback(payload: string | undefined): { buyerChatId: number; ref: string } | null {
  if (!payload || !payload.startsWith("approve:")) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null;

  const buyerChatId = Number.parseInt(parts[1] ?? "", 10);
  const ref = (parts[2] ?? "").trim();
  if (!Number.isFinite(buyerChatId) || !ref) return null;

  return { buyerChatId, ref };
}

function parseRejectCallback(payload: string | undefined): { buyerChatId: number; ref: string } | null {
  if (!payload || !payload.startsWith("reject:")) return null;
  const parts = payload.split(":");
  if (parts.length !== 3) return null;

  const buyerChatId = Number.parseInt(parts[1] ?? "", 10);
  const ref = (parts[2] ?? "").trim();
  if (!Number.isFinite(buyerChatId) || !ref) return null;

  return { buyerChatId, ref };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cleanupExpiredPendingOrders(now = Date.now()) {
  for (const [ref, order] of pendingOrders.entries()) {
    if (now - order.createdAt > pendingOrderTtlMs) {
      pendingOrders.delete(ref);
    }
  }
}

function generateReferenceCode(): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const numericPart = String(Math.floor(100000 + Math.random() * 900000));
    const ref = `REF-#${numericPart}`;
    if (!pendingOrders.has(ref)) {
      return ref;
    }
  }

  const fallback = `REF-#${String(Date.now()).slice(-6)}`;
  if (!pendingOrders.has(fallback)) return fallback;

  throw new Error("reference_generation_failed");
}

function buildRevolutPaymentUrl(amountHuf: number, ref: string): string {
  const params = new URLSearchParams({
    amount: String(amountHuf),
    currency: "HUF",
    note: ref,
  });
  return `${revolutBaseUrl}?${params.toString()}`;
}

function buildCatalogKeyboard(items: Product[]) {
  return items.map((item) => [
    {
      text: `${item.code} - ${item.priceHuf.toLocaleString("hu-HU")} HUF`,
      callback_data: toBuyCallback(item.id),
    },
  ]);
}

function buildQuantityKeyboard(product: Product) {
  const quantityButtons = Array.from({ length: 5 }, (_, idx) => {
    const count = product.minPerOrder + idx;
    return {
      text: `x${count}`,
      callback_data: toQtyCallback(product.id, count),
    };
  });

  return {
    inline_keyboard: [quantityButtons, [{ text: "Back", callback_data: "back_to_menu" }]],
  };
}

function buildMiniAppKeyboard() {
  return {
    inline_keyboard: [[{
      text: "⚡ MEGNYITÁS A MINIAU-BAN",
      web_app: { url: getTelegramMiniAppUrl() } satisfies TelegramWebAppInfo,
    }]],
  };
}

async function sendMiniAppLaunchMessage(chatId: number, reason: string) {
  if (!bot) return;

  await bot.sendMessage(chatId, reason, {
    parse_mode: "HTML",
    reply_markup: buildMiniAppKeyboard(),
  });
}

async function sendCatalogMenu(chatId: number) {
  if (!bot) return;
  const activeProducts = getActiveProducts();

  if (activeProducts.length === 0) {
    await bot.sendMessage(
      chatId,
      "Jelenleg nincs aktív csomag a piacon. Kérlek próbáld meg később újra.",
      { parse_mode: "HTML" },
    );
    return;
  }

  await bot.sendMessage(
    chatId,
    "Üdvözöllek a piacon. Válassz az alábbi elérhető csomagok közül a rendelés megkezdéséhez:",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buildCatalogKeyboard(activeProducts),
      },
    },
  );
}

async function handleMessage(update: TelegramUpdate) {
  if (!bot) return;
  const message = update.message;
  if (!message?.text) return;

  const command = parseCommand(message.text);

  const validCommands = ["/start", "/bolt", "/segitseg", "/merch"];
  if (!command || !validCommands.includes(command)) return;

  if (command === "/segitseg") {
    await bot.sendMessage(
      message.chat.id,
      "Elérhető parancsok:\n/start - Mini App megnyitása\n/bolt - Mini App megnyitása\n/segitseg - Súgó",
      { parse_mode: "HTML" },
    );
    return;
  }

  if (command === "/start" || command === "/bolt") {
    await sendMiniAppLaunchMessage(
      message.chat.id,
      command === "/start"
        ? "Kapcsolódás sikeres. Megnyitom a Miniaut..."
        : "⚡ A Mini App közvetlen belépési pontja itt van.",
    );
    return;
  }

  await sendCatalogMenu(message.chat.id);
}

async function handleCallbackQuery(update: TelegramUpdate) {
  if (!bot) return;
  cleanupExpiredPendingOrders();

  const callbackQuery = update.callback_query;
  if (!callbackQuery) return;
  const callbackQueryId = callbackQuery.id;

  const chatId = callbackQuery.message?.chat.id;
  if (!chatId) {
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "[SYS_ERR] Missing channel reference.",
      show_alert: true,
    });
    return;
  }

  const payload = callbackQuery.data;

  if (payload === "back_to_menu") {
    await sendCatalogMenu(chatId);
    await bot.answerCallbackQuery(callbackQueryId, {
      text: "Menü visszaállítva.",
      show_alert: false,
    });
    return;
  }

  const buyAction = parseBuyCallback(payload);
  if (buyAction) {
    const product = findActiveProductById(buyAction.productId);
    if (!product) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "A kiválasztott csomag nem elérhető.",
        show_alert: true,
      });
      return;
    }

    await bot.sendMessage(
      chatId,
      `Válaszd ki a mennyiséget ehhez: ${product.name} (${product.code}). Minimum rendelés: ${product.minPerOrder} db.`,
      {
        parse_mode: "HTML",
        reply_markup: buildQuantityKeyboard(product),
      },
    );

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "Mennyiség kiválasztása...",
      show_alert: false,
    });
    return;
  }

  const qtyAction = parseQtyCallback(payload);
  if (qtyAction) {
    const product = findActiveProductById(qtyAction.productId);
    if (!product) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "A kiválasztott csomag nem elérhető.",
        show_alert: true,
      });
      return;
    }

    if (qtyAction.count < product.minPerOrder) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: `A minimális rendelési mennyiség: ${product.minPerOrder}.`,
        show_alert: true,
      });
      return;
    }

    try {
      const ref = generateReferenceCode();
      const totalAmountHuf = product.priceHuf * qtyAction.count;
      const paymentUrl = buildRevolutPaymentUrl(totalAmountHuf, ref);

      pendingOrders.set(ref, {
        ref,
        createdAt: Date.now(),
        buyerChatId: chatId,
        buyerTelegramUserId: callbackQuery.from.id,
        buyerUsername: callbackQuery.from.username ?? null,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: qtyAction.count,
        totalAmountHuf,
        status: "created",
      });

      await bot.sendMessage(
        chatId,
        [
          "<b>[NODE_PAYMENT_INIT]</b>",
          "",
          `<b>Termék:</b> ${escapeHtml(product.name)} (${escapeHtml(product.code)})`,
          `<b>Mennyiség:</b> ${qtyAction.count} db`,
          `<b>Összeg:</b> ${totalAmountHuf.toLocaleString("hu-HU")} HUF`,
          "",
          `<b>Revtag:</b> <code>${escapeHtml(revtag)}</code>`,
          `<b>Revolut Pro link:</b> <a href="${escapeHtml(paymentUrl)}">${escapeHtml(paymentUrl)}</a>`,
          "",
          `<b>Kötelező megjegyzés / NOTE:</b> <code>${escapeHtml(ref)}</code>`,
          "<b>FONTOS:</b> A fenti referencia kód pontos beírása a Revolut utalás megjegyzésébe KÖTELEZŐ.",
        ].join("\n"),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "💸 OPEN REVOLUT", url: paymentUrl }],
              [{ text: "✅ I HAVE PAID / FIZETTEM", callback_data: `verify:${ref}` }],
            ],
          },
        },
      );

      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Revolut fizetési instrukció elkészült.",
        show_alert: false,
      });
      return;
    } catch (paymentError) {
      const errorMessage = paymentError instanceof Error ? paymentError.message : "revolut_instruction_failed";
      console.error("[telegram.webhook] revolut_instruction_failed", { error: errorMessage });

      await bot.answerCallbackQuery(callbackQueryId, {
        text: "A Revolut fizetési instrukció létrehozása sikertelen.",
        show_alert: true,
      });
      return;
    }
  }

  const verifyAction = parseVerifyCallback(payload);
  if (verifyAction) {
    const pending = pendingOrders.get(verifyAction.ref);
    if (!pending) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Ismeretlen vagy lejárt referencia.",
        show_alert: true,
      });
      return;
    }

    if (pending.buyerChatId !== chatId) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Ez a referencia nem ehhez a csatornához tartozik.",
        show_alert: true,
      });
      return;
    }

    if (pending.status !== "created" && pending.status !== "pending_verification") {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: `Státusz: ${pending.status}`,
        show_alert: false,
      });
      return;
    }

    pending.status = "pending_verification";
    pendingOrders.set(pending.ref, pending);

    await bot.sendMessage(
      pending.buyerChatId,
      "<b>[PENDING_VERIFICATION]</b> Order logged. Awaiting node operator confirmation...",
      { parse_mode: "HTML" },
    );

    if (telegramAdminChatId) {
      const buyerIdentity = pending.buyerUsername
        ? `@${escapeHtml(pending.buyerUsername)} (${pending.buyerChatId})`
        : String(pending.buyerChatId);

      await bot.sendMessage(
        telegramAdminChatId,
        [
          "<b>[ADMIN_PAYMENT_VERIFY]</b>",
          "",
          `<b>Buyer:</b> ${buyerIdentity}`,
          `<b>Product:</b> ${escapeHtml(pending.productName)} (${escapeHtml(pending.productCode)})`,
          `<b>Qty:</b> ${pending.quantity}`,
          `<b>Amount:</b> ${pending.totalAmountHuf.toLocaleString("hu-HU")} HUF`,
          `<b>Reference:</b> <code>${escapeHtml(pending.ref)}</code>`,
        ].join("\n"),
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [[
              { text: "🔓 APPROVE", callback_data: `approve:${pending.buyerChatId}:${pending.ref}` },
              { text: "❌ REJECT", callback_data: `reject:${pending.buyerChatId}:${pending.ref}` },
            ]],
          },
        },
      );
    } else {
      console.error("[telegram.webhook] missing_telegram_admin_chat_id", {
        ref: pending.ref,
        buyerChatId: pending.buyerChatId,
      });
    }

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "Ellenőrzésre továbbítva.",
      show_alert: false,
    });
    return;
  }

  const approveAction = parseApproveCallback(payload);
  if (approveAction) {
    const pending = pendingOrders.get(approveAction.ref);
    if (!pending || pending.buyerChatId !== approveAction.buyerChatId) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "A referencia nem található.",
        show_alert: true,
      });
      return;
    }

    if (pending.status === "approved") {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Már jóváhagyva.",
        show_alert: false,
      });
      return;
    }

    if (pending.status === "rejected") {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Már elutasítva.",
        show_alert: true,
      });
      return;
    }

    pending.status = "approved";
    pendingOrders.set(pending.ref, pending);

    const pinValue = adminDashboardPin?.trim() || "PIN_UNAVAILABLE";

    await bot.sendMessage(
      pending.buyerChatId,
      [
        "<b>[ACCESS_GRANTED]</b>",
        "",
        "Fizetés megerősítve. A hozzáférési PIN:",
        `<code>${escapeHtml(pinValue)}</code>`,
      ].join("\n"),
      { parse_mode: "HTML" },
    );

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "Jóváhagyva és kiküldve.",
      show_alert: false,
    });
    return;
  }

  const rejectAction = parseRejectCallback(payload);
  if (rejectAction) {
    const pending = pendingOrders.get(rejectAction.ref);
    if (!pending || pending.buyerChatId !== rejectAction.buyerChatId) {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "A referencia nem található.",
        show_alert: true,
      });
      return;
    }

    if (pending.status === "rejected") {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Már elutasítva.",
        show_alert: false,
      });
      return;
    }

    if (pending.status === "approved") {
      await bot.answerCallbackQuery(callbackQueryId, {
        text: "Már jóváhagyott tétel.",
        show_alert: true,
      });
      return;
    }

    pending.status = "rejected";
    pendingOrders.set(pending.ref, pending);

    await bot.sendMessage(
      pending.buyerChatId,
      [
        "<b>[TRANSACT_FAILED]</b>",
        "",
        "Köszönjük a jelzést. A megadott fizetési referencia jelenleg nem található.",
        "Kérlek ellenőrizd a megjegyzés mezőt, vagy vedd fel velünk a kapcsolatot.",
      ].join("\n"),
      { parse_mode: "HTML" },
    );

    await bot.answerCallbackQuery(callbackQueryId, {
      text: "Elutasítva és visszajelezve.",
      show_alert: false,
    });
    return;
  }

  await bot.answerCallbackQuery(callbackQueryId, {
    text: "Ismeretlen művelet.",
    show_alert: false,
  });
}

export async function POST(req: NextRequest) {
  if (!telegramBotToken) {
    return NextResponse.json({ ok: true, skipped: "missing_telegram_bot_token" });
  }

  if (!bot) {
    return NextResponse.json({ ok: true, skipped: "missing_telegram_bot_token" });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;
    console.log("[telegram.webhook] update received", {
      hasMessage: Boolean(update.message),
      hasCallbackQuery: Boolean(update.callback_query),
    });

    if (update.message) {
      await handleMessage(update);
    }

    if (update.callback_query) {
      await handleCallbackQuery(update);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unexpected_error";
    console.error("[telegram.webhook] unexpected_error", { error: errorMessage });
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    system: "C2 TERMINAL",
    time: new Date().toISOString(),
  });
}

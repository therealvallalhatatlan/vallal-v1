import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";

import { CATALOG, type Product } from "@/config/catalog";
import { hashTelegramId } from "@/lib/security/hash";
import { getTelegramMiniAppUrl } from "@/lib/security/telegram";
import { getSiteUrl } from "@/lib/stripe";

type TelegramUser = {
    id: number;
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

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const hasHashSalt = Boolean(process.env.HASH_SALT && process.env.HASH_SALT.trim());

const stripe = stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: "2025-07-30.basil" })
    : null;
const bot = telegramBotToken ? new TelegramBot(telegramBotToken) : null;

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

    await bot.sendMessage(
        chatId,
        reason,
        {
            parse_mode: "HTML",
            reply_markup: buildMiniAppKeyboard(),
        },
    );
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

async function createTelegramCheckout(input: {
    chatId: number;
    telegramUserId: number;
    product: Product;
    count: number;
}): Promise<{ sessionId: string; url: string; totalAmountHuf: number }> {
    if (!stripe) {
        throw new Error("stripe_not_configured");
    }

    const siteUrl = getSiteUrl();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
    
    // Hash hashTelegramId fallback, ha hiányozna a salt
    const rawUserId = String(input.telegramUserId);
    const anonymizedUserHash = hasHashSalt 
        ? hashTelegramId(rawUserId) 
        : `raw_${rawUserId}`;

    const totalAmountHuf = input.product.priceHuf * input.count;

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
            {
                price: input.product.stripePriceId,
                quantity: input.count,
            },
        ],
        success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/cancelled?src=telegram`,
        expires_at: expiresAt,
        shipping_address_collection: { allowed_countries: ["HU"] },
        metadata: {
            telegram_chat_id: String(input.chatId),
            product_id: input.product.id,
            quantity: String(input.count),
            anonymized_user_hash: anonymizedUserHash,
        },
    });

    if (!session.url) {
        throw new Error("missing_checkout_url");
    }

    return {
        sessionId: session.id,
        url: session.url,
        totalAmountHuf,
    };
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
            { parse_mode: "HTML" }
        );
        return;
    }

    if (command === "/start" || command === "/bolt") {
        await sendMiniAppLaunchMessage(
            message.chat.id,
            command === "/start"
                ? "Kapcsolódás sikeres. Megnyitom a Miniaut..."
                : "⚡ A Mini App közvetlen belépési pontja itt van."
        );
        return;
    }

    await sendCatalogMenu(message.chat.id);
}

async function handleCallbackQuery(update: TelegramUpdate) {
    if (!bot) return;
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
    if (!qtyAction) {
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "Ismeretlen művelet.",
            show_alert: false,
        });
        return;
    }

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
        const session = await createTelegramCheckout({
            chatId,
            telegramUserId: callbackQuery.from.id,
            product,
            count: qtyAction.count,
        });

        await bot.sendMessage(
            chatId,
            `Rendelés összesítés:\n• Csomag: ${product.name} (${product.code})\n• Mennyiség: ${qtyAction.count} db\n• Végösszeg: ${session.totalAmountHuf.toLocaleString("hu-HU")} HUF\n\nA fizetéshez nyisd meg az alábbi linket:`,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Stripe Checkout", url: session.url }]],
                },
            },
        );

        await bot.answerCallbackQuery(callbackQueryId, {
            text: "Fizetési link elkészült.",
            show_alert: false,
        });
    } catch (checkoutError) {
        const errorMessage = checkoutError instanceof Error ? checkoutError.message : "checkout_failed";
        console.error("[telegram.webhook] checkout_create_failed", { error: errorMessage });
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "A fizetési link létrehozása sikertelen.",
            show_alert: true,
        });
    }
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
    system: "VÁLLALHATATLAN C2 TERMINAL", 
    time: new Date().toISOString() 
  });
}
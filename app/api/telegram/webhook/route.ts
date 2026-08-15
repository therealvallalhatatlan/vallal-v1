import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import TelegramBot from "node-telegram-bot-api";

import { CATALOG, type Product } from "@/config/catalog";
import { hashTelegramId } from "@/lib/security/hash";
import { getSiteUrl } from "@/lib/stripe";
import { formatTerminalTelegramMessage } from "@/lib/telegram";

type TelegramUser = {
    id: number;
};

type TelegramChat = {
    id: number;
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
    const quantityButtons = Array.from({ length: product.maxPerOrder }, (_, idx) => ({
        text: `x${idx + 1}`,
        callback_data: toQtyCallback(product.id, idx + 1),
    }));

    return {
        inline_keyboard: [quantityButtons, [{ text: "Back", callback_data: "back_to_menu" }]],
    };
}

async function sendCatalogMenu(chatId: number) {
    if (!bot) return;
    const activeProducts = getActiveProducts();

    if (activeProducts.length === 0) {
        await bot.sendMessage(
            chatId,
            formatTerminalTelegramMessage({
                statuses: ["SYSTEM_OVERRIDE", "CATALOG_EMPTY"],
                lines: ["No active catalog entities.", "Retry /bolt after uplink refresh."],
            }),
            { parse_mode: "HTML" },
        );
        return;
    }

    await bot.sendMessage(
        chatId,
        formatTerminalTelegramMessage({
            statuses: ["SYSTEM_OVERRIDE", "CATALOG_RENDER"],
            lines: [
                "Select a package node.",
                "Quantity selection occurs in the next step.",
            ],
        }),
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

    // KIBŐVÍTETT PARANCSKÉSZLET (/bolt, /segitseg, /merch, /start)
    const validCommands = ["/start", "/merch", "/bolt", "/segitseg"];
    if (!command || !validCommands.includes(command)) return;

    if (command === "/segitseg") {
        await bot.sendMessage(
            message.chat.id,
            formatTerminalTelegramMessage({
                statuses: ["SYSTEM_HELP", "UPLINK_INFO"],
                lines: [
                    "VÁLLALHATATLAN C2 TERMINAL v1.0",
                    "Azonosítás: Anonim csatorna.",
                    "",
                    "Elérhető parancsok:",
                    "/bolt - Katalógus és adatcsomagok kérése",
                    "/start - Rendszer újraindítása",
                    "/segitseg - Terminiál súgó leírása",
                ],
            }),
            { parse_mode: "HTML" }
        );
        return;
    }

    if (command === "/start") {
        await bot.sendMessage(
            message.chat.id,
            formatTerminalTelegramMessage({
                statuses: ["SYSTEM_OVERRIDE", "BOOT_SEQUENCE"],
                lines: ["Node terminal link active.", "System command accepted. Executing /bolt..."],
            }),
            { parse_mode: "HTML" },
        );
    }

    // A /start, /merch és /bolt mind kirakják a katalógust
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
            text: "[SYSTEM_OVERRIDE] Menu restored.",
            show_alert: false,
        });
        return;
    }

    const buyAction = parseBuyCallback(payload);
    if (buyAction) {
        const product = findActiveProductById(buyAction.productId);
        if (!product) {
            await bot.answerCallbackQuery(callbackQueryId, {
                text: "[SYS_WARN] Product unavailable.",
                show_alert: true,
            });
            return;
        }

        await bot.sendMessage(
            chatId,
            formatTerminalTelegramMessage({
                statuses: ["SYS_QUANTITY_SELECT", "SYSTEM_OVERRIDE"],
                lines: [
                    `Code: ${product.code}`,
                    `Name: ${product.name}`,
                    `Max per order: ${product.maxPerOrder}`,
                ],
            }),
            {
                parse_mode: "HTML",
                reply_markup: buildQuantityKeyboard(product),
            },
        );

        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_QUANTITY_SELECT] Choose amount.",
            show_alert: false,
        });
        return;
    }

    const qtyAction = parseQtyCallback(payload);
    if (!qtyAction) {
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_WARN] Unknown operation.",
            show_alert: false,
        });
        return;
    }

    const product = findActiveProductById(qtyAction.productId);
    if (!product) {
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_WARN] Product unavailable.",
            show_alert: true,
        });
        return;
    }

    if (qtyAction.count > product.maxPerOrder) {
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_WARN] Quantity out of bounds.",
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
            formatTerminalTelegramMessage({
                statuses: ["SYS_CHECKOUT_ARMED", "SESSION_TIMEOUT_30M"],
                lines: [
                    `Code: ${product.code}`,
                    `Quantity: ${qtyAction.count}`,
                    `Total: ${session.totalAmountHuf.toLocaleString("hu-HU")} HUF`,
                    "Checkout link primed.",
                ],
            }),
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [[{ text: "Stripe Checkout", url: session.url }]],
                },
            },
        );

        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_OK] Checkout tunnel ready.",
            show_alert: false,
        });
    } catch (checkoutError) {
        const errorMessage = checkoutError instanceof Error ? checkoutError.message : "checkout_failed";
        console.error("[telegram.webhook] checkout_create_failed", { error: errorMessage });
        await bot.answerCallbackQuery(callbackQueryId, {
            text: "[SYS_ERR] Checkout tunnel failed.",
            show_alert: true,
        });
    }
}

export async function POST(req: NextRequest) {
    if (!telegramBotToken) {
        return NextResponse.json({ ok: true, skipped: "missing_telegram_bot_token" });
    }

    if (!stripe) {
        return NextResponse.json({ ok: true, skipped: "missing_stripe_secret_key" });
    }

    if (!bot) {
        return NextResponse.json({ ok: true, skipped: "missing_telegram_bot_token" });
    }

    // A hiányzó HASH_SALT már NEM állítja le az egész kód futását!

    try {
        const update = (await req.json()) as TelegramUpdate;

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
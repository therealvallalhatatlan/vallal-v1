import "server-only";

import crypto from "crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
};

export type TelegramInitDataPayload = {
  rawInitData: string;
  authDate: number;
  user: TelegramWebAppUser;
  queryId?: string;
  chatInstance?: string;
  chatType?: string;
  hash: string;
  fields: Record<string, string>;
};

export type TelegramInitDataValidationResult =
  | { ok: true; payload: TelegramInitDataPayload }
  | { ok: false; error: string };

const MAX_INIT_DATA_AGE_SECONDS = 60 * 60 * 24;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function getTelegramBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !token.trim()) {
    throw new Error("missing_telegram_bot_token");
  }
  return token.trim();
}

function deriveTelegramSecretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

function parseInitData(initData: string): URLSearchParams {
  const normalized = String(initData ?? "").trim();
  if (!normalized) {
    throw new Error("missing_init_data");
  }

  return new URLSearchParams(normalized);
}

function buildDataCheckString(params: URLSearchParams): string {
  const entries = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right));

  return entries.map(([key, value]) => `${key}=${value}`).join("\n");
}

function parseTelegramUser(rawUser: string): TelegramWebAppUser {
  const parsed = JSON.parse(rawUser) as Partial<TelegramWebAppUser>;

  if (!parsed || typeof parsed.id !== "number" || !parsed.first_name) {
    throw new Error("invalid_telegram_user_payload");
  }

  return {
    id: parsed.id,
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    username: parsed.username,
    language_code: parsed.language_code,
    is_premium: parsed.is_premium,
    allows_write_to_pm: parsed.allows_write_to_pm,
    photo_url: parsed.photo_url,
  };
}

export function validateTelegramInitData(initData: string): TelegramInitDataValidationResult {
  try {
    const params = parseInitData(initData);
    const hash = params.get("hash");
    const authDateRaw = params.get("auth_date");
    const rawUser = params.get("user");

    if (!hash) return { ok: false, error: "missing_hash" };
    if (!authDateRaw) return { ok: false, error: "missing_auth_date" };
    if (!rawUser) return { ok: false, error: "missing_user" };

    const authDate = Number.parseInt(authDateRaw, 10);
    if (!Number.isFinite(authDate)) return { ok: false, error: "invalid_auth_date" };

    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds < 0 || ageSeconds > MAX_INIT_DATA_AGE_SECONDS) {
      return { ok: false, error: "stale_init_data" };
    }

    const dataCheckString = buildDataCheckString(params);
    const secretKey = deriveTelegramSecretKey(getTelegramBotToken());
    const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (!safeEqual(expectedHash, hash)) {
      return { ok: false, error: "invalid_init_data_hash" };
    }

    const user = parseTelegramUser(rawUser);

    return {
      ok: true,
      payload: {
        rawInitData: String(initData),
        authDate,
        user,
        queryId: params.get("query_id") ?? undefined,
        chatInstance: params.get("chat_instance") ?? undefined,
        chatType: params.get("chat_type") ?? undefined,
        hash,
        fields: Object.fromEntries(Array.from(params.entries()).filter(([key]) => key !== "hash")),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "telegram_init_data_validation_failed",
    };
  }
}

export function getTelegramMiniAppUrl(): string {
  const explicit = process.env.TELEGRAM_MINI_APP_URL || process.env.NEXT_PUBLIC_TELEGRAM_APP_URL;
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL("/telegram-app", siteUrl).toString();
}

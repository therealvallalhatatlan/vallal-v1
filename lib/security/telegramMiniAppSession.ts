export const TELEGRAM_MINI_APP_SESSION_COOKIE = "tg-mini-session";

type MiniAppSessionPayload = {
  userId: number;
  authDate: number;
  chatInstance?: string;
  exp: number;
};

const encoder = new TextEncoder();

function getSessionSecret(): string {
  const explicit = process.env.TELEGRAM_MINI_APP_SESSION_SECRET;
  if (explicit && explicit.trim()) return explicit.trim();

  const fallback = process.env.TELEGRAM_BOT_TOKEN;
  if (fallback && fallback.trim()) return fallback.trim();

  throw new Error("missing_telegram_mini_app_session_secret");
}

function encodeBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signValue(payloadBase64: string): Promise<string> {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadBase64));
  return encodeBase64Url(new Uint8Array(signature));
}

export async function createTelegramMiniAppSessionToken(input: {
  userId: number;
  authDate: number;
  chatInstance?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const payload: MiniAppSessionPayload = {
    userId: input.userId,
    authDate: input.authDate,
    chatInstance: input.chatInstance,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 60 * 60),
  };

  const payloadBase64 = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const signatureBase64 = await signValue(payloadBase64);
  return `${payloadBase64}.${signatureBase64}`;
}

export async function verifyTelegramMiniAppSessionToken(token: string | undefined | null): Promise<MiniAppSessionPayload | null> {
  const normalized = String(token ?? "").trim();
  if (!normalized) return null;

  const parts = normalized.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signatureBase64] = parts;
  if (!payloadBase64 || !signatureBase64) return null;

  const key = await getSigningKey();
  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBase64Url(signatureBase64),
    encoder.encode(payloadBase64),
  );

  if (!verified) return null;

  try {
    const payloadJson = decoder.decode(decodeBase64Url(payloadBase64));
    const payload = JSON.parse(payloadJson) as Partial<MiniAppSessionPayload>;

    if (
      typeof payload.userId !== "number" ||
      typeof payload.authDate !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      userId: payload.userId,
      authDate: payload.authDate,
      chatInstance: typeof payload.chatInstance === "string" ? payload.chatInstance : undefined,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

const decoder = new TextDecoder();
import "server-only";
import crypto from "crypto";

function getHashSalt(): string {
  const salt = process.env.HASH_SALT;
  if (!salt || !salt.trim()) {
    throw new Error("missing_hash_salt");
  }
  return salt;
}

export function hashTelegramId(rawId: string): string {
  const normalized = String(rawId || "").trim();
  if (!normalized) {
    throw new Error("empty_telegram_id");
  }

  const hmac = crypto.createHmac("sha256", getHashSalt());
  hmac.update(`telegram:id:${normalized}`);
  return hmac.digest("hex");
}

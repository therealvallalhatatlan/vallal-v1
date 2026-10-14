import { createHash, randomBytes } from "node:crypto";

export function createBookRegistryToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashBookRegistryToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

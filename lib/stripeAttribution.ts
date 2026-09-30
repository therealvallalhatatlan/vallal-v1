import crypto from "crypto";
import type { NextRequest } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import {
  ATTRIBUTION_COOKIE_PREFIX,
  UTM_KEYS,
} from "@/lib/attribution";

const MAX_METADATA_VALUE_LENGTH = 500;

function cleanValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, MAX_METADATA_VALUE_LENGTH);
}

function readCookieOrQuery(req: NextRequest, key: (typeof UTM_KEYS)[number]): string | null {
  const cookieValue = cleanValue(req.cookies.get(ATTRIBUTION_COOKIE_PREFIX + key)?.value);
  if (cookieValue) return cookieValue;

  const queryValue = cleanValue(req.nextUrl.searchParams.get(key));
  return queryValue || null;
}

export function createCheckoutOrderId(prefix = "checkout"): string {
  return prefix + "_" + crypto.randomUUID();
}

export function buildCartSummary(
  items: Array<{ productId?: string; quantity?: number; variantId?: string }> | null | undefined,
  extra?: string,
): string {
  const parts = (items ?? [])
    .map((item) => {
      const productId = cleanValue(item.productId);
      if (!productId) return null;

      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const variant = cleanValue(item.variantId);

      return variant
        ? productId + ":" + variant + "x" + quantity
        : productId + "x" + quantity;
    })
    .filter(Boolean) as string[];

  if (extra) parts.push(cleanValue(extra));
  return parts.join("|").slice(0, MAX_METADATA_VALUE_LENGTH) || "unknown";
}

export async function buildCheckoutMetadata(
  req: NextRequest,
  baseMetadata: Record<string, string>,
  options: {
    orderId?: string;
    cartSummary?: string;
    userUuid?: string | null;
  } = {},
): Promise<Record<string, string>> {
  const metadata: Record<string, string> = {
    ...baseMetadata,
    order_id: cleanValue(options.orderId) || createCheckoutOrderId(),
    cart_summary: cleanValue(options.cartSummary) || "unknown",
  };

  let userUuid = cleanValue(options.userUuid);

  if (!userUuid) {
    const token = parseBearerToken(req.headers);

    if (token) {
      try {
        const user = await getUserFromToken(token);
        userUuid = cleanValue(user?.id);
      } catch {
        userUuid = "";
      }
    }
  }

  if (userUuid) metadata.user_uuid = userUuid;

  for (const key of UTM_KEYS) {
    const value = readCookieOrQuery(req, key);
    if (value) metadata[key] = value;
  }

  const landingPath = cleanValue(
    req.cookies.get(ATTRIBUTION_COOKIE_PREFIX + "landing_path")?.value,
  );

  if (landingPath) metadata.landing_path = landingPath;

  return metadata;
}

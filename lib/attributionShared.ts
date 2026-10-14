const MAX_ATTRIBUTION_VALUE_LENGTH = 500;

export const ATTRIBUTION_COOKIE_PREFIX = "vll_utm_";
export const ATTRIBUTION_SOURCE_COOKIE = "vll_source";
export const ATTRIBUTION_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

function cleanValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, MAX_ATTRIBUTION_VALUE_LENGTH);
}

export function normalizeAttributionSource(value: string): string {
  const raw = cleanValue(value).toLowerCase();
  if (!raw) return "direct";
  if (raw.includes("facebook")) return "facebook";
  if (raw.includes("instagram")) return "instagram";
  if (raw.includes("reddit")) return "reddit";
  if (raw.includes("google")) return "google";
  if (raw.includes("tiktok")) return "tiktok";
  if (raw.includes("youtube")) return "youtube";
  if (raw.includes("twitter") || raw.includes("t.co")) return "x";
  if (raw.includes("stripe")) return "stripe";
  return raw.replace(/^www\./, "").slice(0, 80);
}

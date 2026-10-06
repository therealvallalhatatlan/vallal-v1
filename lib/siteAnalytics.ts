"use client";

import { track } from "@vercel/analytics";

type AnalyticsValue = string | number | boolean;
type AnalyticsProps = Record<string, AnalyticsValue | null | undefined>;

function sanitize(value: AnalyticsValue | null | undefined): AnalyticsValue | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.slice(0, 120);
  return value;
}

export function trackEvent(
  name: string,
  props: AnalyticsProps = {},
): void {
  try {
    const entries = Object.entries(props)
      .filter(([, value]) => value !== null && value !== undefined)
      .slice(0, 2)
      .map(([key, value]) => [key, sanitize(value)] as const)
      .filter(([, value]) => value !== undefined);

    track(name, Object.fromEntries(entries));
  } catch {
    // Analytics must never break the user experience.
  }
}

function hostToSource(host: string): string {
  const value = host.toLowerCase();
  if (value.includes("facebook")) return "facebook";
  if (value.includes("instagram")) return "instagram";
  if (value.includes("reddit")) return "reddit";
  if (value.includes("google")) return "google";
  if (value.includes("t.co") || value.includes("twitter")) return "x";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("youtube")) return "youtube";
  if (value.includes("stripe")) return "stripe";
  return value.replace(/^www\./, "").slice(0, 80);
}

export function getAttributionSource(): string {
  const key = "vh_first_touch_source_v1";

  try {
    const stored = localStorage.getItem(key);
    if (stored) return stored;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source")?.trim();
    if (utmSource) {
      const source = utmSource.slice(0, 80);
      localStorage.setItem(key, source);
      return source;
    }

    const referrer = document.referrer;
    if (referrer) {
      try {
        const source = hostToSource(new URL(referrer).hostname);
        localStorage.setItem(key, source);
        return source;
      } catch {
        // Fall through to direct.
      }
    }

    localStorage.setItem(key, "direct");
    return "direct";
  } catch {
    return "unknown";
  }
}

export function trackCta(cta: string): void {
  trackEvent("cta_click", {
    cta,
    source: getAttributionSource(),
  });
}

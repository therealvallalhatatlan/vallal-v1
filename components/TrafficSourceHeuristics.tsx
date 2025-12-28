"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track as vercelTrack } from "@vercel/analytics";

type SourceHint = "probable_qr" | "direct" | "referrer";

type HeuristicPayload = {
  probable_qr: boolean;
  qr_score: number;
  referrer_empty: boolean;
  referrer_host?: string;
  is_mobile: boolean;
  is_in_app: boolean;
  first_pv_of_session: boolean;
  path: string;
};

function safeReferrerHost(referrer: string): string | undefined {
  try {
    if (!referrer) return undefined;
    const url = new URL(referrer);
    return url.host;
  } catch {
    return undefined;
  }
}

function isProbablyInAppBrowser(ua: string): boolean {
  // Conservative patterns; we prefer false negatives over broad false positives.
  return /FBAN|FBAV|Instagram|Line\b|TikTok|Twitter|WhatsApp|Snapchat|Pinterest|LinkedInApp|wv\b|WebView/i.test(
    ua,
  );
}

function isMobileSignal(): boolean {
  try {
    // UAData is the cleanest when available.
    const uaData = (navigator as any).userAgentData;
    if (uaData && typeof uaData.mobile === "boolean") return uaData.mobile;
  } catch {}

  const ua = navigator.userAgent || "";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
}

function pickSourceHint(probableQr: boolean, referrerEmpty: boolean): SourceHint {
  if (probableQr) return "probable_qr";
  if (referrerEmpty) return "direct";
  return "referrer";
}

function setWithTtl(key: string, value: string, ttlMs: number) {
  try {
    const payload = JSON.stringify({ v: value, exp: Date.now() + ttlMs });
    localStorage.setItem(key, payload);
  } catch {}
}

export default function TrafficSourceHeuristics() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      // Motion preference doesn’t affect analytics; keep it as a noop placeholder if needed later.
      void reduceMotion;

      const sessionKey = "vh_source_logged_v1";
      const hintKey = "vh_source_hint_v1";
      const lastHintKey = "vh_last_source_hint_v1";

      const firstPvOfSession = sessionStorage.getItem(sessionKey) !== "1";
      if (!firstPvOfSession) return;
      sessionStorage.setItem(sessionKey, "1");

      const referrer = document.referrer || "";
      const referrerHost = safeReferrerHost(referrer);

      const referrerEmpty = !referrer;
      const isMobile = isMobileSignal();
      const ua = navigator.userAgent || "";
      const isInApp = isProbablyInAppBrowser(ua);

      let score = 0;
      if (referrerEmpty) score += 2;
      if (isMobile) score += 1;
      if (isInApp) score += 1;
      if (firstPvOfSession) score += 1;

      const probableQr = score >= 3;
      const sourceHint = pickSourceHint(probableQr, referrerEmpty);

      sessionStorage.setItem(hintKey, sourceHint);
      // Optional: keep a short-lived hint to help correlate multi-visit funnels.
      setWithTtl(lastHintKey, sourceHint, 24 * 60 * 60 * 1000);

      const payload: HeuristicPayload = {
        probable_qr: probableQr,
        qr_score: score,
        referrer_empty: referrerEmpty,
        is_mobile: isMobile,
        is_in_app: isInApp,
        first_pv_of_session: true,
        path: pathname,
      };
      if (referrerHost) payload.referrer_host = referrerHost;

      vercelTrack("landing_source_heuristic", payload);
    } catch {
      // Never break page load for analytics.
    }
  }, [pathname]);

  return null;
}

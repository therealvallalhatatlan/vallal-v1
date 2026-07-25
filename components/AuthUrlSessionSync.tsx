"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/browser";
import {
  clearStoredAuthReturnTarget,
  readStoredAuthReturnTarget,
  resolveAuthReturnTarget,
} from "@/lib/authRedirect";

const supabase = createClient();

/**
 * Safety net for OAuth providers that return to Site URL with `#access_token=...`.
 * If we detect auth tokens in the hash, store the session and redirect to `next`.
 */
export default function AuthUrlSessionSync() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    const qs = new URLSearchParams(window.location.search || "");
    const isLogoutFlow = qs.get("logout") === "1";
    const hasCode = Boolean(qs.get("code"));
    const tokenHash = qs.get("token_hash");
    const otpType = qs.get("type");
    const hasTokenHash = Boolean(tokenHash);
    const hasHashTokens = /access_token=|refresh_token=|error=/.test(hash);
    const isCallbackPath = window.location.pathname.startsWith("/auth/callback");

    // The callback page has dedicated handling; avoid duplicate exchange/race.
    if (isCallbackPath) return;
    if (isLogoutFlow) return;
    const storedNext = readStoredAuthReturnTarget();
    if (!hasCode && !hasTokenHash && !hasHashTokens && !storedNext) return;

    const run = async () => {
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const targetFromStorage = readStoredAuthReturnTarget();

      const next = resolveAuthReturnTarget({
        nextParam: searchParams?.get("next"),
        fromParam: searchParams?.get("from"),
        storedNext: targetFromStorage,
        fallback: "/halozat",
        currentOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      // Skip token/code processing if session is already established.
      const preExisting = await supabase.auth.getSession();
      if (preExisting?.data?.session) {
        clearStoredAuthReturnTarget();
        if (typeof window !== "undefined") {
          window.location.replace(next);
        } else {
          router.replace(next);
        }
        return;
      }

      if (hasCode) {
        const code = searchParams?.get("code") || "";
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          const recovered = await supabase.auth.getSession();
          if (!recovered?.data?.session) return;
        }
      } else if (hasTokenHash && tokenHash) {
        const otpCandidates = [otpType, "magiclink", "email"].filter(
          (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index
        );

        let verified = false;
        for (const candidate of otpCandidates) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: candidate as "magiclink" | "email" | "signup" | "recovery" | "invite" | "email_change",
          });
          if (!error) {
            verified = true;
            break;
          }
        }

        if (!verified) return;
      } else if (hasHashTokens) {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) return;
      } else {
        const existing = await supabase.auth.getSession();
        if (!existing?.data?.session) return;
      }

      // Clean URL params/hash (so refresh doesn't re-run the sync)
      try {
        const clean = window.location.pathname;
        window.history.replaceState({}, document.title, clean);
      } catch {
        // ignore
      }

      clearStoredAuthReturnTarget();

      if (typeof window !== "undefined") {
        window.location.replace(next);
      } else {
        router.replace(next);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return null;
}

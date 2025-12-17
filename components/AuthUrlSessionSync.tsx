"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/browser";

const supabase = createClient();

/**
 * Safety net for OAuth providers that return to Site URL with `#access_token=...`.
 * If we detect auth tokens in the hash, store the session and redirect to `next`.
 */
export default function AuthUrlSessionSync() {
  const router = useRouter();

  useEffect(() => {
    // Only run when there's something to process.
    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    if (!/access_token=|refresh_token=|error=/.test(hash)) return;

    const run = async () => {
      const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const nextFromQuery = qs?.get("next") || "";
      let next = nextFromQuery || "/reader";

      if (!nextFromQuery) {
        try {
          const stored = window.sessionStorage.getItem("vallal_auth_next");
          if (stored) next = stored;
          if (!stored) {
            const stored2 = window.localStorage.getItem("vallal_auth_next");
            if (stored2) next = stored2;
          }
        } catch {
          // ignore
        }
      }

      const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (error) return;

      // Clean URL hash (so refresh doesn't re-run the sync)
      try {
        const clean = window.location.pathname + (window.location.search || "");
        window.history.replaceState({}, document.title, clean);
      } catch {
        // ignore
      }

      try {
        window.sessionStorage.removeItem("vallal_auth_next");
        window.localStorage.removeItem("vallal_auth_next");
      } catch {
        // ignore
      }

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

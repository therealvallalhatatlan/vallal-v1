"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";

const supabase = createClient();

/**
 * Safety net for OAuth providers that return to Site URL with `#access_token=...`.
 * If we detect auth tokens in the hash, store the session and redirect to `next`.
 */
export default function AuthUrlSessionSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only run when there's something to process.
    const hash = typeof window !== "undefined" ? window.location.hash || "" : "";
    if (!/access_token=|refresh_token=|error=/.test(hash)) return;

    const run = async () => {
      const nextFromQuery = searchParams?.get("next") || "";
      let next = nextFromQuery || "/reader";

      if (!nextFromQuery) {
        try {
          const stored = window.sessionStorage.getItem("vallal_auth_next");
          if (stored) next = stored;
        } catch {
          // ignore
        }
      }

      const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
      if (error) return;

      // Clean URL hash (so refresh doesn't re-run the sync)
      try {
        window.history.replaceState({}, document.title, pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ""));
      } catch {
        // ignore
      }

      try {
        window.sessionStorage.removeItem("vallal_auth_next");
      } catch {
        // ignore
      }

      router.replace(next);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname]);

  return null;
}

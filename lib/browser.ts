// lib/supabase/browser.ts
"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    console.warn(
      "[supabase][browser] Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_* fallbacks). Returning stub client."
    );
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithOtp: async () => ({ data: null, error: new Error("Supabase env hiányzik") }),
        exchangeCodeForSession: async () => ({ data: null, error: new Error("Supabase env hiányzik") }),
        getSessionFromUrl: async () => ({ data: null, error: new Error("Supabase env hiányzik") }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as any;
  }

  return createSupabaseClient(url, key, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

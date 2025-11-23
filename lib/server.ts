// lib/supabase/server.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    console.warn(
      "[supabase][server] Missing SUPABASE_URL/SUPABASE_ANON_KEY (or NEXT_PUBLIC_* fallbacks). Returning stub client."
    );
    // Safe stub: minimal shape used by callers, avoids build-time crashes
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    } as any;
  }

  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}

// lib/supabase/server.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function createClient() {
  // no cookie handling here; non-persistent server client
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

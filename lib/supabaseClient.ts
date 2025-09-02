// Server-only Supabase admin client. Do not import in client components.
import { createClient, SupabaseClient } from "@supabase/supabase-js"

let supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
	// ensure required env present
	const url = process.env.SUPABASE_URL
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY
	if (!url || !key) {
		throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for server-side Supabase client")
	}
	if (!supabaseAdmin) {
		supabaseAdmin = createClient(url, key, { auth: { persistSession: false } })
	}
	return supabaseAdmin
}

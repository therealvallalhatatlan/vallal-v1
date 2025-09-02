import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-only guard
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin must only be used on the server')
}

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

let cachedAdminClient: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient

  cachedAdminClient = createClient(
    SUPABASE_URL as string,
    SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        // disable session persistence and URL session detection for server admin usage
        persistSession: false,
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
    }
  )

  return cachedAdminClient
}

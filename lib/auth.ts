import { supabaseAdmin } from './supabaseAdmin'

export type AuthenticatedUser = {
  id: string
  email: string | null
}

export function parseBearerToken(headers: Headers): string | null {
  const authHeader = headers.get('authorization') || headers.get('Authorization')
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)/i)
  return match ? match[1].trim() : null
}

export async function getUserFromToken(token: string): Promise<AuthenticatedUser | null> {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null
  return { id: data.user.id, email: data.user.email }
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(email.toLowerCase())
}

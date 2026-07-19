import { supabaseAdmin } from './supabaseAdmin'

export type AuthenticatedUser = {
  id: string
  email: string | null
}

export type UserRole = 'user' | 'editor' | 'admin'

function parseEmailAllowlist(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
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
  const allowlist = parseEmailAllowlist(process.env.ADMIN_EMAILS)
  return allowlist.includes(email.toLowerCase())
}

export function isEditorEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allowlist = parseEmailAllowlist(process.env.HALOZAT_EDITORS)
  return allowlist.includes(email.toLowerCase())
}

export function getUserRoleByEmail(email: string | null | undefined): UserRole {
  if (isAdminEmail(email)) return 'admin'
  if (isEditorEmail(email)) return 'editor'
  return 'user'
}

export function canCreatePaidSpots(role: UserRole): boolean {
  return role === 'admin' || role === 'editor'
}

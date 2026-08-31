import type { User } from '@supabase/supabase-js'

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizeUuid(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase()
  if (!UUID_V4_LIKE.test(value)) return null
  return value
}

/**
 * Phantom insider is a privileged flag. Only app_metadata is trusted here.
 * user_metadata is user-controlled and must never grant privileges.
 */
export function isPhantomInsider(user: User | null | undefined): boolean {
  if (!user) return false

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>
  const rawFlag = appMetadata.insider
  const normalized = String(rawFlag ?? '').trim().toLowerCase()

  if (['1', 'true', 't', 'yes', 'y', 'on'].includes(normalized)) return true

  const appRole = String(appMetadata.role ?? '').trim().toLowerCase()
  return appRole === 'insider' || appRole === 'admin' || appRole === 'editor'
}

export function parseLatLng(body: { lat?: unknown; lng?: unknown }) {
  const lat = typeof body.lat === 'number' ? body.lat : Number(body.lat)
  const lng = typeof body.lng === 'number' ? body.lng : Number(body.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

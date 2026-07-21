import type { SupabaseClient } from '@supabase/supabase-js'

export const PAID_SPOT_UNLOCK_HOURS = 24

export function maskTitleFirstWords(title: string, maxWords = 3): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return `${words.join(' ')} ...`
  return `${words.slice(0, maxWords).join(' ')} ...`
}

export function obfuscateCoordinate(value: number): number {
  return Math.round(value * 100) / 100
}

function hashStringToUnit(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

/**
 * Obfuscates coordinates in a stable way per spot.
 * The output stays in the nearby area but does not reveal the exact location.
 */
export function obfuscateSpotCoordinates(
  lat: number,
  lng: number,
  spotId: string,
  minOffsetMeters = 120,
  maxOffsetMeters = 320,
): { lat: number; lng: number } {
  const safeMin = Math.max(0, Math.min(minOffsetMeters, maxOffsetMeters))
  const safeMax = Math.max(safeMin, maxOffsetMeters)

  const angle = hashStringToUnit(`${spotId}:angle`) * Math.PI * 2
  const radiusFactor = hashStringToUnit(`${spotId}:radius`)
  const radiusMeters = safeMin + (safeMax - safeMin) * radiusFactor

  const latRad = (lat * Math.PI) / 180
  const deltaLat = (radiusMeters / 111_320) * Math.sin(angle)
  const cosLat = Math.max(0.2, Math.abs(Math.cos(latRad)))
  const deltaLng = (radiusMeters / (111_320 * cosLat)) * Math.cos(angle)

  const obfLat = Math.max(-89.9999, Math.min(89.9999, lat + deltaLat))
  const obfLng = Math.max(-179.9999, Math.min(179.9999, lng + deltaLng))

  return {
    lat: Math.round(obfLat * 1_000_000) / 1_000_000,
    lng: Math.round(obfLng * 1_000_000) / 1_000_000,
  }
}

export async function getActiveSpotUnlock(
  db: SupabaseClient,
  userId: string,
  spotId: string,
  nowIso = new Date().toISOString(),
): Promise<{ expires_at: string } | null> {
  const { data, error } = await db
    .from('paid_spot_unlocks')
    .select('expires_at')
    .eq('user_id', userId)
    .eq('spot_id', spotId)
    .gt('expires_at', nowIso)
    .maybeSingle<{ expires_at: string }>()

  if (error || !data) return null
  return data
}

export function computeUnlockExpiry(hours = PAID_SPOT_UNLOCK_HOURS): string {
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000)
  return expiresAt.toISOString()
}

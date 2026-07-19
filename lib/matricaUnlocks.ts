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

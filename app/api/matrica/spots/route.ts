import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { StickerSpot } from '@/lib/matrica'
import { getUserFromToken, parseBearerToken } from '@/lib/auth'
import { getActiveSpotUnlock, maskTitleFirstWords, obfuscateCoordinate } from '@/lib/matricaUnlocks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/matrica/spots
 * Returns all active sticker spots (no auth required – coords are public,
 * secrets like exact claim radius are exposed only after auth if desired).
 */
type SpotRow = StickerSpot & {
  spot_type: 'free' | 'paid'
  price_huf: number
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin()
  const token = parseBearerToken(req.headers)
  const authUser = token ? await getUserFromToken(token) : null

  const { data, error } = await db
    .from('sticker_spots')
    .select(
      'id, title, description, image_url, image_urls, lat, lng, radius_visibility, radius_claim, total_quantity, remaining_quantity, status, created_at, spot_type, price_huf',
    )
    .eq('status', 'active')
    .gt('remaining_quantity', 0)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[matrica/spots] db error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const rows = (data ?? []) as SpotRow[]

  const spots = await Promise.all(rows.map(async (spot) => {
    if (spot.spot_type !== 'paid') {
      return {
        ...spot,
        spot_type: 'free' as const,
        price_huf: 0,
        is_locked: false,
        unlock_expires_at: null,
      }
    }

    if (!authUser?.id) {
      return {
        ...spot,
        title: maskTitleFirstWords(spot.title, 3),
        description: null,
        image_url: null,
        image_urls: [],
        lat: obfuscateCoordinate(spot.lat),
        lng: obfuscateCoordinate(spot.lng),
        is_locked: true,
        unlock_expires_at: null,
      }
    }

    const unlock = await getActiveSpotUnlock(db, authUser.id, spot.id)
    if (!unlock) {
      return {
        ...spot,
        title: maskTitleFirstWords(spot.title, 3),
        description: null,
        image_url: null,
        image_urls: [],
        lat: obfuscateCoordinate(spot.lat),
        lng: obfuscateCoordinate(spot.lng),
        is_locked: true,
        unlock_expires_at: null,
      }
    }

    return {
      ...spot,
      is_locked: false,
      unlock_expires_at: unlock.expires_at,
    }
  }))

  return NextResponse.json({ spots })
}

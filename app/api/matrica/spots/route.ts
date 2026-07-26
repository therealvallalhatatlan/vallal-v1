import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { StickerSpot } from '@/lib/matrica'
import { canManageAllSpots, getUserFromToken, getUserRoleByEmail, parseBearerToken } from '@/lib/auth'
import { getActiveSpotUnlock, maskTitleFirstWords, obfuscateSpotCoordinates } from '@/lib/matricaUnlocks'

export const dynamic = 'force-dynamic'

/**
 * GET /api/matrica/spots
 * Returns all active sticker spots (no auth required – coords are public,
 * secrets like exact claim radius are exposed only after auth if desired).
 */
type SpotRow = StickerSpot & {
  creator_id: string | null
  spot_type: 'free' | 'paid'
  price_huf: number
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin()
  const token = parseBearerToken(req.headers)
  const authUser = token ? await getUserFromToken(token) : null
  const authRole = getUserRoleByEmail(authUser?.email)
  const canManageAll = canManageAllSpots(authRole)

  const { data, error } = await db
    .from('sticker_spots')
    .select(
      'id, title, description, image_url, image_urls, lat, lng, radius_visibility, radius_claim, total_quantity, remaining_quantity, status, created_at, creator_id, spot_type, price_huf',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[matrica/spots] db error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const rows = (data ?? []) as SpotRow[]

  const spots = await Promise.all(rows.map(async (spot) => {
    const obfuscated = obfuscateSpotCoordinates(spot.lat, spot.lng, spot.id)
    const canEdit = !!authUser?.id && (canManageAll || spot.creator_id === authUser.id)

    if (spot.spot_type !== 'paid') {
      return {
        ...spot,
        creator_id: undefined,
        spot_type: 'free' as const,
        price_huf: 0,
        can_edit: canEdit,
        is_locked: false,
        unlock_expires_at: null,
      }
    }

    if (!authUser?.id) {
      return {
        ...spot,
        creator_id: undefined,
        title: maskTitleFirstWords(spot.title, 3),
        description: null,
        image_url: spot.image_url,
        image_urls: spot.image_urls,
        lat: obfuscated.lat,
        lng: obfuscated.lng,
        can_edit: canEdit,
        is_locked: true,
        unlock_expires_at: null,
      }
    }

    const unlock = await getActiveSpotUnlock(db, authUser.id, spot.id)
    if (!unlock) {
      return {
        ...spot,
        creator_id: undefined,
        title: maskTitleFirstWords(spot.title, 3),
        description: null,
        image_url: spot.image_url,
        image_urls: spot.image_urls,
        lat: obfuscated.lat,
        lng: obfuscated.lng,
        can_edit: canEdit,
        is_locked: true,
        unlock_expires_at: null,
      }
    }

    return {
      ...spot,
      creator_id: undefined,
      can_edit: canEdit,
      is_locked: false,
      unlock_expires_at: unlock.expires_at,
    }
  }))

  return NextResponse.json({ spots })
}

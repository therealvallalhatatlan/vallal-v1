import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getDistanceMeters } from '@/lib/matrica'
import type { StickerSpot } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

interface ClaimBody {
  spot_id?: unknown
  user_lat?: unknown
  user_lng?: unknown
  user_image_url?: unknown
  comment?: unknown
}

/**
 * POST /api/matrica/claim
 * Body: { spot_id, user_lat, user_lng, user_image_url?, comment? }
 *
 * Validates:
 *  1. Auth – Bearer token required
 *  2. Input shape
 *  3. Spot exists and is active
 *  4. User is within spot.radius_claim metres (Haversine)
 *  5. User has not already claimed this spot
 *  6. Spot still has remaining_quantity > 0
 *
 * On success inserts a claim with status = 'pending' and reserves one sticker
 * immediately by decrementing remaining_quantity.
 */
export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const anonClient = await createClient()
  const { data: authData, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }
  const userId = authData.user.id

  // ── 2. Input validation ───────────────────────────────────────────────────
  let body: ClaimBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { spot_id, user_lat, user_lng, user_image_url, comment } = body

  if (typeof spot_id !== 'string' || !spot_id.trim()) {
    return NextResponse.json({ error: 'missing_spot_id' }, { status: 400 })
  }
  const userLat = typeof user_lat === 'number' ? user_lat : Number(user_lat)
  const userLng = typeof user_lng === 'number' ? user_lng : Number(user_lng)

  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // ── 3. Fetch spot ─────────────────────────────────────────────────────────
  const { data: spotData, error: spotError } = await db
    .from('sticker_spots')
    .select('id, lat, lng, radius_claim, status, remaining_quantity')
    .eq('id', spot_id.trim())
    .maybeSingle()

  if (spotError) {
    console.error('[matrica/claim] spot fetch error', spotError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (!spotData) {
    return NextResponse.json({ error: 'spot_not_found' }, { status: 404 })
  }

  const spot = spotData as Pick<StickerSpot, 'id' | 'lat' | 'lng' | 'radius_claim' | 'status' | 'remaining_quantity'>

  if (spot.status !== 'active') {
    return NextResponse.json({ error: 'spot_unavailable' }, { status: 409 })
  }

  if (spot.remaining_quantity <= 0) {
    return NextResponse.json({ error: 'spot_empty' }, { status: 409 })
  }

  // ── 4. Distance check ─────────────────────────────────────────────────────
  const distanceMeters = getDistanceMeters(userLat, userLng, spot.lat, spot.lng)
  if (distanceMeters > spot.radius_claim) {
    return NextResponse.json(
      {
        error: 'too_far',
        distance_meters: Math.round(distanceMeters),
        radius_claim: spot.radius_claim,
      },
      { status: 403 },
    )
  }

  // ── 5. Duplicate check ────────────────────────────────────────────────────
  const { data: existing, error: dupError } = await db
    .from('claims')
    .select('id')
    .eq('user_id', userId)
    .eq('spot_id', spot.id)
    .maybeSingle()

  if (dupError) {
    console.error('[matrica/claim] duplicate check error', dupError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (existing) {
    return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
  }

  // ── 6. Insert claim ───────────────────────────────────────────────────────
  const { data: claim, error: insertError } = await db
    .from('claims')
    .insert({
      user_id: userId,
      spot_id: spot.id,
      status: 'pending',
      user_image_url:
        typeof user_image_url === 'string' && user_image_url.trim()
          ? user_image_url.trim()
          : null,
      comment:
        typeof comment === 'string' && comment.trim()
          ? comment.trim().slice(0, 1000)
          : null,
    })
    .select('id, status, created_at')
    .single()

  if (insertError) {
    // Unique constraint violation: race-condition double-submit
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'already_claimed' }, { status: 409 })
    }
    console.error('[matrica/claim] insert error', insertError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  // ── 7. Reserve one sticker immediately on submission ─────────────────────
  const nextRemaining = spot.remaining_quantity - 1
  const nextStatus = nextRemaining <= 0 ? 'empty' : 'active'

  const { data: reservedSpot, error: reserveError } = await db
    .from('sticker_spots')
    .update({
      remaining_quantity: nextRemaining,
      status: nextStatus,
    })
    .eq('id', spot.id)
    .eq('status', 'active')
    .eq('remaining_quantity', spot.remaining_quantity)
    .select('id, remaining_quantity, status')
    .maybeSingle()

  // If reservation fails due concurrent update, undo pending claim so state stays consistent.
  if (reserveError || !reservedSpot) {
    await db.from('claims').delete().eq('id', claim.id)

    if (reserveError) {
      console.error('[matrica/claim] reserve error', reserveError)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({ error: 'spot_empty' }, { status: 409 })
  }

  return NextResponse.json({ claim, spot: reservedSpot }, { status: 201 })
}

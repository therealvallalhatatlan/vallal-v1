import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getDistanceMeters } from '@/lib/matrica'
import { normalizeUuid, parseLatLng } from '@/lib/phantom'

export const dynamic = 'force-dynamic'

interface ClaimBody {
  shadow_session_id?: unknown
  drop_id?: unknown
  lat?: unknown
  lng?: unknown
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const anon = await createClient()
  const { data: authData, error: authError } = await anon.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: ClaimBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = normalizeUuid(body.shadow_session_id)
  const dropId = normalizeUuid(body.drop_id)
  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_shadow_session_id' }, { status: 400 })
  }
  if (!dropId) {
    return NextResponse.json({ error: 'invalid_drop_id' }, { status: 400 })
  }

  const point = parseLatLng({ lat: body.lat, lng: body.lng })
  if (!point) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: profile, error: profileError } = await db
    .from('shadow_profiles')
    .select('session_id, sponsor_id, banned_at')
    .eq('session_id', sessionId)
    .maybeSingle<{ session_id: string; sponsor_id: string | null; banned_at: string | null }>()

  if (profileError) {
    console.error('[phantom/drops/claim] profile lookup error', profileError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!profile?.session_id) {
    return NextResponse.json({ error: 'shadow_profile_not_found' }, { status: 404 })
  }

  if (profile.banned_at) {
    return NextResponse.json({ error: 'shadow_profile_banned' }, { status: 403 })
  }

  const { data: drop, error: dropError } = await db
    .from('shadow_drops')
    .select('id, lat, lng, geofence_meters, is_claimed, claimed_by_session_id')
    .eq('id', dropId)
    .maybeSingle<{ id: string; lat: number; lng: number; geofence_meters: number; is_claimed: boolean; claimed_by_session_id: string | null }>()

  if (dropError) {
    console.error('[phantom/drops/claim] drop lookup error', dropError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!drop?.id) {
    return NextResponse.json({ error: 'drop_not_found' }, { status: 404 })
  }

  if (drop.is_claimed) {
    return NextResponse.json({ error: 'drop_already_claimed' }, { status: 409 })
  }

  const distanceMeters = getDistanceMeters(point.lat, point.lng, drop.lat, drop.lng)
  if (distanceMeters > drop.geofence_meters) {
    return NextResponse.json({
      error: 'too_far',
      distance_meters: Math.round(distanceMeters),
      geofence_meters: drop.geofence_meters,
    }, { status: 403 })
  }

  const nowIso = new Date().toISOString()
  const burnAfterIso = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { data: updatedDrop, error: updateDropError } = await db
    .from('shadow_drops')
    .update({
      is_claimed: true,
      claimed_at: nowIso,
      claimed_by_session_id: sessionId,
      burn_after: burnAfterIso,
    })
    .eq('id', drop.id)
    .eq('is_claimed', false)
    .select('id, code_name, lat, lng, geofence_meters, is_claimed, claimed_at, claimed_by_session_id, burn_after, created_at')
    .maybeSingle()

  if (updateDropError) {
    console.error('[phantom/drops/claim] drop update error', updateDropError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!updatedDrop) {
    return NextResponse.json({ error: 'drop_already_claimed' }, { status: 409 })
  }

  const { error: claimInsertError } = await db
    .from('shadow_drop_claims')
    .insert({
      drop_id: drop.id,
      session_id: sessionId,
      claimed_at: nowIso,
      metadata: {
        distance_meters: Math.round(distanceMeters),
        claimer_uid: authData.user.id,
      },
    })

  if (claimInsertError) {
    console.error('[phantom/drops/claim] claim insert error', claimInsertError)

    await db
      .from('shadow_drops')
      .update({
        is_claimed: false,
        claimed_at: null,
        claimed_by_session_id: null,
        burn_after: null,
      })
      .eq('id', drop.id)
      .eq('claimed_by_session_id', sessionId)

    if (claimInsertError.code === '23505') {
      return NextResponse.json({ error: 'drop_already_claimed' }, { status: 409 })
    }

    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    drop: updatedDrop,
    claimed_at: nowIso,
    burn_after: burnAfterIso,
    one_hop_burndown: true,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getDistanceMeters } from '@/lib/matrica'
import { normalizeUuid, parseLatLng, isPhantomInsider } from '@/lib/phantom'
import { isEditorEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface ListQuery {
  shadow_session_id: string | null
  lat: number | null
  lng: number | null
}

interface PublishBody {
  shadow_session_id?: unknown
  title?: unknown
  description?: unknown
  code_name?: unknown
  image_url?: unknown
  image_urls?: unknown
  location_hint?: unknown
  lat?: unknown
  lng?: unknown
  geofence_meters?: unknown
}

async function getAuthedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const anon = await createClient()
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}

function parseListQuery(req: NextRequest): ListQuery {
  const latRaw = req.nextUrl.searchParams.get('lat')
  const lngRaw = req.nextUrl.searchParams.get('lng')

  return {
    shadow_session_id: normalizeUuid(req.nextUrl.searchParams.get('shadow_session_id')),
    lat: latRaw === null ? null : Number(latRaw),
    lng: lngRaw === null ? null : Number(lngRaw),
  }
}

export async function GET(req: NextRequest) {
  const query = parseListQuery(req)
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('shadow_drops')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[phantom/drops] list error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    id: string
    title: string | null
    description: string | null
    code_name: string
    image_url: string | null
    image_urls: string[] | null
    location_hint: string | null
    lat: number
    lng: number
    geofence_meters: number
    is_claimed: boolean
    claimed_at: string | null
    claimed_by_session_id: string | null
    burn_after: string | null
    metadata: Record<string, unknown> | null
    created_at: string
  }>

  const canComputeDistance = Number.isFinite(query.lat) && Number.isFinite(query.lng)

  const drops = rows.map((drop) => {
    const distanceMeters = canComputeDistance
      ? getDistanceMeters(query.lat as number, query.lng as number, drop.lat, drop.lng)
      : null

    const creatorShadowSessionId = typeof drop.metadata?.creator_shadow_session_id === 'string'
      ? drop.metadata.creator_shadow_session_id
      : null

    const normalizedImageUrls = Array.isArray(drop.image_urls)
      ? drop.image_urls.filter((url): url is string => typeof url === 'string' && !!url.trim())
      : []

    return {
      ...drop,
      image_urls: normalizedImageUrls,
      distance_meters: distanceMeters,
      can_claim: !drop.is_claimed &&
        query.shadow_session_id !== null &&
        distanceMeters !== null &&
        distanceMeters <= drop.geofence_meters,
      is_mine: query.shadow_session_id !== null && creatorShadowSessionId === query.shadow_session_id,
    }
  })

  return NextResponse.json({ ok: true, drops })
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  if (!isEditorEmail(user.email)) {
    return NextResponse.json({ error: 'editor_required' }, { status: 403 })
  }

  let body: PublishBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = normalizeUuid(body.shadow_session_id)
  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_shadow_session_id' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
  if (!title) {
    return NextResponse.json({ error: 'missing_title' }, { status: 400 })
  }

  const codeName = typeof body.code_name === 'string' ? body.code_name.trim().slice(0, 64) : ''
  if (!codeName) {
    return NextResponse.json({ error: 'missing_code_name' }, { status: 400 })
  }

  const description = typeof body.description === 'string'
    ? body.description.trim().slice(0, 5000)
    : ''

  const locationHint = typeof body.location_hint === 'string'
    ? body.location_hint.trim().slice(0, 280)
    : ''

  const imageUrls = Array.isArray(body.image_urls)
    ? body.image_urls.filter((value): value is string => typeof value === 'string' && !!value.trim()).slice(0, 6)
    : []

  const primaryImageUrl = typeof body.image_url === 'string' && body.image_url.trim()
    ? body.image_url.trim()
    : imageUrls[0] ?? null

  const point = parseLatLng({ lat: body.lat, lng: body.lng })
  if (!point) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const geofenceRaw = typeof body.geofence_meters === 'number'
    ? body.geofence_meters
    : Number(body.geofence_meters)
  const geofenceMeters = Number.isFinite(geofenceRaw)
    ? Math.max(40, Math.min(500, Math.round(geofenceRaw)))
    : 120

  const db = supabaseAdmin()

  const { data: profile, error: profileError } = await db
    .from('shadow_profiles')
    .select('session_id, drop_credits, insider_enabled, banned_at')
    .eq('session_id', sessionId)
    .maybeSingle<{ session_id: string; drop_credits: number; insider_enabled: boolean; banned_at: string | null }>()

  if (profileError) {
    console.error('[phantom/drops] profile lookup error', profileError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!profile?.session_id) {
    return NextResponse.json({ error: 'shadow_profile_not_found' }, { status: 404 })
  }

  if (profile.banned_at) {
    return NextResponse.json({ error: 'shadow_profile_banned' }, { status: 403 })
  }

  const insiderByJwt = isPhantomInsider(user)
  const insiderEnabled = profile.insider_enabled || insiderByJwt || isEditorEmail(user.email)
  if (!insiderEnabled) {
    return NextResponse.json({ error: 'insider_required' }, { status: 403 })
  }

  const nextCredits = Number(profile.drop_credits || 0) - 1
  if (nextCredits < 0) {
    return NextResponse.json({ error: 'insufficient_drop_credits' }, { status: 409 })
  }

  const { error: creditError } = await db
    .from('shadow_profiles')
    .update({ drop_credits: nextCredits })
    .eq('session_id', sessionId)
    .eq('drop_credits', profile.drop_credits)

  if (creditError) {
    console.error('[phantom/drops] credit update error', creditError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const { data: created, error: createError } = await db
    .from('shadow_drops')
    .insert({
      title,
      description: description || null,
      code_name: codeName,
      image_url: primaryImageUrl,
      image_urls: imageUrls,
      location_hint: locationHint || null,
      lat: point.lat,
      lng: point.lng,
      geofence_meters: geofenceMeters,
      metadata: {
        created_by_uid: user.id,
        creator_shadow_session_id: sessionId,
      },
    })
    .select('*')
    .single()

  if (createError) {
    if (typeof createError.message === 'string' && (
      createError.message.toLowerCase().includes('title') ||
      createError.message.toLowerCase().includes('description') ||
      createError.message.toLowerCase().includes('image_url') ||
      createError.message.toLowerCase().includes('image_urls') ||
      createError.message.toLowerCase().includes('location_hint')
    )) {
      await db
        .from('shadow_profiles')
        .update({ drop_credits: profile.drop_credits })
        .eq('session_id', sessionId)

      return NextResponse.json({ error: 'phantom_schema_not_migrated' }, { status: 409 })
    }

    await db
      .from('shadow_profiles')
      .update({ drop_credits: profile.drop_credits })
      .eq('session_id', sessionId)

    console.error('[phantom/drops] create error', createError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, drop: created, drop_credits: nextCredits })
}

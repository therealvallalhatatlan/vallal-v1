import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { parseBearerToken, getUserFromToken } from '@/lib/auth'
import { getDistanceMeters, type RichContentDocument } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

interface RichUnlockBody {
  spot_id?: unknown
  lat?: unknown
  lng?: unknown
}

function isRichContentDocument(value: unknown): value is RichContentDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as { version?: unknown; blocks?: unknown }
  return document.version === 1 && Array.isArray(document.blocks)
}

export async function POST(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 })

  const authUser = await getUserFromToken(token)
  if (!authUser?.id) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: RichUnlockBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const spotId = typeof body.spot_id === 'string' ? body.spot_id.trim() : ''
  const lat = Number(body.lat)
  const lng = Number(body.lng)

  if (!spotId) return NextResponse.json({ error: 'missing_spot_id' }, { status: 400 })
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: spot, error } = await db
    .from('sticker_spots')
    .select('id, lat, lng, radius_claim, type, content_type, rich_content')
    .eq('id', spotId)
    .maybeSingle()

  if (error) {
    console.error('[matrica/digital/rich] spot fetch error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!spot) return NextResponse.json({ error: 'spot_not_found' }, { status: 404 })
  if (spot.type !== 'virtual' || spot.content_type !== 'rich') {
    return NextResponse.json({ error: 'invalid_spot_type' }, { status: 400 })
  }

  const distance = getDistanceMeters(lat, lng, spot.lat, spot.lng)
  if (distance > spot.radius_claim) {
    return NextResponse.json(
      {
        error: 'too_far',
        distance_meters: Math.round(distance),
        radius_claim: spot.radius_claim,
      },
      { status: 403 },
    )
  }

  if (!isRichContentDocument(spot.rich_content)) {
    return NextResponse.json({ error: 'missing_rich_content' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    content_type: 'rich',
    rich_content: spot.rich_content,
  })
}

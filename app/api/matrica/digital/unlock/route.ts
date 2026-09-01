import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { parseBearerToken, getUserFromToken } from '@/lib/auth'
import { getDistanceMeters, type VirtualSpotContentType } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

interface UnlockBody {
  spot_id?: unknown
  lat?: unknown
  lng?: unknown
}

export async function POST(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  const authUser = await getUserFromToken(token)
  if (!authUser?.id) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  let body: UnlockBody
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const spotId = typeof body.spot_id === 'string' ? body.spot_id.trim() : ''
  if (!spotId) return NextResponse.json({ error: 'missing_spot_id' }, { status: 400 })

  const lat = Number(body.lat)
  const lng = Number(body.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: spot, error: spotError } = await db
    .from('sticker_spots')
    .select('id, lat, lng, radius_claim, type, content_type, content_url, rich_content')
    .eq('id', spotId)
    .maybeSingle()

  if (spotError) {
    console.error('[matrica/digital/unlock] spot fetch error', spotError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
  if (!spot) return NextResponse.json({ error: 'spot_not_found' }, { status: 404 })
  if (spot.type !== 'virtual') return NextResponse.json({ error: 'invalid_spot_type' }, { status: 400 })

  const SUPPORTED_CONTENT_TYPES: VirtualSpotContentType[] = ['video', 'audio', 'image', 'text', 'link', 'rich']
  const contentType = spot.content_type as VirtualSpotContentType | null
  if (!contentType || !SUPPORTED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'unsupported_content_type' }, { status: 400 })
  }

  const distance = getDistanceMeters(lat, lng, spot.lat, spot.lng)
  if (distance > spot.radius_claim) {
    return NextResponse.json({ error: 'too_far', distance_meters: Math.round(distance), radius_claim: spot.radius_claim }, { status: 403 })
  }

  if (contentType === 'rich') {
    if (!spot.rich_content || spot.rich_content.version !== 1 || !Array.isArray(spot.rich_content.blocks)) {
      return NextResponse.json({ error: 'missing_rich_content' }, { status: 500 })
    }
    return NextResponse.json(
      { success: true, content_type: 'rich', content_url: null, rich_content: spot.rich_content },
      { status: 200 },
    )
  }

  if (!spot.content_url) return NextResponse.json({ error: 'missing_content_url' }, { status: 500 })
  return NextResponse.json(
    { success: true, content_type: spot.content_type, content_url: spot.content_url },
    { status: 200 },
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { parseBearerToken, getUserFromToken, getUserRoleByEmail } from '@/lib/auth'
import { canManageAllSpots } from '@/lib/auth'
import { isRichContentDocument } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

interface Payload {
  spotId?: unknown
  document?: unknown
}

export async function PATCH(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const authUser = await getUserFromToken(token)
  if (!authUser?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const spotId = typeof body.spotId === 'string' ? body.spotId : ''
  const document = body.document

  if (!spotId) {
    return NextResponse.json({ error: 'spot_id_required' }, { status: 400 })
  }

  if (!isRichContentDocument(document)) {
    return NextResponse.json({ error: 'invalid_document' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: spot, error: spotError } = await db
    .from('sticker_spots')
    .select('id, type, content_type, creator_id')
    .eq('id', spotId)
    .maybeSingle()

  if (spotError) {
    console.error('[admin/matrica/rich-content] spot fetch error', spotError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!spot || spot.type !== 'virtual' || spot.content_type !== 'rich') {
    return NextResponse.json({ error: 'invalid_spot' }, { status: 400 })
  }

  const role = getUserRoleByEmail(authUser.email)
  const canManage = canManageAllSpots(role)
  if (!canManage && spot.creator_id !== authUser.id) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  const { data: updatedSpot, error: updateError } = await db
    .from('sticker_spots')
    .update({ rich_content: document })
    .eq('id', spotId)
    .select('rich_content')
    .maybeSingle()

  if (updateError) {
    console.error('[admin/matrica/rich-content] patch error', updateError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json(
    {
      success: true,
      document: updatedSpot?.rich_content ?? document,
    },
    { status: 200 },
  )
}
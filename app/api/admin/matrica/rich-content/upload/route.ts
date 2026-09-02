import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  canManageAllSpots,
  getUserFromToken,
  getUserRoleByEmail,
  parseBearerToken,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const token = parseBearerToken(req.headers)
  if (!token) {
    return jsonError('missing_token', 401)
  }

  const authUser = await getUserFromToken(token)
  if (!authUser?.id) {
    return jsonError('unauthenticated', 401)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return jsonError('invalid_form', 400)
  }

  const rawSpotId = formData.get('spotId')
  if (!rawSpotId || typeof rawSpotId !== 'string') {
    return jsonError('spot_id_required', 400)
  }

  const spotId = rawSpotId.trim()
  if (!spotId) {
    return jsonError('spot_id_required', 400)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return jsonError('missing_file', 400)
  }

  if (file.size <= 0) {
    return jsonError('empty_file', 400)
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'file_too_large', maxBytes: MAX_FILE_SIZE_BYTES },
      { status: 413 },
    )
  }

  const contentType = (file.type || '').toLowerCase()
  const extension = ALLOWED_IMAGE_EXTENSIONS[contentType]
  if (!extension) {
    return jsonError('invalid_file_type', 415)
  }

  const db = supabaseAdmin()
  const { data: spot, error: spotError } = await db
    .from('sticker_spots')
    .select('id, type, content_type, creator_id')
    .eq('id', spotId)
    .maybeSingle()

  if (spotError) {
    console.error('[admin/matrica/rich-content/upload] spot fetch error', spotError)
    return jsonError('server_error', 500)
  }

  if (!spot || spot.type !== 'virtual' || spot.content_type !== 'rich') {
    return jsonError('invalid_spot', 400)
  }

  const role = getUserRoleByEmail(authUser.email)
  const canManage = canManageAllSpots(role)
  if (!canManage && spot.creator_id !== authUser.id) {
    return jsonError('not_allowed', 403)
  }

  const filename = `${randomUUID()}.${extension}`
  const storagePath = `rich-content/${spotId}/${filename}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data: uploadData, error: uploadError } = await db.storage
    .from('matrica-claims')
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError || !uploadData) {
    console.error('[admin/matrica/rich-content/upload] storage error', uploadError)
    return jsonError('upload_failed', 500)
  }

  const { data: publicData } = db.storage.from('matrica-claims').getPublicUrl(uploadData.path)
  if (!publicData?.publicUrl) {
    return jsonError('upload_failed', 500)
  }

  return NextResponse.json({ success: true, url: publicData.publicUrl }, { status: 200 })
}
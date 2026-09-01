import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { canManageAllSpots, getUserRoleByEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

async function requireAuthenticatedUser(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const db = supabaseAdmin()
  const { data: { user }, error } = await db.auth.getUser(token)
  if (error || !user) return null
  return user
}

function getExtension(file: File): string {
  const name = file.name.split(/[\\/]/).pop() ?? ''
  const match = name.match(/\.([^.]+)$/)
  return match?.[1]?.toLowerCase() ?? ''
}

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('file')
  const spotId = formData.get('spot_id')

  if (!(file instanceof File)) return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  if (typeof spotId !== 'string' || !spotId.trim()) return NextResponse.json({ error: 'missing_spot_id' }, { status: 400 })

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, { status: 413 })
  }

  if (!ALLOWED_TYPES.has(file.type.toLowerCase()) || !ALLOWED_EXTENSIONS.has(getExtension(file))) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 415 })
  }

  const db = supabaseAdmin()
  const role = getUserRoleByEmail(user.email ?? null)
  const canManageAll = canManageAllSpots(role)

  const { data: spot, error: spotError } = await db
    .from('sticker_spots')
    .select('id, creator_id, type, content_type')
    .eq('id', spotId.trim())
    .maybeSingle()

  if (spotError) {
    console.error('[admin/matrica/rich-upload] spot lookup error', spotError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!spot) return NextResponse.json({ error: 'spot_not_found' }, { status: 404 })
  if (spot.type !== 'virtual' || spot.content_type !== 'rich') {
    return NextResponse.json({ error: 'not_rich_spot' }, { status: 400 })
  }

  if (!canManageAll && spot.creator_id !== user.id) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  const extension = getExtension(file) === 'jpeg' ? 'jpg' : getExtension(file)
  const safeName = `rich-${Date.now()}-${crypto.randomUUID()}.${extension}`
  const path = `rich-content/${spot.id}/${safeName}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { data, error: uploadError } = await db.storage
    .from('matrica-claims')
    .upload(path, buffer, {
      contentType: file.type.toLowerCase(),
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    console.error('[admin/matrica/rich-upload] storage error', uploadError)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: publicData } = db.storage.from('matrica-claims').getPublicUrl(data.path)
  return NextResponse.json({ url: publicData.publicUrl }, { status: 200 })
}

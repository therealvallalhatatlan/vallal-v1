import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/server'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizePath(raw: string): string | null {
  const path = raw.trim().replace(/\\/g, '/')
  if (!path || path.startsWith('/') || path.includes('..') || path.includes('//')) return null
  return path
}

function getExtension(path: string): string {
  const last = path.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')
  return dot === -1 ? '' : last.slice(dot + 1).toLowerCase()
}

function isSimpleFilename(value: string): boolean {
  return value.length > 0 && value.length <= 160 && !value.includes('/') && !value.includes('\\')
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rate = checkRateLimit(`matrica-upload:${ip}`, 10, 10 * 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds), 'Cache-Control': 'no-store' } },
    )
  }

  const adminKey = req.headers.get('x-admin-key')
  const isAdmin = Boolean(adminKey && adminKey === process.env.DEMO_ADMIN_KEY)

  let authenticatedUserId: string | null = null
  if (!isAdmin) {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    authenticatedUserId = user.id
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('file')
  const rawPath = formData.get('path')

  if (!file || !(file instanceof File)) return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  if (!rawPath || typeof rawPath !== 'string') return NextResponse.json({ error: 'missing_path' }, { status: 400 })

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, { status: 413 })
  }

  const contentType = file.type.toLowerCase()
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 415 })
  }

  const path = normalizePath(rawPath)
  if (!path) return NextResponse.json({ error: 'invalid_path' }, { status: 400 })

  const parts = path.split('/')
  const extension = getExtension(path)
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'invalid_file_extension' }, { status: 400 })
  }
  if (!isSimpleFilename(parts[parts.length - 1])) {
    return NextResponse.json({ error: 'invalid_filename' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (!isAdmin) {
    const [first, second] = parts

    // Claim photos use: <spot UUID>/<filename>.
    if (parts.length === 2 && UUID_RE.test(first)) {
      const { data: spot, error: spotError } = await db
        .from('sticker_spots')
        .select('id')
        .eq('id', first)
        .maybeSingle()

      if (spotError || !spot) {
        return NextResponse.json({ error: 'spot_not_found' }, { status: 403 })
      }
    // Phantom photos use: phantom/<shadow session UUID>/<filename>.
    } else if (parts.length === 3 && first === 'phantom' && UUID_RE.test(second)) {
      const { data: profile, error: profileError } = await db
        .from('shadow_profiles')
        .select('session_id')
        .eq('session_id', second)
        .contains('metadata', { uid: authenticatedUserId })
        .maybeSingle()

      if (profileError || !profile) {
        return NextResponse.json({ error: 'path_not_owned' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
    }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error: uploadError } = await db.storage
    .from('matrica-claims')
    .upload(path, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    console.error('[matrica/upload] storage error', uploadError)
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 })
  }

  const { data: publicData } = db.storage.from('matrica-claims').getPublicUrl(data.path)
  return NextResponse.json({ url: publicData.publicUrl }, { status: 200 })
}

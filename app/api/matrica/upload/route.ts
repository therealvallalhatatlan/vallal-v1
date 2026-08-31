import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/server'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp'])

function normalizePath(raw: string): string | null {
  const path = raw.trim().replace(/\\/g, '/')
  if (!path || path.startsWith('/') || path.includes('..') || path.includes('//')) return null
  return path
}

function getPathOwnerId(path: string): string | null {
  const [ownerId] = path.split('/')
  return ownerId && /^[0-9a-f-]{36}$/i.test(ownerId) ? ownerId : null
}

function getExtension(path: string): string {
  const last = path.split('/').pop() ?? ''
  const dot = last.lastIndexOf('.')
  return dot === -1 ? '' : last.slice(dot + 1).toLowerCase()
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

  const extension = getExtension(path)
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return NextResponse.json({ error: 'invalid_file_extension' }, { status: 400 })
  }

  // Regular users may only upload below their own UUID directory.
  // Admin uploads keep the existing flexible path behavior for Phantom/editor flows.
  if (!isAdmin) {
    const ownerId = getPathOwnerId(path)
    if (!ownerId || ownerId !== authenticatedUserId) {
      return NextResponse.json({ error: 'path_not_owned' }, { status: 403 })
    }
  }

  const db = supabaseAdmin()
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

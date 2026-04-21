import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/matrica/upload
 * Accepts multipart/form-data with:
 *   - file: image file
 *   - path: storage path (e.g. "<spot_id>/<timestamp>.jpg")
 *
 * Auth: Bearer token (regular user) or x-admin-key header (admin)
 * Uses service role for the actual upload → no Storage RLS needed.
 */
export async function POST(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────────────────
  const adminKey = req.headers.get('x-admin-key')
  const isAdmin = adminKey && adminKey === process.env.DEMO_ADMIN_KEY

  if (!isAdmin) {
    // Regular user: verify Bearer token
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
  }

  // ── Parse multipart form ─────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 })
  }

  const file = formData.get('file')
  const path = formData.get('path')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 })
  }
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'missing_path' }, { status: 400 })
  }

  // Basic path sanity check (no traversal)
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 })
  }

  // ── Upload via service role (bypasses Storage RLS) ───────────────────────
  const db = supabaseAdmin()
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error: uploadError } = await db.storage
    .from('matrica-claims')
    .upload(path, buffer, {
      contentType: file.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    console.error('[matrica/upload] storage error', uploadError)
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicData } = db.storage.from('matrica-claims').getPublicUrl(data.path)

  return NextResponse.json({ url: publicData.publicUrl }, { status: 200 })
}

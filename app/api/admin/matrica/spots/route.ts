import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { SpotStatus } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

const ADMIN_KEY = process.env.DEMO_ADMIN_KEY ?? 'letmein'

function authorize(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key')
  return key === ADMIN_KEY
}

// ── GET /api/admin/matrica/spots  (all spots, any status) ─────────────────────
export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('sticker_spots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/matrica/spots] GET error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ spots: data ?? [] })
}

// ── POST /api/admin/matrica/spots  (create a new spot) ────────────────────────
export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { title, description, image_url, lat, lng, radius_visibility, radius_claim, total_quantity } = body

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 })
  }
  const latN = Number(lat)
  const lngN = Number(lng)
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const qty = Math.max(1, Number(total_quantity) || 1)

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('sticker_spots')
    .insert({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() || null : null,
      image_url: typeof image_url === 'string' && image_url.trim() ? image_url.trim() : null,
      lat: latN,
      lng: lngN,
      radius_visibility: Math.max(1, Number(radius_visibility) || 500),
      radius_claim: Math.max(1, Number(radius_claim) || 50),
      total_quantity: qty,
      remaining_quantity: qty,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[admin/matrica/spots] POST error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ spot: data }, { status: 201 })
}

// ── PATCH /api/admin/matrica/spots  (update status) ───────────────────────────
export async function PATCH(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { id, status } = body
  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }
  const allowedStatuses: SpotStatus[] = ['active', 'empty', 'archived']
  if (!allowedStatuses.includes(status as SpotStatus)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('sticker_spots')
    .update({ status: status as SpotStatus })
    .eq('id', id.trim())
    .select('id, status')
    .single()

  if (error) {
    console.error('[admin/matrica/spots] PATCH error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ spot: data })
}

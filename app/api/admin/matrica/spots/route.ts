import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { SpotStatus, SpotType } from '@/lib/matrica'
import { canCreatePaidSpots, getUserRoleByEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type AuthUser = {
  id: string
  email: string | null
}

async function requireAuthenticatedUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const db = supabaseAdmin()
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token)

  if (error || !user) return null
  return { id: user.id, email: user.email ?? null }
}

// ── GET /api/admin/matrica/spots  (all spots, any status) ─────────────────────
export async function GET(req: NextRequest) {
  const user = await requireAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const role = getUserRoleByEmail(user.email)
  const canManageAllSpots = role === 'admin'

  const db = supabaseAdmin()
  const query = db
    .from('sticker_spots')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = canManageAllSpots
    ? await query
    : await query.eq('creator_id', user.id)

  if (error) {
    console.error('[admin/matrica/spots] GET error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({
    spots: data ?? [],
    userRole: role,
  })
}

// ── POST /api/admin/matrica/spots  (create a new spot) ────────────────────────
export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { title, description, image_url, image_urls, lat, lng, radius_visibility, radius_claim, total_quantity } = body
  const role = getUserRoleByEmail(user.email)

  const spotType: SpotType = body.spot_type === 'paid' ? 'paid' : 'free'
  const rawPriceHuf = Number(body.price_huf)
  const parsedPriceHuf = Number.isFinite(rawPriceHuf) ? Math.floor(rawPriceHuf) : 0

  if (parsedPriceHuf < 0) {
    return NextResponse.json({ error: 'invalid_price_huf' }, { status: 400 })
  }

  if (spotType === 'paid') {
    if (!canCreatePaidSpots(role)) {
      return NextResponse.json({ error: 'paid_spot_forbidden' }, { status: 403 })
    }
    if (parsedPriceHuf <= 0) {
      return NextResponse.json({ error: 'paid_price_required' }, { status: 400 })
    }
  }

  const effectivePriceHuf = spotType === 'paid' ? parsedPriceHuf : 0

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 })
  }
  const latN = Number(lat)
  const lngN = Number(lng)
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
    return NextResponse.json({ error: 'invalid_coordinates' }, { status: 400 })
  }

  const qty = Math.max(1, Number(total_quantity) || 1)

  const normalizedImageUrls = Array.isArray(image_urls)
    ? image_urls.filter((url): url is string => typeof url === 'string' && !!url.trim()).slice(0, 5)
    : []

  const primaryImageUrl =
    (typeof image_url === 'string' && image_url.trim())
      ? image_url.trim()
      : normalizedImageUrls[0] ?? null

  const db = supabaseAdmin()
  const basePayload = {
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() || null : null,
    image_url: primaryImageUrl,
    lat: latN,
    lng: lngN,
    radius_visibility: Math.max(1, Number(radius_visibility) || 500),
    radius_claim: Math.max(1, Number(radius_claim) || 50),
    total_quantity: qty,
    remaining_quantity: qty,
    status: 'active',
    spot_type: spotType,
    price_huf: effectivePriceHuf,
    creator_id: user.id,
  }

  let data: any = null
  let error: any = null

  if (normalizedImageUrls.length > 0) {
    const resultWithGallery = await db
      .from('sticker_spots')
      .insert({
        ...basePayload,
        image_urls: normalizedImageUrls,
      })
      .select()
      .single()

    data = resultWithGallery.data
    error = resultWithGallery.error

    // Backward compatibility if the image_urls column is not yet migrated.
    if (error && typeof error.message === 'string' && error.message.toLowerCase().includes('image_urls')) {
      const fallbackResult = await db
        .from('sticker_spots')
        .insert(basePayload)
        .select()
        .single()

      data = fallbackResult.data
      error = fallbackResult.error
    }
  } else {
    const result = await db
      .from('sticker_spots')
      .insert(basePayload)
      .select()
      .single()

    data = result.data
    error = result.error
  }

  if (error) {
    console.error('[admin/matrica/spots] POST error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ spot: data }, { status: 201 })
}

// ── PATCH /api/admin/matrica/spots  (update status) ───────────────────────────
export async function PATCH(req: NextRequest) {
  const user = await requireAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const role = getUserRoleByEmail(user.email)
  const canManageAllSpots = role === 'admin'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { id, status, title, description } = body
  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof status !== 'undefined') {
    const allowedStatuses: SpotStatus[] = ['active', 'empty', 'archived']
    if (!allowedStatuses.includes(status as SpotStatus)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
    }
    updates.status = status as SpotStatus
  }

  if (typeof title !== 'undefined') {
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title_required' }, { status: 400 })
    }
    updates.title = title.trim()
  }

  if (typeof description !== 'undefined') {
    updates.description = typeof description === 'string' ? description.trim() || null : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const patchQuery = db
    .from('sticker_spots')
    .update(updates)
    .eq('id', id.trim())

  const { data, error } = (canManageAllSpots
    ? await patchQuery
    : await patchQuery.eq('creator_id', user.id)
  )
    .select('id, status, title, description, spot_type, price_huf, creator_id')
    .maybeSingle()

  if (error) {
    console.error('[admin/matrica/spots] PATCH error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  return NextResponse.json({ spot: data })
}

// ── DELETE /api/admin/matrica/spots  (delete a spot) ─────────────────────────
export async function DELETE(req: NextRequest) {
  const user = await requireAuthenticatedUser(req)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const role = getUserRoleByEmail(user.email)
  const canManageAllSpots = role === 'admin'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { id } = body
  if (typeof id !== 'string' || !id.trim()) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const deleteQuery = db
    .from('sticker_spots')
    .delete()
    .eq('id', id.trim())

  const { data, error } = (canManageAllSpots
    ? await deleteQuery
    : await deleteQuery.eq('creator_id', user.id)
  )
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[admin/matrica/spots] DELETE error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}

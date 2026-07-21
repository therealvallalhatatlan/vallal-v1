import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/matrica/my-spots?type=claimed|hidden
 * Returns user's spots based on type query param
 *
 * Requires: Bearer token (authenticated user)
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const client = await createClient()
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const userId = authData.user.id
  const spotType = new URL(req.url).searchParams.get('type') || 'hidden'

  const db = supabaseAdmin()

  if (spotType === 'hidden') {
    // Return user's own created spots
    try {
      const { data, error } = await db
        .from('sticker_spots')
        .select(
          `
          id,
          creator_id,
          created_at,
          title,
          description,
          image_url,
          image_urls,
          lat,
          lng,
          status,
          spot_type,
          price_huf,
          total_quantity,
          remaining_quantity
          `
        )
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[matrica/my-spots] hidden db error', error)
        return NextResponse.json({ error: error.message || 'server_error' }, { status: 500 })
      }

      const spots = data ?? []

      return NextResponse.json({
        ok: true,
        spots,
      })
    } catch (err) {
      console.error('[matrica/my-spots] exception', err)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  // Default: claimed spots
  try {
    const { data, error } = await client
      .from('claims')
      .select(
        `
        id,
        spot_id,
        status,
        user_image_url,
        comment,
        created_at,
        sticker_spots!inner (
          id,
          title,
          description,
          image_url,
          lat,
          lng,
          status,
          total_quantity,
          remaining_quantity
        )
        `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[matrica/my-spots] claimed db error', error)
      return NextResponse.json({ error: error.message || 'server_error' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      claims: data ?? [],
    })
  } catch (err) {
    console.error('[matrica/my-spots] exception', err)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/**
 * PATCH /api/matrica/my-spots
 * Updates a user's own spot metadata.
 *
 * Body: { id, title?, description?, image_url?, price_huf? }
 */
export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const client = await createClient()
  const { data: authData, error: authError } = await client.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const spotId = typeof body.id === 'string' ? body.id.trim() : ''
  if (!spotId) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.title !== 'undefined') {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title_required' }, { status: 400 })
    }
    updates.title = body.title.trim()
  }

  if (typeof body.description !== 'undefined') {
    updates.description = typeof body.description === 'string' ? body.description.trim() || null : null
  }

  if (typeof body.image_url !== 'undefined') {
    updates.image_url = typeof body.image_url === 'string' ? body.image_url.trim() || null : null
  }

  if (typeof body.price_huf !== 'undefined') {
    const parsedPrice = Number(body.price_huf)
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'invalid_price_huf' }, { status: 400 })
    }
    updates.price_huf = Math.floor(parsedPrice)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_updates' }, { status: 400 })
  }

  const userId = authData.user.id
  const db = supabaseAdmin()

  const { data: ownership, error: ownershipError } = await db
    .from('sticker_spots')
    .select('id')
    .eq('id', spotId)
    .eq('creator_id', userId)
    .maybeSingle()

  if (ownershipError) {
    console.error('[matrica/my-spots] ownership check error', ownershipError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!ownership) {
    return NextResponse.json({ error: 'not_allowed' }, { status: 403 })
  }

  const { data: spot, error: updateError } = await db
    .from('sticker_spots')
    .update(updates)
    .eq('id', spotId)
    .select('id, title, description, image_url, image_urls, status, spot_type, price_huf, total_quantity, remaining_quantity')
    .single()

  if (updateError) {
    console.error('[matrica/my-spots] patch error', updateError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, spot })
}

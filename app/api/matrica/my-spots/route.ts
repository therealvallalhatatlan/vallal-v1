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
    // Return user's hidden spots (joins hidden_spots with sticker_spots)
    try {
      const { data, error } = await db
        .from('hidden_spots')
        .select(
          `
          id,
          spot_id,
          created_at,
          sticker_spots (
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
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[matrica/my-spots] hidden db error', error)
        return NextResponse.json({ error: error.message || 'server_error' }, { status: 500 })
      }

      // Flatten the response to make it easier to work with
      const spots = (data ?? []).map((item: any) => ({
        ...item.sticker_spots,
        hidden_spot_id: item.id,
        created_at: item.created_at,
      }))

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

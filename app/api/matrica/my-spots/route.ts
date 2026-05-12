import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/matrica/my-spots
 * Returns user's claimed spots (joins claims with sticker_spots)
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

  // Use service role client to bypass RLS for admin purposes, but filter by user_id
  const { createClient: createAdminClient } = await import('@/lib/browser')
  
  // Actually, we should use the authenticated client's query within RLS
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
    console.error('[matrica/my-spots] db error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    claims: data ?? [],
  })
}

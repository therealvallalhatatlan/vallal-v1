import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/matrica/hidden-spots/[spotId]
 * Deletes a user's hidden spot (only own hidden spots)
 *
 * Requires: Bearer token
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ spotId: string }> }
) {
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
  const { spotId } = await params

  if (!spotId) {
    return NextResponse.json({ error: 'invalid_spot_id' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Verify hidden spot record exists and belongs to user
  const { data: hiddenSpot, error: fetchError } = await db
    .from('hidden_spots')
    .select('id, spot_id, creator_id')
    .eq('spot_id', spotId)
    .eq('creator_id', userId)
    .single()

  if (fetchError || !hiddenSpot) {
    return NextResponse.json({ error: 'hidden_spot_not_found' }, { status: 404 })
  }

  // Delete the hidden spot record
  const { error: deleteError } = await db
    .from('hidden_spots')
    .delete()
    .eq('id', hiddenSpot.id)

  if (deleteError) {
    console.error('[matrica/hidden-spots] delete error', deleteError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const POINTS_PER_FOUND = 1

/**
 * GET /api/matrica/score
 * Returns the authenticated user's score based on found claims.
 *
 * Business rule:
 * - Every reported found sticker is worth 1 point.
 * - Pending and accepted claims both count as found.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const anonClient = await createClient()
  const { data: authData, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const db = supabaseAdmin()

  const { count: foundCount, error: foundError } = await db
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .in('status', ['pending', 'accepted'])

  if (foundError) {
    console.error('[matrica/score] db error (foundCount)', foundError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const { count: acceptedCount, error: acceptedError } = await db
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .eq('status', 'accepted')

  if (acceptedError) {
    console.error('[matrica/score] db error (acceptedCount)', acceptedError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const found = foundCount ?? 0
  const accepted = acceptedCount ?? 0

  return NextResponse.json({
    found,
    accepted,
    score: found * POINTS_PER_FOUND,
  })
}

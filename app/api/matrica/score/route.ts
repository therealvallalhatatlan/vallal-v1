import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const POINTS_PER_CLAIM = 10

/**
 * GET /api/matrica/score
 * Returns the authenticated user's score based on accepted claims.
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
  const { count, error } = await db
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', authData.user.id)
    .eq('status', 'accepted')

  if (error) {
    console.error('[matrica/score] db error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const accepted = count ?? 0
  return NextResponse.json({ accepted, score: accepted * POINTS_PER_CLAIM })
}

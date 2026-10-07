import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserFromToken } from '@/lib/auth'

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'unauthenticated' },
      { status: 401 },
    )
  }

  const user = await getUserFromToken(token)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthenticated' },
      { status: 401 },
    )
  }

  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()
  const { data, error } = await supabaseAdmin().rpc('get_online_user_profiles', {
    p_since: since,
  })

  if (error) {
    console.error('[matrica/online-users] RPC failed', error)
    return NextResponse.json(
      { ok: false, error: 'presence_fetch_failed' },
      { status: 500 },
    )
  }

  const users = (data ?? []).map((row: {
    user_id: string
    nickname: string | null
    avatar_url: string | null
    score: number | string | null
    accepted: number | string | null
    lat: number | null
    lng: number | null
    last_heartbeat: string | null
  }) => {
    const score = typeof row.score === 'string' ? Number(row.score) : row.score ?? 0
    const accepted = typeof row.accepted === 'string' ? Number(row.accepted) : row.accepted ?? 0

    return {
      id: row.user_id,
      nickname: row.nickname?.trim() || `user-${row.user_id.slice(0, 6)}`,
      avatarUrl: row.avatar_url ?? null,
      badge: Number.isFinite(accepted) ? Math.max(0, Math.floor(accepted)) : 0,
      score: Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0,
      accepted: Number.isFinite(accepted) ? Math.max(0, Math.floor(accepted)) : 0,
      lat: typeof row.lat === 'number' ? row.lat : undefined,
      lng: typeof row.lng === 'number' ? row.lng : undefined,
      last_heartbeat: row.last_heartbeat ?? undefined,
    }
  })

  return NextResponse.json({ ok: true, users })
}

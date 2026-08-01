import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ONLINE_WINDOW_MS = 2 * 60 * 1000

export const dynamic = 'force-dynamic'

async function requireUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null

  return data.user
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req)
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  const supabase = supabaseAdmin()
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()

  const { data: presenceRows, error: presenceError } = await supabase
    .from('reader_presence')
    .select('user_id,last_heartbeat')
    .gte('last_heartbeat', since)
    .order('last_heartbeat', { ascending: false })

  if (presenceError) {
    return NextResponse.json({ ok: false, error: 'presence_fetch_failed' }, { status: 500 })
  }

  const userIds = Array.from(new Set((presenceRows ?? []).map((row) => row.user_id).filter(Boolean))) as string[]
  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, users: [] })
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('users')
    .select('id,nickname')
    .in('id', userIds)

  if (profilesError) {
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }

  const profileMap = new Map<string, { nickname: string; avatarUrl: string | null }>()
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      nickname: typeof profile.nickname === 'string' && profile.nickname.trim() ? profile.nickname.trim() : `user-${profile.id.slice(0, 6)}`,
      avatarUrl: null,
    })
  }

  const users = userIds.map((id) => {
    const profile = profileMap.get(id)
    return {
      id,
      nickname: profile?.nickname ?? `user-${id.slice(0, 6)}`,
      avatarUrl: profile?.avatarUrl ?? null,
    }
  })

  return NextResponse.json({ ok: true, users })
}

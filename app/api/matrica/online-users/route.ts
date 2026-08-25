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
    return NextResponse.json(
      { ok: false, error: 'unauthenticated' },
      { status: 401 }
    )
  }

  const supabase = supabaseAdmin()
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()

  const { data: presenceRows, error: presenceError } = await supabase
    .from('reader_presence')
    .select('user_id,last_heartbeat,lat,lng')
    .gte('last_heartbeat', since)
    .order('last_heartbeat', { ascending: false })

  if (presenceError) {
    return NextResponse.json(
      { ok: false, error: 'presence_fetch_failed' },
      { status: 500 }
    )
  }

  const presenceMap = new Map<
    string,
    { last_heartbeat?: string; lat?: number; lng?: number }
  >()

  for (const row of presenceRows ?? []) {
    if (!row?.user_id) continue

    presenceMap.set(row.user_id, {
      last_heartbeat: row.last_heartbeat ?? undefined,
      lat: typeof row.lat === 'number' ? row.lat : undefined,
      lng: typeof row.lng === 'number' ? row.lng : undefined,
    })
  }

  const userIds = Array.from(
    new Set((presenceRows ?? []).map((row) => row.user_id).filter(Boolean))
  ) as string[]

  if (userIds.length === 0) {
    return NextResponse.json({ ok: true, users: [] })
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('users')
    .select('id,nickname')
    .in('id', userIds)

  if (profilesError) {
    return NextResponse.json(
      { ok: false, error: 'profile_fetch_failed' },
      { status: 500 }
    )
  }

  const profileMap = new Map<string, { nickname: string }>()
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      nickname:
        typeof profile.nickname === 'string' && profile.nickname.trim()
          ? profile.nickname.trim()
          : `user-${profile.id.slice(0, 6)}`,
    })
  }

  const statsMap = new Map<string, { score: number; accepted: number }>()

  if (userIds.length > 0) {
    const { data: claimRows, error: claimError } = await supabase
      .from('claims')
      .select('user_id,status')
      .in('user_id', userIds)
      .in('status', ['pending', 'accepted'])

    if (claimError) {
      console.error('[matrica/online-users] claim stats error', claimError)
    } else {
      for (const claim of claimRows ?? []) {
        if (!claim?.user_id) continue

        const entry = statsMap.get(claim.user_id) ?? { score: 0, accepted: 0 }
        if (claim.status === 'pending' || claim.status === 'accepted') {
          entry.score += 1
        }
        if (claim.status === 'accepted') {
          entry.accepted += 1
        }

        statsMap.set(claim.user_id, entry)
      }
    }
  }

  const metadataMap = new Map<string, { avatarUrl: string | null }>()

  const { data: authUsers, error: authUsersError } = await supabase
    .from('auth.users')
    .select('id,user_metadata')
    .in('id', userIds)

  if (authUsersError) {
    console.error('[matrica/online-users] auth metadata error', authUsersError)
  } else {
    for (const authUser of authUsers ?? []) {
      if (!authUser?.id) continue

      const metadataRaw = authUser.user_metadata
      const metadata =
        typeof metadataRaw === 'string'
          ? (() => {
              try {
                return JSON.parse(metadataRaw)
              } catch {
                return null
              }
            })()
          : metadataRaw

      const avatarCandidate =
        metadata && typeof metadata.avatar_url === 'string' && metadata.avatar_url
          ? metadata.avatar_url
          : metadata && typeof metadata.avatarUrl === 'string'
            ? metadata.avatarUrl
            : null

      metadataMap.set(authUser.id, { avatarUrl: avatarCandidate })
    }
  }

  const users = userIds.map((id) => {
    const profile = profileMap.get(id)
    const avatarRow = metadataMap.get(id)
    const stats = statsMap.get(id)
    const presence = presenceMap.get(id)

    return {
      id,
      nickname:
        profile?.nickname ?? `user-${id.slice(0, 6)}`,
      avatarUrl: avatarRow?.avatarUrl ?? null,
      badge: stats?.accepted ?? 0,
      score: stats?.score ?? 0,
      accepted: stats?.accepted ?? 0,
      lat: presence?.lat,
      lng: presence?.lng,
      last_heartbeat: presence?.last_heartbeat,
    }
  })

  return NextResponse.json({ ok: true, users })
}
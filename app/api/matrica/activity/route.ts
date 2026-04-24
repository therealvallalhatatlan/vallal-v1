import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ ok: false, error: 'missing_token' }, { status: 401 })
  }

  const anonClient = await createClient()
  const { data: authData, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })
  }

  const url = new URL(req.url)
  const limitRaw = Number(url.searchParams.get('limit') || '30')
  const limit = Math.min(80, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 30))

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('claims')
    .select('id, created_at, status, comment, user_id, sticker_spots(title)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[matrica/activity] fetch error', error)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }

  const userIds = Array.from(
    new Set(
      (data ?? [])
        .map((row: any) => (typeof row.user_id === 'string' ? row.user_id : null))
        .filter((id): id is string => Boolean(id))
    )
  )

  const nicknameByUserId = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await db
      .from('users')
      .select('id, nickname')
      .in('id', userIds)

    if (profileError) {
      console.error('[matrica/activity] profile fetch error', profileError)
      return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
    }

    for (const profile of profiles ?? []) {
      if (typeof profile.id === 'string' && typeof profile.nickname === 'string' && profile.nickname.trim()) {
        nicknameByUserId.set(profile.id, profile.nickname.trim())
      }
    }
  }

  const items = (data ?? []).map((row: any) => ({
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    comment: typeof row.comment === 'string' ? row.comment.slice(0, 160) : null,
    user_alias: nicknameByUserId.get(row.user_id) ?? 'ismeretlen',
    spot_title: row.sticker_spots?.title ?? 'ismeretlen pont',
  }))

  return NextResponse.json({ ok: true, items })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function requireUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { user: null, error: 'missing_token' as const }

  const anonClient = await createClient()
  const { data: authData, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !authData?.user) {
    return { user: null, error: 'unauthenticated' as const }
  }

  return { user: authData.user, error: null }
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser(req)
  if (!user) {
    return NextResponse.json({ ok: false, error }, { status: 401 })
  }

  const { data, error: dbError } = await supabaseAdmin
    .from('pm_unread_counts')
    .select('other_user_id, unread_count, last_message_at')
    .eq('user_id', user.id)
    .gt('unread_count', 0)
    .order('last_message_at', { ascending: false })

  if (dbError) {
    console.error('[matrica/pm-unread] fetch error', dbError)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }

  const unreadByUserId: Record<string, number> = {}
  for (const row of data ?? []) {
    if (!row?.other_user_id) continue
    const count = typeof row.unread_count === 'number' && Number.isFinite(row.unread_count)
      ? Math.max(0, Math.floor(row.unread_count))
      : 0
    if (count > 0) {
      unreadByUserId[row.other_user_id] = count
    }
  }

  return NextResponse.json({ ok: true, unreadByUserId })
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireUser(req)
  if (!user) {
    return NextResponse.json({ ok: false, error }, { status: 401 })
  }

  let payload: { otherUserId?: unknown }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const otherUserId = typeof payload.otherUserId === 'string' ? payload.otherUserId.trim() : ''
  if (!otherUserId) {
    return NextResponse.json({ ok: false, error: 'missing_other_user_id' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('pm_unread_counts')
    .upsert({
      user_id: user.id,
      other_user_id: otherUserId,
      unread_count: 0,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,other_user_id' })

  if (updateError) {
    console.error('[matrica/pm-unread] mark-as-read error', updateError)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

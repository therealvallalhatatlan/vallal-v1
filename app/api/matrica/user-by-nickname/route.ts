import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

  const nickname = req.nextUrl.searchParams.get('nickname')?.trim() ?? ''
  if (!nickname) {
    return NextResponse.json({ ok: false, error: 'nickname_required' }, { status: 400 })
  }

  const normalizedNickname = nickname.toLocaleLowerCase('hu-HU')
  const supabase = supabaseAdmin()

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id,nickname')
    .eq('nickname', normalizedNickname)
    .maybeSingle()

  if (profileError) {
    return NextResponse.json({ ok: false, error: 'profile_fetch_failed' }, { status: 500 })
  }

  if (!profile?.id) {
    return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: profile.id,
      nickname: typeof profile.nickname === 'string' && profile.nickname.trim()
        ? profile.nickname.trim()
        : normalizedNickname,
      avatarUrl: null,
    },
  })
}

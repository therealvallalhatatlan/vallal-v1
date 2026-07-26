import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeUuid, isPhantomInsider } from '@/lib/phantom'
import { isEditorEmail } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface SessionBody {
  shadow_session_id?: unknown
  sponsor_session_id?: unknown
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const anon = await createClient()
  const { data: authData, error: authError } = await anon.auth.getUser(token)
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: SessionBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = normalizeUuid(body.shadow_session_id)
  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_shadow_session_id' }, { status: 400 })
  }

  const sponsorId = normalizeUuid(body.sponsor_session_id)
  const isEditor = isEditorEmail(authData.user.email)
  const insider = isEditor || isPhantomInsider(authData.user)

  const db = supabaseAdmin()
  const { data: existing, error: existingError } = await db
    .from('shadow_profiles')
    .select('session_id, sponsor_id, insider_enabled, drop_credits, banned_at, burn_reason')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (existingError) {
    console.error('[phantom/session] existing lookup error', existingError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (existing?.session_id) {
    const { data: updated, error: updateError } = await db
      .from('shadow_profiles')
      .update({
        insider_enabled: existing.insider_enabled || insider,
      })
      .eq('session_id', sessionId)
      .select('session_id, sponsor_id, insider_enabled, drop_credits, banned_at, burn_reason')
      .single()

    if (updateError) {
      console.error('[phantom/session] update error', updateError)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      profile: updated,
      one_hop_burndown: true,
    })
  }

  const { data: created, error: createError } = await db
    .from('shadow_profiles')
    .insert({
      session_id: sessionId,
      sponsor_id: sponsorId,
      insider_enabled: insider,
      drop_credits: insider ? 3 : 0,
      metadata: {
        uid: authData.user.id,
      },
    })
    .select('session_id, sponsor_id, insider_enabled, drop_credits, banned_at, burn_reason')
    .single()

  if (createError) {
    console.error('[phantom/session] create error', createError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    profile: created,
    one_hop_burndown: true,
  })
}

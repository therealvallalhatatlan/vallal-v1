import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeUuid } from '@/lib/phantom'

export const dynamic = 'force-dynamic'

interface RedeemBody {
  shadow_session_id?: unknown
  voucher_code?: unknown
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

  let body: RedeemBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const sessionId = normalizeUuid(body.shadow_session_id)
  const voucherCode = typeof body.voucher_code === 'string' ? body.voucher_code.trim() : ''

  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_shadow_session_id' }, { status: 400 })
  }

  if (!voucherCode) {
    return NextResponse.json({ error: 'missing_voucher_code' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .rpc('redeem_shadow_voucher', {
      p_voucher_code: voucherCode,
      p_session_id: sessionId,
    })

  if (error) {
    console.error('[phantom/vouchers/redeem] rpc error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row || row.ok !== true) {
    return NextResponse.json({
      ok: false,
      error: row?.message ?? 'redeem_failed',
      credits_added: Number(row?.credits_added || 0),
    }, { status: 409 })
  }

  return NextResponse.json({
    ok: true,
    credits_added: Number(row.credits_added || 0),
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit'
import { getPhantomAccessPin, hashPhantomAccess, PHANTOM_ACCESS_COOKIE } from '@/lib/security/phantomAccess'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rate = checkRateLimit(`phantom-pin:${ip}`, 5, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: rate.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds), 'Cache-Control': 'no-store' } },
    )
  }

  let body: { pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
  const expected = getPhantomAccessPin()

  if (!expected) return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(expected) || pin !== expected) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(PHANTOM_ACCESS_COOKIE, hashPhantomAccess(pin), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/phantom',
    maxAge: 60 * 60 * 4,
  })

  return response
}

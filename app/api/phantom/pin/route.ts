import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export async function POST(req: NextRequest) {
  let body: { pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const pin = typeof body.pin === 'string' ? body.pin.trim() : ''
  const expected = process.env.ADMIN_DASHBOARD_PIN

  if (!expected) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'invalid_pin_format' }, { status: 400 })
  }

  if (!safeEquals(pin, expected)) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}

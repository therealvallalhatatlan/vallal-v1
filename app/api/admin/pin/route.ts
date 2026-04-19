import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const ADMIN_EMAIL = 'planktone@gmail.com';

function hashPin(pin: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback';
  return createHash('sha256').update(pin + secret).digest('hex');
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { pin?: unknown };
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';

  const expectedPin = process.env.ADMIN_DASHBOARD_PIN;
  if (!expectedPin) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  if (!pin || pin !== expectedPin) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 401 });
  }

  const cookieValue = hashPin(pin);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('x-admin-pin', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v3/dashboard',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return res;
}

export { ADMIN_EMAIL, hashPin };

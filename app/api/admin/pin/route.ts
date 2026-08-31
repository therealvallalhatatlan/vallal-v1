import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/security/rateLimit';

function hashPin(pin: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback';
  return createHash('sha256').update(pin + secret).digest('hex');
}

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkRateLimit(`admin-pin:${ip}`, 5, 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSeconds: limit.retryAfterSeconds },
      {
        status: 429,
        headers: {
          'Retry-After': String(limit.retryAfterSeconds),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  let body: { pin?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  const expectedPin = process.env.ADMIN_DASHBOARD_PIN;

  if (!expectedPin) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(expectedPin)) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 401 });
  }

  if (!safeEquals(pin, expectedPin)) {
    return NextResponse.json({ error: 'invalid_pin' }, { status: 401 });
  }

  const cookieValue = hashPin(pin);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('x-admin-pin', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/v3/dashboard',
    maxAge: 60 * 60 * 24,
  });

  return res;
}

export { hashPin };

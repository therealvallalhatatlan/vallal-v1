import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function requireUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// POST /api/push/subscribe — save a push subscription
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { endpoint, keys } = body.subscription ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('user_push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    console.error('[PUSH] subscribe upsert error:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — deactivate a subscription
export async function DELETE(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.endpoint) {
    return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('user_push_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('endpoint', body.endpoint)
    .eq('user_id', user.id);

  if (error) {
    console.error('[PUSH] unsubscribe error:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

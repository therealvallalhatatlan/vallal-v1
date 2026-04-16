import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase/admin';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? 'mailto:noreply@vallalhatatlan.online',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
);

// Internal endpoint — protected by CRON_SECRET_TOKEN, not public
// POST /api/push/send
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token || token !== process.env.CRON_SECRET_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { userId?: string; title?: string; body?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const { userId, title, body: msgBody, url } = body;
  if (!userId || !title || !msgBody) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const { data: subscriptions, error } = await supabaseAdmin
    .from('user_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('[PUSH] send: db fetch error:', error.message);
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_active_subscriptions' });
  }

  const payload = JSON.stringify({ title, body: msgBody, url: url ?? '/v3' });
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent += 1;
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 means the subscription is no longer valid
      if (status === 404 || status === 410) {
        await supabaseAdmin
          .from('user_push_subscriptions')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', sub.id);
        console.warn('[PUSH] subscription expired, deactivated:', sub.endpoint.slice(0, 60));
      } else {
        console.error('[PUSH] send error for', sub.endpoint.slice(0, 60), err);
      }
    }
  }

  return NextResponse.json({ ok: true, sent });
}

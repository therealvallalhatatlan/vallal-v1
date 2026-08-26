import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { guardWriteOperation } from '@/lib/systemGuard';
import { createClient } from '@/lib/server';
import { dispatchPushNotification } from '@/lib/push/dispatch';
import { getPrivateRoomSenderRole, isPrivateRoomId, isPrivateRoomParticipant, parsePrivateRoomId } from '@/lib/live/privateRooms';

const DEFAULT_ROOM_ID = 'nyitott-muhely';
const MATRICA_ROOM_ID = 'matrica-global';
const MAX_MESSAGE_LENGTH = 200;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 6;
const rateMap = new Map<string, number[]>();

type SenderRole = 'viewer' | 'broadcaster';

function isSenderRole(value: string): value is SenderRole {
  return value === 'viewer' || value === 'broadcaster';
}

function normalizeRoomId(value: unknown): string {
  const roomId = typeof value === 'string' ? value.trim() : '';
  return roomId || DEFAULT_ROOM_ID;
}

function requiresAuthenticatedWriter(roomId: string): boolean {
  return roomId === MATRICA_ROOM_ID || roomId === 'matrica' || isPrivateRoomId(roomId);
}

async function getAuthenticatedUser(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { user: null, error: 'auth_required' as const };
  }

  const anonClient = await createClient();
  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData?.user) {
    return { user: null, error: 'unauthenticated' as const };
  }

  return { user: authData.user, error: null };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = normalizeRoomId(url.searchParams.get('room_id'));
  const before = url.searchParams.get('before');
  const limitRaw = Number(url.searchParams.get('limit') || '80');
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 80));

  if (isPrivateRoomId(roomId)) {
    const { user, error } = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ ok: false, error }, { status: error === 'auth_required' ? 401 : 401 });
    }
    if (!isPrivateRoomParticipant(roomId, user.id)) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
  }

  let query = supabaseAdmin
    .from('live_chat_messages')
    .select('id,room_id,display_name,sender_role,body,created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch live chat messages:', error);
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }

  const messages = (data ?? []).slice().reverse();
  return NextResponse.json({ ok: true, messages });
}

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();
  const t0 = Date.now();
  // track sender user id for private room handling
  let senderUserId: string | undefined;
  console.log(`[${requestId}] [LIVE CHAT API] POST START`);
  console.log(`[${requestId}] [LIVE CHAT API] guard START`);
  const tGuard = Date.now();
  const guardResponse = await guardWriteOperation(req as any);
  console.log(`[${requestId}] [LIVE CHAT API] guard END - ${Date.now() - tGuard}ms`);
  if (guardResponse) {
    console.error('[LIVE CHAT API ERROR]', { step: 'guardWriteOperation', result: true });
    return NextResponse.json(
      { ok: false, error: 'write_guard_active', debug: 'guardWriteOperation blocked the request' },
      { status: 503 }
    );
  }

  console.log(`[${requestId}] [LIVE CHAT API] bodyParse START`);
  const tBody = Date.now();
  let payload: unknown;
  try {
    payload = await req.json();
    console.log(`[${requestId}] [LIVE CHAT API] bodyParse END - ${Date.now() - tBody}ms`);
  } catch {
    console.log(`[${requestId}] [LIVE CHAT API] bodyParse ERROR - ${Date.now() - tBody}ms`);
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const { room_id, display_name, sender_role, body } = payload as {
    room_id?: unknown;
    display_name?: unknown;
    sender_role?: unknown;
    body?: unknown;
  };

  const roomId = normalizeRoomId(room_id);
  const displayName = (typeof display_name === 'string' ? display_name : '').trim().slice(0, 48);
  const role = (typeof sender_role === 'string' ? sender_role : '').trim();
  const messageBody = (typeof body === 'string' ? body : '').trim().slice(0, MAX_MESSAGE_LENGTH);
  let effectiveDisplayName = displayName;
  let effectiveRole = role;
  if (requiresAuthenticatedWriter(roomId)) {
    console.log(`[${requestId}] [LIVE CHAT API] auth START`);
    const tAuth = Date.now();
    const { user, error } = await getAuthenticatedUser(req);
    console.log(`[${requestId}] [LIVE CHAT API] auth END - ${Date.now() - tAuth}ms`);
    if (!user) {
      console.error('[LIVE CHAT API ERROR]', { step: 'authenticate', room_id: roomId, error });
      return NextResponse.json(
        { ok: false, error, debug: 'authentication failed for private room' },
        { status: 401 }
      );
    }
    senderUserId = user.id;

    if (isPrivateRoomId(roomId)) {
      console.log(`[${requestId}] [LIVE CHAT API] privateRoomValidation START`);
      if (!isPrivateRoomParticipant(roomId, user.id)) {
        console.log(`[${requestId}] [LIVE CHAT API] privateRoomValidation END - ${Date.now() - tAuth}ms`);
        console.error('[LIVE CHAT API ERROR]', { step: 'participant', room_id: roomId, user: user.id });
        return NextResponse.json(
          { ok: false, error: 'forbidden', debug: 'user not in private room' },
          { status: 403 }
        );
      }
      console.log(`[${requestId}] [LIVE CHAT API] privateRoomValidation END - ${Date.now() - tAuth}ms`);

      const privateRole = getPrivateRoomSenderRole(roomId, user.id);
      if (!privateRole) {
        console.error('[LIVE CHAT API ERROR]', { step: 'privateRole', room_id: roomId, user: user.id });
        return NextResponse.json(
          { ok: false, error: 'forbidden', debug: 'private room role missing' },
          { status: 403 }
        );
      }
      effectiveRole = privateRole;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('nickname')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Failed to fetch nickname for chat message:', profileError);
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    const nickname = typeof profile?.nickname === 'string' ? profile.nickname.trim() : '';
    if (!nickname) {
      return NextResponse.json(
        { ok: false, error: 'nickname_required' },
        { status: 400 }
      );
    }
    effectiveDisplayName = nickname.slice(0, 48);
  }

  if (!effectiveDisplayName || !isSenderRole(effectiveRole) || !messageBody) {
    console.error('[LIVE CHAT API ERROR]', { step: 'validation', room_id: roomId, payload: { displayName, effectiveRole, messageBody } });
    return NextResponse.json({ ok: false, error: 'missing_fields', debug: 'display name or role missing' }, { status: 400 });
  }

  const ip =
    (req.headers.get('x-forwarded-for') || '').split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const now = Date.now();
  const previous = rateMap.get(ip) || [];
  const recent = previous.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  rateMap.set(ip, recent);

  console.log(`[${requestId}] [LIVE CHAT API] rateLimit START`);
  const tRate = Date.now();
  if (recent.length > RATE_LIMIT_MAX) {
    console.log(`[${requestId}] [LIVE CHAT API] rateLimit END - ${Date.now() - tRate}ms, count=${recent.length}`);
    console.error('[LIVE CHAT API ERROR]', { step: 'rate_limit', ip, limit: RATE_LIMIT_MAX });
    return NextResponse.json(
      { ok: false, error: 'rate_limited', debug: 'rate limit exceeded' },
      { status: 429 }
    );
  }
  console.log(`[${requestId}] [LIVE CHAT API] rateLimit END - ${Date.now() - tRate}ms, count=${recent.length}`);

  console.log(`[${requestId}] [LIVE CHAT API] insert START`);
  const tInsert = Date.now();
  const { data, error } = await supabaseAdmin
    .from('live_chat_messages')
    .insert([
      {
        room_id: roomId,
        display_name: effectiveDisplayName,
        sender_role: effectiveRole,
        body: messageBody,
      },
    ])
    .select('id,room_id,display_name,sender_role,body,created_at')
    .single();
  console.log(`[${requestId}] [LIVE CHAT API] insert END - ${Date.now() - tInsert}ms`);

  if (error || !data) {
    console.error('[LIVE CHAT API ERROR]', { step: 'insert', room_id: roomId, error });
    return NextResponse.json({ ok: false, error: 'db_error', debug: 'live_chat_messages insert failed' }, { status: 500 });
  }

  console.log(`[${requestId}] [LIVE CHAT API] INSERT SUCCESS`, { id: data.id });
  // Private messages can trigger a targeted push for the other participant.
  if (isPrivateRoomId(roomId)) {
    const participants = parsePrivateRoomId(roomId);
    if (participants && senderUserId) {
      const normalizedSender = senderUserId.trim().toLowerCase();
      const recipientUserId = participants[0] === normalizedSender ? participants[1] : participants[0];
      if (recipientUserId && recipientUserId !== normalizedSender) {
        let unreadCountForRecipient = 1;

        console.log(`[${requestId}] [LIVE CHAT API] increment_pm_unread START`);
        const tRpc = Date.now();
        const { data: unreadResult, error: unreadError } = await supabaseAdmin.rpc('increment_pm_unread', {
          p_recipient_user_id: recipientUserId,
          p_other_user_id: normalizedSender,
        });
        console.log(`[${requestId}] [LIVE CHAT API] increment_pm_unread END - ${Date.now() - tRpc}ms`);
        if (unreadError) {
          console.error('[LIVE CHAT API ERROR]', { step: 'increment_pm_unread', error: unreadError });
          console.log(`[${requestId}] [LIVE CHAT API] UNREAD RPC ERROR`, { error: unreadError });
        } else if (typeof unreadResult === 'number' && Number.isFinite(unreadResult)) {
          unreadCountForRecipient = Math.max(1, Math.floor(unreadResult));
          console.log(`[${requestId}] [LIVE CHAT API] UNREAD RPC SUCCESS`, { unreadCountForRecipient });
        }
        void dispatchPushNotification({
          userId: recipientUserId,
          title: `${effectiveDisplayName} uzenetet kuldott`,
          body: messageBody.slice(0, 120),
          url: `/halozat?pm=${encodeURIComponent(normalizedSender)}`,
          unreadCount: unreadCountForRecipient,
          tag: `pm:${recipientUserId}:${normalizedSender}`,
        }).catch((pushError) => {
          console.warn('[LIVE-CHAT] private push dispatch failed:', pushError);
        });
        console.log(`[${requestId}] [LIVE CHAT API] push DISPATCHED`);
      }
    }
  }

  console.log(`[${requestId}] [LIVE CHAT API] response SENT - total ${Date.now() - t0}ms`);
  const responseBody = { ok: true, message: data };
  console.log(`[${requestId}] [LIVE CHAT API] RESPONSE`, {
    status: 200,
    body: responseBody,
    durationMs: Date.now() - t0,
  });
  return NextResponse.json(responseBody);
}
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { guardWriteOperation } from '@/lib/systemGuard';

const DEFAULT_ROOM_ID = 'nyitott-muhely';
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = normalizeRoomId(url.searchParams.get('room_id'));
  const before = url.searchParams.get('before');
  const limitRaw = Number(url.searchParams.get('limit') || '80');
  const limit = Math.min(200, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 80));

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
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
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

  if (!displayName || !isSenderRole(role) || !messageBody) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
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

  if (recent.length > RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const { data, error } = await supabaseAdmin
    .from('live_chat_messages')
    .insert([
      {
        room_id: roomId,
        display_name: displayName,
        sender_role: role,
        body: messageBody,
      },
    ])
    .select('id,room_id,display_name,sender_role,body,created_at')
    .single();

  if (error || !data) {
    console.error('Failed to insert live chat message:', error);
    return NextResponse.json({ ok: false, error: 'db_error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: data });
}
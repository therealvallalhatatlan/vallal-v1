
import { NextRequest, NextResponse } from 'next/server';
import { handleGyontatas } from '@/lib/gyontatoszek/service';
import {
  GYONTATAS_HISTORY_PAGE_SIZE,
  MAX_GYONTATAS_MESSAGE_LENGTH,
  normalizeBehaviorModulation,
} from '@/lib/gyontatoszek/types';
import { getConversationForHistory, listConversationMessages } from '@/lib/gyontatoszek/repository';
import { createClient } from '@/lib/server';

// Edge-compatible UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const runtime = 'nodejs';

async function requireAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function GET(req: NextRequest) {
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const session_id = req.nextUrl.searchParams.get('session_id') || req.headers.get('x-session-id');

  const conversation = await getConversationForHistory({
    userId: user.id,
    sessionId: session_id,
  });

  if (!conversation) {
    return NextResponse.json({ session_id: session_id || '', messages: [] });
  }

  const messages = await listConversationMessages(conversation.id, GYONTATAS_HISTORY_PAGE_SIZE);
  return NextResponse.json({ session_id: conversation.session_id, messages });
}

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const data = await req.json();
  if (!data || typeof data.confession !== 'string' || !data.confession.trim()) {
    return new Response('Missing or invalid confession', { status: 400 });
  }
  const confession = data.confession.trim();
  if (confession.length > MAX_GYONTATAS_MESSAGE_LENGTH) {
    return new Response('Confession too long', { status: 400 });
  }

  const debug = req.nextUrl.searchParams.get('debug') === 'true' || data.debug === true;
  const modulation = normalizeBehaviorModulation(data.modulation);

  let session_id =
    (typeof data.session_id === 'string' && data.session_id.trim()) ||
    req.headers.get('x-session-id') ||
    undefined;

  if (!session_id) {
    session_id = uuidv4();
  }

  return handleGyontatas({
    confession,
    session_id,
    user_id: user.id,
    user_email: user.email ?? null,
    debug,
    modulation,
  });
}

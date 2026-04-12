
import { NextRequest, NextResponse } from 'next/server';
import { handleGyontatas } from '@/lib/gyontatoszek/service';
import {
  GYONTATAS_HISTORY_PAGE_SIZE,
  MAX_GYONTATAS_MESSAGE_LENGTH,
} from '@/lib/gyontatoszek/types';
import { listMessagesBySessionId } from '@/lib/gyontatoszek/repository';

// Edge-compatible UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const runtime = 'edge'; // for streaming

export async function GET(req: NextRequest) {
  const session_id = req.nextUrl.searchParams.get('session_id') || req.headers.get('x-session-id');

  if (!session_id) {
    return NextResponse.json({ session_id: '', messages: [] });
  }

  const messages = await listMessagesBySessionId(session_id, GYONTATAS_HISTORY_PAGE_SIZE);
  return NextResponse.json({ session_id, messages });
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  if (!data || typeof data.confession !== 'string' || !data.confession.trim()) {
    return new Response('Missing or invalid confession', { status: 400 });
  }
  const confession = data.confession.trim();
  if (confession.length > MAX_GYONTATAS_MESSAGE_LENGTH) {
    return new Response('Confession too long', { status: 400 });
  }

  let session_id =
    (typeof data.session_id === 'string' && data.session_id.trim()) ||
    req.headers.get('x-session-id') ||
    undefined;

  if (!session_id) {
    session_id = uuidv4();
  }

  return handleGyontatas({ confession, session_id });
}


import { NextRequest } from 'next/server';
import { handleGyontatas } from '@/lib/gyontatoszek/service';
import { randomUUID } from 'crypto';

export const runtime = 'edge'; // for streaming

export async function POST(req: NextRequest) {
  const data = await req.json();
  if (!data || typeof data.confession !== 'string' || !data.confession.trim()) {
    return new Response('Missing or invalid confession', { status: 400 });
  }
  // Try to get session_id from cookie, header, or generate new
  let session_id = req.headers.get('x-session-id') || undefined;
  if (!session_id) {
    // Optionally, try to get from cookies (if using cookies for session)
    // const cookie = req.cookies.get('gyontato_session_id');
    // session_id = cookie?.value;
    session_id = randomUUID();
  }
  return handleGyontatas({ confession: data.confession, session_id });
}

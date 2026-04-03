
import { NextRequest } from 'next/server';
import { handleGyontatas } from '@/lib/gyontatoszek/service';

// Edge-compatible UUID v4 generator
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
    session_id = uuidv4();
  }
  return handleGyontatas({ confession: data.confession, session_id });
}

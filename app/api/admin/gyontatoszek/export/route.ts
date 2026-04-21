import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function expectedPinHash(): string | null {
  const pin = process.env.ADMIN_DASHBOARD_PIN;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback';
  if (!pin) return null;
  return createHash('sha256').update(pin + secret).digest('hex');
}

export async function GET(req: NextRequest) {
  // PIN cookie auth — same mechanism as /v3/dashboard
  const pinCookie = req.cookies.get('x-admin-pin')?.value ?? '';
  const expected = expectedPinHash();
  if (!expected || pinCookie !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const conversationId = req.nextUrl.searchParams.get('conversation_id');
  if (!conversationId || !/^[0-9a-f-]{36}$/i.test(conversationId)) {
    return NextResponse.json({ error: 'invalid_conversation_id' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: messages, error } = await db
    .from('gyontato_messages')
    .select('sender_role, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 });
  }

  // Build JSONL: pair consecutive user → assistant turns
  const lines: string[] = [];
  const msgs = messages ?? [];

  for (let i = 0; i < msgs.length - 1; i++) {
    const curr = msgs[i];
    const next = msgs[i + 1];
    if (curr?.sender_role === 'user' && next?.sender_role === 'assistant') {
      lines.push(JSON.stringify({
        messages: [
          { role: 'user', content: curr.body },
          { role: 'assistant', content: next.body },
        ],
      }));
      i++; // skip next, already consumed
    }
  }

  const jsonl = lines.join('\n');
  const shortId = conversationId.slice(0, 8);

  return new NextResponse(jsonl, {
    status: 200,
    headers: {
      'Content-Type': 'application/jsonl',
      'Content-Disposition': `attachment; filename="conv-${shortId}.jsonl"`,
    },
  });
}

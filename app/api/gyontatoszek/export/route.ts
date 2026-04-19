import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/server';

const RECIPIENT = 'therealvallalhatatlan@gmail.com';

async function requireAuthenticatedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function POST(req: NextRequest) {
  const user = await requireAuthenticatedUser(req);
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await req.json() as { jsonl?: unknown; pairCount?: unknown };
  const jsonl = typeof body.jsonl === 'string' ? body.jsonl.trim() : '';
  const pairCount = typeof body.pairCount === 'number' ? body.pairCount : 0;

  if (!jsonl) {
    return NextResponse.json({ error: 'missing_jsonl' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey || !emailFrom) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `v-finetune-${dateStr}.jsonl`;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: emailFrom,
    to: [RECIPIENT],
    subject: `V fine-tune export — ${user.email ?? user.id} — ${dateStr}`,
    text: [
      `User ID: ${user.id}`,
      `User email: ${user.email ?? '(nincs)'}`,
      `Üzenetpárok: ${pairCount}`,
      `Exportálva: ${new Date().toISOString()}`,
    ].join('\n'),
    attachments: [
      {
        filename,
        content: Buffer.from(jsonl).toString('base64'),
      },
    ],
  });

  return NextResponse.json({ ok: true });
}

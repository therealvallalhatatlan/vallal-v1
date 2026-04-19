import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { PinGate } from './PinGate';
import { DashboardView } from './DashboardView';

function expectedPinHash(): string | null {
  const pin = process.env.ADMIN_DASHBOARD_PIN;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback';
  if (!pin) return null;
  return createHash('sha256').update(pin + secret).digest('hex');
}

export default async function DashboardPage() {
  // Check PIN cookie — this is the sole auth gate
  const cookieStore = await cookies();
  const pinCookie = cookieStore.get('x-admin-pin')?.value ?? '';
  const expected = expectedPinHash();

  if (!expected || pinCookie !== expected) {
    return <PinGate />;
  }

  // 3. Fetch all conversations + messages via service role
  const db = supabaseAdmin();

  const { data: conversations } = await db
    .from('gyontato_conversations')
    .select('id, session_id, user_id, user_email, created_at, updated_at, last_message_at, metadata')
    .order('last_message_at', { ascending: false })
    .limit(200);

  const convList = conversations ?? [];

  // Fetch messages for all conversations in one query
  const convIds = convList.map(c => c.id);
  const { data: allMessages } = convIds.length > 0
    ? await db
        .from('gyontato_messages')
        .select('id, conversation_id, sender_role, body, model, safety_flag, metadata, created_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
    : { data: [] };

  const messagesByConvId: Record<string, typeof allMessages> = {};
  for (const msg of (allMessages ?? [])) {
    const key = msg.conversation_id as string;
    if (!messagesByConvId[key]) messagesByConvId[key] = [];
    messagesByConvId[key]!.push(msg);
  }

  const enriched = convList.map(c => ({
    ...c,
    messages: messagesByConvId[c.id] ?? [],
  }));

  return (
    <DashboardView
      conversations={enriched as Parameters<typeof DashboardView>[0]['conversations']}
      fetchedAt={new Date().toISOString()}
    />
  );
}

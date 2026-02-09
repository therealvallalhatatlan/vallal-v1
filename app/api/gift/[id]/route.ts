// app/api/gift/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { guardWriteOperation } from '@/lib/systemGuard';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req);
  if (guardResponse) return guardResponse;
  
  const { id } = await params;
  // basic rate-limit / abuse protection could be added
  // fetch gift
  const { data, error } = await supabase
    .from('gifts')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: 'gift_not_found' }, { status: 404 });

  if (data.revealed) return NextResponse.json({ ok: false, error: 'already_revealed' }, { status: 400 });

  if (data.expires_at && new Date(data.expires_at) < new Date())
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 400 });

  // mark revealed and set reveal_at
  const { error: uerr } = await supabase
    .from('gifts')
    .update({ revealed: true, reveal_at: new Date().toISOString() })
    .eq('id', id);

  if (uerr) return NextResponse.json({ ok: false, error: 'db_update_failed' }, { status: 500 });

  // return token (secret_token)
  return NextResponse.json({ ok: true, token: data.secret_token });
}

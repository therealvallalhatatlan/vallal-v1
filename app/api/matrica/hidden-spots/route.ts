import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/matrica/hidden-spots
 * Hides a spot by adding it to the hidden_spots table.
 *
 * Requires: Bearer token
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 });
  }

  const client = await createClient();
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const userId = authData.user.id;
  const body = await req.json();
  const { spot_id: spotId } = body;

  if (!spotId) {
    return NextResponse.json({ error: 'invalid_spot_id' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Insert hidden spot
  try {
    const { error } = await db
      .from('hidden_spots')
      .insert({
        spot_id: spotId,
        creator_id: userId,
      });

    if (error) {
      console.error('[matrica/hidden-spots] insert error', error);
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[matrica/hidden-spots] exception', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
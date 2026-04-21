import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { StickerSpot } from '@/lib/matrica'

export const dynamic = 'force-dynamic'

/**
 * GET /api/matrica/spots
 * Returns all active sticker spots (no auth required – coords are public,
 * secrets like exact claim radius are exposed only after auth if desired).
 */
export async function GET() {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('sticker_spots')
    .select(
      'id, title, description, image_url, lat, lng, radius_visibility, radius_claim, total_quantity, remaining_quantity, status, created_at',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[matrica/spots] db error', error)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  return NextResponse.json({ spots: (data ?? []) as StickerSpot[] })
}

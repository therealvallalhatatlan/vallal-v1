import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 5 perc aktivitás számít online-nak
const ONLINE_WINDOW_MS = 5 * 60 * 1000

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = supabaseAdmin()
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString()

  // Lekérjük azokat, akik az elmúlt 5 percben életjelet adtak
  const { data, error } = await supabase
    .from('reader_presence')
    .select('user_id:id,email')
    .gte('last_heartbeat', since)
    .order('last_heartbeat', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 })
  }

  return NextResponse.json({ users: data || [] })
}

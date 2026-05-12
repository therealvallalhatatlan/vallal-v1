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
    .select('user_id,email,last_heartbeat')
    .gte('last_heartbeat', since)
    .order('last_heartbeat', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch online users' }, { status: 500 })
  }

  const users = (data || []).map((entry) => ({
    id: entry.user_id,
    user_id: entry.user_id,
    email: entry.email,
    last_heartbeat: entry.last_heartbeat,
  }))

  return NextResponse.json({ users })
}

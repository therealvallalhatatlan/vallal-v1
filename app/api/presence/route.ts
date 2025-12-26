import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const supabase = supabaseAdmin()
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Upsert presence record with current timestamp
    const { error } = await supabase
      .from('reader_presence')
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          last_heartbeat: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Presence upsert error:', error)
      return NextResponse.json(
        { error: 'Failed to update presence' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Presence route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = supabaseAdmin()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('reader_presence')
      .select('count(*)', { count: 'exact' })
      .gte('last_heartbeat', fiveMinutesAgo)

    if (error) {
      console.error('Presence count error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch presence count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count: data?.length || 0 })
  } catch (error) {
    console.error('Presence GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

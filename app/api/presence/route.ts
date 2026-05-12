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

    // Parse optional location data from request body
    let lat: number | null = null
    let lng: number | null = null
    try {
      const body = await request.json()
      if (typeof body.lat === 'number' && Number.isFinite(body.lat)) {
        lat = body.lat
      }
      if (typeof body.lng === 'number' && Number.isFinite(body.lng)) {
        lng = body.lng
      }
    } catch {
      // No body or invalid JSON; lat/lng remain null
    }

    // Upsert presence record with current timestamp and optional location
    const { error } = await supabase
      .from('reader_presence')
      .upsert(
        {
          user_id: user.id,
          email: user.email,
          last_heartbeat: new Date().toISOString(),
          lat,
          lng,
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Presence upsert error:', error)
      // If upsert with lat/lng fails, try without location (backward compatibility)
      if (lat !== null || lng !== null) {
        console.warn('Retrying upsert without location data')
        const { error: retryError } = await supabase
          .from('reader_presence')
          .upsert(
            {
              user_id: user.id,
              email: user.email,
              last_heartbeat: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
        if (retryError) {
          console.error('Presence upsert retry failed:', retryError)
          return NextResponse.json(
            { error: 'Failed to update presence' },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Failed to update presence' },
          { status: 500 }
        )
      }
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

    const { count, error } = await supabase
      .from('reader_presence')
      .select('user_id', { count: 'exact', head: true })
      .gte('last_heartbeat', fiveMinutesAgo)

    if (error) {
      console.error('Presence count error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch presence count' },
        { status: 500 }
      )
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Presence GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

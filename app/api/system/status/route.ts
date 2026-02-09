import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Cache control - public caching for 30 seconds
const CACHE_DURATION = 30;

export async function GET() {
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('system_control')
      .select('mode, updated_at, updated_by')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('[System Status API] Error fetching mode:', error);
      return NextResponse.json(
        { error: 'Failed to fetch system status' },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('[System Status API] No control record found');
      return NextResponse.json(
        { error: 'System control not initialized' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        mode: data.mode,
        updatedAt: data.updated_at,
        updatedBy: data.updated_by,
      },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${CACHE_DURATION * 2}`,
          'X-System-Mode': data.mode,
        },
      }
    );
  } catch (err) {
    console.error('[System Status API] Exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

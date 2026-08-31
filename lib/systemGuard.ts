/**
 * Kill Switch / System Mode Guards
 * Utilities for checking and enforcing system mode in Server Actions and API Routes
 */

import { supabaseAdmin } from './supabaseAdmin';
import { isAdminEmail } from './auth';
import { NextRequest } from 'next/server';

export type SystemMode = 'SAFE' | 'READ_ONLY';

let cachedModeGuard: { mode: SystemMode; timestamp: number } | null = null;
const CACHE_TTL_GUARD = 30000;

/**
 * Read the current system mode.
 * Fail-closed: if the control row cannot be read, writes are treated as READ_ONLY.
 */
export async function getSystemMode(): Promise<SystemMode> {
  const now = Date.now();

  if (cachedModeGuard && (now - cachedModeGuard.timestamp) < CACHE_TTL_GUARD) {
    return cachedModeGuard.mode;
  }

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('system_control')
      .select('mode')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('[System Guard] Failed to fetch system mode:', error);
      cachedModeGuard = { mode: 'READ_ONLY', timestamp: now };
      return 'READ_ONLY';
    }

    const mode = data.mode === 'SAFE' || data.mode === 'READ_ONLY' ? data.mode : 'READ_ONLY';
    cachedModeGuard = { mode, timestamp: now };
    return mode;
  } catch (err) {
    console.error('[System Guard] Exception fetching system mode:', err);
    cachedModeGuard = { mode: 'READ_ONLY', timestamp: now };
    return 'READ_ONLY';
  }
}

export async function checkWriteAllowed(
  userEmail?: string | null
): Promise<{ allowed: boolean; error?: string }> {
  const mode = await getSystemMode();

  if (mode === 'SAFE') return { allowed: true };

  if (userEmail && isAdminEmail(userEmail)) return { allowed: true };

  return {
    allowed: false,
    error: 'System is in read-only mode. Write operations are temporarily disabled.',
  };
}

export async function guardWriteOperation(req: NextRequest): Promise<Response | null> {
  const mode = await getSystemMode();

  if (mode === 'SAFE') return null;

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)/i);
    if (match) {
      try {
        const supabase = supabaseAdmin();
        const { data } = await supabase.auth.getUser(match[1].trim());
        if (data?.user?.email && isAdminEmail(data.user.email)) return null;
      } catch {
        // Treat auth failure as non-admin and keep the write blocked.
      }
    }
  }

  return new Response(
    JSON.stringify({
      error: 'System is in read-only mode. Write operations are temporarily disabled.',
      mode: 'READ_ONLY',
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-System-Mode': 'READ_ONLY',
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function invalidateModeCache(): void {
  cachedModeGuard = null;
}

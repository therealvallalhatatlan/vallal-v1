/**
 * Kill Switch / System Mode Guards
 * Utilities for checking and enforcing system mode in Server Actions and API Routes
 */

import { supabaseAdmin } from './supabaseAdmin';
import { isAdminEmail } from './auth';
import { NextRequest } from 'next/server';

export type SystemMode = 'SAFE' | 'READ_ONLY';

// In-memory cache for system mode (30 second TTL)
let cachedModeGuard: { mode: SystemMode; timestamp: number } | null = null;
const CACHE_TTL_GUARD = 30000; // 30 seconds

/**
 * Get current system mode with caching
 */
export async function getSystemMode(): Promise<SystemMode> {
  const now = Date.now();
  
  // Return cached value if still valid
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
      // Fail-safe: allow operations if DB is unreachable
      return 'SAFE';
    }
    
    const mode = data.mode as SystemMode;
    cachedModeGuard = { mode, timestamp: now };
    return mode;
  } catch (err) {
    console.error('[System Guard] Exception fetching system mode:', err);
    return 'SAFE'; // Fail-safe
  }
}

/**
 * Check if a write operation should be allowed
 * Returns { allowed: true } or { allowed: false, error: string }
 */
export async function checkWriteAllowed(
  userEmail?: string | null
): Promise<{ allowed: boolean; error?: string }> {
  const mode = await getSystemMode();
  
  if (mode === 'SAFE') {
    return { allowed: true };
  }
  
  // In READ_ONLY mode, only admins can write
  if (userEmail && isAdminEmail(userEmail)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    error: 'System is in read-only mode. Write operations are temporarily disabled.',
  };
}

/**
 * Guard decorator for API routes
 * Returns error response if write not allowed, otherwise returns null (proceed)
 */
export async function guardWriteOperation(req: NextRequest): Promise<Response | null> {
  const mode = await getSystemMode();
  
  if (mode === 'SAFE') {
    return null; // Allow
  }
  
  // Check if user is admin
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)/i);
    if (match) {
      try {
        const supabase = supabaseAdmin();
        const { data } = await supabase.auth.getUser(match[1].trim());
        if (data?.user?.email && isAdminEmail(data.user.email)) {
          return null; // Admin - allow
        }
      } catch {
        // Ignore auth errors
      }
    }
  }
  
  // Block the write
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
      },
    }
  );
}

/**
 * Invalidate the mode cache (useful after toggling mode)
 */
export function invalidateModeCache(): void {
  cachedModeGuard = null;
}

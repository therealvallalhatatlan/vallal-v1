"use server"

import { supabaseAdmin } from './supabaseAdmin';
import { isAdminEmail } from './auth';
import { cookies } from 'next/headers';

/**
 * Server action to validate admin key securely
 * The actual key is only accessible on the server side
 */
export async function validateAdminKey(key: string): Promise<boolean> {
  const adminKey = process.env.DEMO_ADMIN_KEY || "letmein"
  return key === adminKey
}

/**
 * Toggle system mode between SAFE and READ_ONLY
 * Only admins in ADMIN_EMAILS can perform this action
 */
export async function toggleSystemMode(currentMode: 'SAFE' | 'READ_ONLY'): Promise<{
  success: boolean;
  mode?: 'SAFE' | 'READ_ONLY';
  error?: string;
}> {
  try {
    // Get the current user from the session
    const cookieStore = await cookies();
    const authToken = cookieStore.get('sb-access-token')?.value;
    
    if (!authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    const supabase = supabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !userData?.user?.email) {
      return { success: false, error: 'Invalid authentication' };
    }

    if (!isAdminEmail(userData.user.email)) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }

    // Toggle the mode
    const newMode = currentMode === 'SAFE' ? 'READ_ONLY' : 'SAFE';
    
    // Update the control table
    const { data, error } = await supabase
      .from('system_control')
      .update({
        mode: newMode,
        updated_at: new Date().toISOString(),
        updated_by: userData.user.email,
      })
      .eq('id', 1)
      .select('mode')
      .single();

    if (error) {
      console.error('[toggleSystemMode] Database error:', error);
      return { success: false, error: 'Failed to update system mode' };
    }

    console.log(`[toggleSystemMode] Mode changed to ${newMode} by ${userData.user.email}`);
    return { success: true, mode: data.mode as 'SAFE' | 'READ_ONLY' };
  } catch (err) {
    console.error('[toggleSystemMode] Exception:', err);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get system control history (last 20 changes)
 */
export async function getSystemControlHistory(): Promise<{
  success: boolean;
  history?: Array<{
    mode: string;
    changed_at: string;
    changed_by: string;
    previous_mode: string | null;
  }>;
  error?: string;
}> {
  try {
    // Get the current user from the session
    const cookieStore = await cookies();
    const authToken = cookieStore.get('sb-access-token')?.value;
    
    if (!authToken) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify user is admin
    const supabase = supabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(authToken);
    
    if (userError || !userData?.user?.email) {
      return { success: false, error: 'Invalid authentication' };
    }

    if (!isAdminEmail(userData.user.email)) {
      return { success: false, error: 'Unauthorized - admin access required' };
    }

    // Fetch history
    const { data, error } = await supabase
      .from('system_control_history')
      .select('mode, changed_at, changed_by, previous_mode')
      .order('changed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[getSystemControlHistory] Database error:', error);
      return { success: false, error: 'Failed to fetch history' };
    }

    return { success: true, history: data || [] };
  } catch (err) {
    console.error('[getSystemControlHistory] Exception:', err);
    return { success: false, error: 'Internal server error' };
  }
}

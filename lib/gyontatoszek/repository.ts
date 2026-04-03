import { supabaseAdmin } from '../supabase/admin';
import type { GyontatasInsert } from './types';

export async function saveConfessionRecord(data: GyontatasInsert): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('gyontatasok')
      .insert([data]);
    if (error) {
      // Log error but do not throw
      console.error('Failed to save confession record:', error);
    }
  } catch (err) {
    // Log error but do not throw
    console.error('Unexpected error saving confession record:', err);
  }
}

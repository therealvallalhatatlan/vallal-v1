export interface GyontatasRequest {
  confession: string;
}

export interface GyontatasResponse {
  response: string;
}

export type SafetyResult =
  | { safe: true }
  | { safe: false; reason: string; fallback: string };

// For inserting a new confession record
export interface GyontatasInsert {
  session_id?: string | null;
  confession: string;
  response: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, any>;
}

// For reading a confession record from Supabase
export interface GyontatasRecord extends GyontatasInsert {
  id: string;
  created_at: string;
}

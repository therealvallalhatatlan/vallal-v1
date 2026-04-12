export const MAX_GYONTATAS_MESSAGE_LENGTH = 2000;
export const MAX_GYONTATAS_HISTORY_MESSAGES = 12;
export const GYONTATAS_HISTORY_PAGE_SIZE = 50;

export type GyontatasSenderRole = 'user' | 'assistant';

export interface GyontatasRequest {
  confession: string;
  session_id: string;
}

export interface GyontatasConversation {
  id: string;
  session_id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface GyontatasMessage {
  id: string;
  conversation_id: string;
  sender_role: GyontatasSenderRole;
  body: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface GyontatasMessageInsert {
  conversation_id: string;
  sender_role: GyontatasSenderRole;
  body: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GyontatasHistoryResponse {
  session_id: string;
  messages: GyontatasMessage[];
}

export type SafetyResult =
  | { safe: true }
  | { safe: false; reason: string; fallback: string };

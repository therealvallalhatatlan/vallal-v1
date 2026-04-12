import { supabaseAdmin } from '../supabase/admin';
import type {
  GyontatasConversation,
  GyontatasMessage,
  GyontatasMessageInsert,
} from './types';

type GyontatasStorageMode = 'conversation' | 'legacy';

interface LegacyGyontatasRow {
  id: string;
  session_id?: string | null;
  confession: string;
  response: string;
  model?: string | null;
  safety_flag?: boolean | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

let storageModeCache: GyontatasStorageMode | null = null;

function isMissingConversationSchemaError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('gyontato_conversations') ||
    normalized.includes('gyontato_messages') ||
    normalized.includes('could not find the table') ||
    normalized.includes('schema cache') ||
    normalized.includes('does not exist')
  );
}

export async function getGyontatasStorageMode(): Promise<GyontatasStorageMode> {
  if (storageModeCache) {
    return storageModeCache;
  }

  const { error } = await supabaseAdmin.from('gyontato_conversations').select('id').limit(1);
  if (!error) {
    storageModeCache = 'conversation';
    return storageModeCache;
  }

  if (isMissingConversationSchemaError(error.message)) {
    storageModeCache = 'legacy';
    return storageModeCache;
  }

  throw new Error(`Failed to inspect gyontatas storage: ${error.message}`);
}

function mapLegacyRowsToMessages(rows: LegacyGyontatasRow[]): GyontatasMessage[] {
  return rows.flatMap((row) => {
    const messages: GyontatasMessage[] = [
      {
        id: `${row.id}:user`,
        conversation_id: row.session_id || 'legacy',
        sender_role: 'user',
        body: row.confession,
        model: null,
        safety_flag: false,
        metadata: row.metadata ?? {},
        created_at: row.created_at,
      },
    ];

    if (row.response?.trim()) {
      messages.push({
        id: `${row.id}:assistant`,
        conversation_id: row.session_id || 'legacy',
        sender_role: 'assistant',
        body: row.response,
        model: row.model ?? null,
        safety_flag: Boolean(row.safety_flag),
        metadata: row.metadata ?? {},
        created_at: row.created_at,
      });
    }

    return messages;
  });
}

export async function getConversationBySessionId(sessionId: string): Promise<GyontatasConversation | null> {
  const storageMode = await getGyontatasStorageMode();
  if (storageMode === 'legacy') {
    return {
      id: sessionId,
      session_id: sessionId,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      last_message_at: new Date(0).toISOString(),
    };
  }

  const { data, error } = await supabaseAdmin
    .from('gyontato_conversations')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  return data;
}

export async function ensureConversation(sessionId: string): Promise<GyontatasConversation> {
  const storageMode = await getGyontatasStorageMode();
  if (storageMode === 'legacy') {
    return {
      id: sessionId,
      session_id: sessionId,
      created_at: new Date(0).toISOString(),
      updated_at: new Date(0).toISOString(),
      last_message_at: new Date(0).toISOString(),
    };
  }

  const existing = await getConversationBySessionId(sessionId);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from('gyontato_conversations')
    .insert([{ session_id: sessionId }])
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message || 'Unknown error'}`);
  }

  return data;
}

export async function createConversationMessage(data: GyontatasMessageInsert): Promise<GyontatasMessage> {
  const storageMode = await getGyontatasStorageMode();
  if (storageMode === 'legacy') {
    return {
      id: `${data.conversation_id}:${Date.now()}:${data.sender_role}`,
      conversation_id: data.conversation_id,
      sender_role: data.sender_role,
      body: data.body,
      model: data.model ?? null,
      safety_flag: data.safety_flag ?? false,
      metadata: data.metadata ?? {},
      created_at: new Date().toISOString(),
    };
  }

  const { data: inserted, error } = await supabaseAdmin
    .from('gyontato_messages')
    .insert([
      {
        conversation_id: data.conversation_id,
        sender_role: data.sender_role,
        body: data.body,
        model: data.model ?? null,
        safety_flag: data.safety_flag ?? false,
        metadata: data.metadata ?? {},
      },
    ])
    .select('*')
    .single();

  if (error || !inserted) {
    throw new Error(`Failed to create message: ${error?.message || 'Unknown error'}`);
  }

  return inserted;
}

export async function listConversationMessages(
  conversationId: string,
  limit?: number
): Promise<GyontatasMessage[]> {
  const storageMode = await getGyontatasStorageMode();
  if (storageMode === 'legacy') {
    const rowLimit = limit ? Math.max(1, Math.ceil(limit / 2)) : undefined;
    if (rowLimit) {
      const { data, error } = await supabaseAdmin
        .from('gyontatasok')
        .select('*')
        .eq('session_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(rowLimit);

      if (error) {
        throw new Error(`Failed to load legacy messages: ${error.message}`);
      }

      return mapLegacyRowsToMessages(((data ?? []) as LegacyGyontatasRow[]).slice().reverse());
    }

    const { data, error } = await supabaseAdmin
      .from('gyontatasok')
      .select('*')
      .eq('session_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to load legacy messages: ${error.message}`);
    }

    return mapLegacyRowsToMessages((data ?? []) as LegacyGyontatasRow[]);
  }

  let query = supabaseAdmin
    .from('gyontato_messages')
    .select('*')
    .eq('conversation_id', conversationId);

  if (limit) {
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) {
      throw new Error(`Failed to load messages: ${error.message}`);
    }
    return (data ?? []).slice().reverse();
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return data ?? [];
}

export async function listMessagesBySessionId(sessionId: string, limit?: number): Promise<GyontatasMessage[]> {
  const storageMode = await getGyontatasStorageMode();
  if (storageMode === 'legacy') {
    return listConversationMessages(sessionId, limit);
  }

  const conversation = await getConversationBySessionId(sessionId);
  if (!conversation) {
    return [];
  }

  return listConversationMessages(conversation.id, limit);
}

export async function saveLegacyConfessionExchange(input: {
  session_id: string;
  confession: string;
  response: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from('gyontatasok').insert([
    {
      session_id: input.session_id,
      confession: input.confession,
      response: input.response,
      model: input.model ?? null,
      safety_flag: input.safety_flag ?? false,
      metadata: input.metadata ?? {},
    },
  ]);

  if (error) {
    throw new Error(`Failed to save legacy confession exchange: ${error.message}`);
  }
}

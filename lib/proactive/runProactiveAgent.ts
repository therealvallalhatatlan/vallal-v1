import { listConversationMessages } from '../gyontatoszek/repository';
import type { GyontatasConversation, GyontatasMessage, PersistentRelationshipMemory } from '../gyontatoszek/types';
import { supabaseAdmin } from '../supabase/admin';
import { evaluateProactiveTrigger } from './evaluateTrigger';
import { buildProactiveMessage } from './generateProactiveMessage';
import { sendProactiveMessage } from './sendMessage';
import type { ProactiveLogEntry, ProactiveRunItem, ProactiveRunResult } from './types';

interface RunProactiveAgentInput {
  dryRun?: boolean;
  limit?: number;
  now?: string | Date;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractRelationshipMemory(conversation: GyontatasConversation): PersistentRelationshipMemory | null {
  const metadata = asObject(conversation.metadata);
  const memory = metadata.relationshipMemory;
  return memory && typeof memory === 'object' ? (memory as PersistentRelationshipMemory) : null;
}

function extractRecentProactiveLog(messages: GyontatasMessage[]): ProactiveLogEntry[] {
  return messages
    .filter((message) => message.sender_role === 'assistant')
    .map((message) => asObject(message.metadata))
    .map((metadata) => asObject(metadata.proactive))
    .filter((proactive) => typeof proactive.sentAt === 'string' && typeof proactive.trigger === 'string')
    .map((proactive) => ({
      sentAt: proactive.sentAt as string,
      trigger: proactive.trigger as ProactiveLogEntry['trigger'],
    }));
}

function lastTimestamp(messages: GyontatasMessage[], senderRole?: GyontatasMessage['sender_role']) {
  const filtered = senderRole ? messages.filter((message) => message.sender_role === senderRole) : messages;
  return filtered.length ? filtered[filtered.length - 1].created_at : null;
}

function detectPendingAction(messages: GyontatasMessage[]) {
  const recentUserText = messages
    .filter((message) => message.sender_role === 'user')
    .slice(-3)
    .map((message) => message.body.toLowerCase())
    .join(' ');

  return /(megteszem|meg fogom|megpróbálom|holnap|később megcsinálom|majd megírom)/i.test(recentUserText);
}

async function loadCandidateConversations(limit: number) {
  const { data, error } = await supabaseAdmin
    .from('gyontato_conversations')
    .select('*')
    .not('user_id', 'is', null)
    .order('last_message_at', { ascending: true })
    .limit(limit);

  if (error) {
    if (error.message.toLowerCase().includes('gyontato_conversations')) {
      return [] as GyontatasConversation[];
    }
    throw new Error(`Failed to scan proactive candidates: ${error.message}`);
  }

  return (data ?? []) as GyontatasConversation[];
}

export async function runProactiveAgent(input: RunProactiveAgentInput = {}): Promise<ProactiveRunResult> {
  const dryRun = input.dryRun !== false;
  const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
  const conversations = await loadCandidateConversations(limit);
  const items: ProactiveRunItem[] = [];
  let eligible = 0;
  let sent = 0;

  for (const conversation of conversations) {
    const messages = await listConversationMessages(conversation.id, 12);
    const recentUserMessages = messages
      .filter((message) => message.sender_role === 'user')
      .slice(-3)
      .map((message) => message.body);

    const evaluation = evaluateProactiveTrigger({
      now: input.now,
      conversationId: conversation.id,
      sessionId: conversation.session_id,
      userId: conversation.user_id ?? null,
      userEmail: conversation.user_email ?? null,
      lastMessageAt: conversation.last_message_at,
      lastUserMessageAt: lastTimestamp(messages, 'user'),
      lastAssistantMessageAt: lastTimestamp(messages, 'assistant'),
      recentUserMessages,
      relationshipMemory: extractRelationshipMemory(conversation),
      pendingAction: detectPendingAction(messages),
      recentProactiveLog: extractRecentProactiveLog(messages),
    });

    let preview: string | null = null;
    let didSend = false;

    if (evaluation.eligible && evaluation.trigger) {
      eligible += 1;
      preview = await buildProactiveMessage({
        evaluation,
        userEmail: conversation.user_email ?? null,
        relationshipMemory: extractRelationshipMemory(conversation),
        recentUserMessages,
      });

      const delivery = await sendProactiveMessage({
        conversationId: conversation.id,
        userId: conversation.user_id ?? null,
        body: preview,
        trigger: evaluation.trigger,
        dryRun,
      });

      didSend = delivery.sent;
      if (delivery.sent) {
        sent += 1;
      }
    }

    items.push({
      conversationId: conversation.id,
      userId: conversation.user_id ?? null,
      sessionId: conversation.session_id,
      eligible: evaluation.eligible,
      reason: evaluation.reason,
      trigger: evaluation.trigger?.type ?? null,
      preview,
      sent: didSend,
    });
  }

  return {
    dryRun,
    scanned: conversations.length,
    eligible,
    sent,
    items,
  };
}

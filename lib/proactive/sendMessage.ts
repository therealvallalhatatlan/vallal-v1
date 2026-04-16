import { createConversationMessage } from '../gyontatoszek/repository';
import { supabaseAdmin } from '../supabase/admin';
import type { ProactiveTriggerDecision } from './types';

interface SendProactiveMessageInput {
  conversationId: string;
  userId?: string | null;
  body: string;
  trigger: ProactiveTriggerDecision;
  dryRun?: boolean;
}

function isMissingProactiveAuditTable(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('gyontato_proactive_messages') || normalized.includes('does not exist');
}

async function logProactiveAuditEntry(input: {
  conversationId: string;
  trigger: ProactiveTriggerDecision;
  body: string;
  sentAsMessageId?: string | null;
  status: 'queued' | 'sent' | 'skipped';
}) {
  const { error } = await supabaseAdmin.from('gyontato_proactive_messages').insert([
    {
      conversation_id: input.conversationId,
      trigger_type: input.trigger.type,
      reason: input.trigger.reason,
      score: input.trigger.score,
      body_preview: input.body.slice(0, 400),
      status: input.status,
      sent_as_message_id: input.sentAsMessageId ?? null,
    },
  ]);

  if (!error || isMissingProactiveAuditTable(error.message)) {
    return;
  }

  console.warn('[PROACTIVE] Failed to log proactive audit row:', error.message);
}

export async function sendProactiveMessage(input: SendProactiveMessageInput) {
  if (input.dryRun) {
    await logProactiveAuditEntry({
      conversationId: input.conversationId,
      trigger: input.trigger,
      body: input.body,
      sentAsMessageId: null,
      status: 'queued',
    });

    return {
      sent: false,
      messageId: null,
    };
  }

  const timestamp = new Date().toISOString();
  const message = await createConversationMessage({
    conversation_id: input.conversationId,
    sender_role: 'assistant',
    body: input.body,
    model: 'proactive-behavior-v1',
    safety_flag: false,
    metadata: {
      source: 'gyontatoszek_proactive',
      timestamp,
      proactive: {
        trigger: input.trigger.type,
        reason: input.trigger.reason,
        score: input.trigger.score,
        sentAt: timestamp,
      },
    },
  });

  await logProactiveAuditEntry({
    conversationId: input.conversationId,
    trigger: input.trigger,
    body: input.body,
    sentAsMessageId: message.id,
    status: 'sent',
  });

  // Dispatch web push notification if user has active subscriptions
  if (input.userId) {
    void dispatchPushNotification({
      userId: input.userId,
      body: input.body,
      conversationId: input.conversationId,
    }).catch((err) => {
      console.warn('[PROACTIVE] push dispatch failed (non-blocking):', err);
    });
  }

  return {
    sent: true,
    messageId: message.id,
  };
}

async function dispatchPushNotification(input: {
  userId: string;
  body: string;
  conversationId: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const cronToken = process.env.CRON_SECRET_TOKEN;
  if (!cronToken) return;

  const response = await fetch(`${siteUrl}/api/push/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cronToken}`,
    },
    body: JSON.stringify({
      userId: input.userId,
      title: 'V.',
      body: input.body.slice(0, 100),
      url: '/v3',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.warn('[PROACTIVE] push send non-OK:', response.status, text.slice(0, 200));
  }
}

import { buildPrompt } from './prompt';
import { getAIResponse } from './provider';
import {
  createConversationMessage,
  ensureConversation,
  getGyontatasStorageMode,
  listConversationMessages,
  saveLegacyConfessionExchange,
} from './repository';
import { checkSafety } from './safety';
import type { GyontatasMessage, GyontatasRequest } from './types';

const MODEL_NAME = 'gpt-4o';

function createTextStreamResponse(body: string, sessionId: string) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-session-id': sessionId,
      },
    }
  );
}

export async function handleGyontatas(req: GyontatasRequest) {
  const storageMode = await getGyontatasStorageMode();
  const conversation = await ensureConversation(req.session_id);
  let history: GyontatasMessage[] = [];

  if (storageMode === 'conversation') {
    await createConversationMessage({
      conversation_id: conversation.id,
      sender_role: 'user',
      body: req.confession,
      metadata: {
        source: 'gyontatoszek',
        timestamp: new Date().toISOString(),
      },
    });
    history = await listConversationMessages(conversation.id);
  } else {
    const existingHistory = await listConversationMessages(conversation.id);
    history = [
      ...existingHistory,
      {
        id: `pending-user:${Date.now()}`,
        conversation_id: conversation.id,
        sender_role: 'user',
        body: req.confession,
        model: null,
        safety_flag: false,
        metadata: {
          source: 'gyontatoszek',
          timestamp: new Date().toISOString(),
          pending: true,
        },
        created_at: new Date().toISOString(),
      },
    ];
  }

  const safety = checkSafety(req.confession);
  if (!safety.safe) {
    if (storageMode === 'conversation') {
      await createConversationMessage({
        conversation_id: conversation.id,
        sender_role: 'assistant',
        body: safety.fallback,
        model: MODEL_NAME,
        safety_flag: true,
        metadata: {
          source: 'gyontatoszek',
          timestamp: new Date().toISOString(),
          safety_reason: safety.reason,
        },
      });
    } else {
      await saveLegacyConfessionExchange({
        session_id: req.session_id,
        confession: req.confession,
        response: safety.fallback,
        model: MODEL_NAME,
        safety_flag: true,
        metadata: {
          source: 'gyontatoszek',
          timestamp: new Date().toISOString(),
          safety_reason: safety.reason,
        },
      });
    }

    return createTextStreamResponse(safety.fallback, req.session_id);
  }

  const modelMessages = buildPrompt(history);
  const textStream = await getAIResponse(modelMessages);
  const encoder = new TextEncoder();

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const responseChunks: string[] = [];

      try {
        for await (const chunk of textStream) {
          responseChunks.push(chunk);
          controller.enqueue(encoder.encode(chunk));
        }

        const assistantReply = responseChunks.join('');
        if (storageMode === 'conversation') {
          await createConversationMessage({
            conversation_id: conversation.id,
            sender_role: 'assistant',
            body: assistantReply,
            model: MODEL_NAME,
            safety_flag: false,
            metadata: {
              source: 'gyontatoszek',
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          await saveLegacyConfessionExchange({
            session_id: req.session_id,
            confession: req.confession,
            response: assistantReply,
            model: MODEL_NAME,
            safety_flag: false,
            metadata: {
              source: 'gyontatoszek',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        console.error('Failed during gyontatas streaming:', error);
        controller.error(error);
        return;
      }

      controller.close();
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'x-session-id': req.session_id,
    },
  });
}

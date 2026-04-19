import { executeAgentResponse, prepareAgentTurn } from './agent';
import { generateShadowStream } from './agent/shadow';
import {
  createConversationMessage,
  ensureConversation,
  getGyontatasStorageMode,
  listConversationMessages,
  saveLegacyConfessionExchange,
  updateConversationRelationshipMemory,
} from './repository';
import { checkSafety } from './safety';
import type { GyontatasMessage, GyontatasRequest } from './types';

const MODEL_NAME = 'gpt-4.1';

function buildDebugPayload(agentTurn: Awaited<ReturnType<typeof prepareAgentTurn>>) {
  return {
    state: agentTurn.runtimeState ?? null,
    strategy: agentTurn.strategy.mode,
    weightTrace: agentTurn.weightTrace ?? null,
    retrievedChunks: (agentTurn.ragContext ?? []).slice(0, 3).map((chunk) => ({
      id: chunk.id,
      preview: chunk.preview,
      tone: chunk.tone,
      themes: chunk.themes,
      score: chunk.score,
    })),
  };
}

function buildResponseHeaders(sessionId: string, action?: unknown, debugPayload?: unknown, followUpHint?: string, preThoughts?: string[]) {
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'x-session-id': sessionId,
  };

  if (action) {
    headers['x-agent-action'] = encodeURIComponent(JSON.stringify(action));
  }

  if (debugPayload) {
    headers['x-agent-debug'] = encodeURIComponent(JSON.stringify(debugPayload));
  }

  if (followUpHint) {
    headers['x-follow-up-hint'] = encodeURIComponent(followUpHint);
  }

  if (preThoughts && preThoughts.length > 0) {
    headers['x-pre-thoughts'] = encodeURIComponent(JSON.stringify(preThoughts));
  }

  return headers;
}

function createTextStreamResponse(body: string, sessionId: string, action?: unknown, debugPayload?: unknown) {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    }),
    {
      headers: buildResponseHeaders(sessionId, action, debugPayload),
    }
  );
}

export async function handleGyontatas(req: GyontatasRequest) {
  const storageMode = await getGyontatasStorageMode();
  const conversation = await ensureConversation({
    sessionId: req.session_id,
    userId: req.user_id,
    userEmail: req.user_email ?? null,
  });
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

    return createTextStreamResponse(
      safety.fallback,
      conversation.session_id,
      undefined,
      req.debug ? { state: null, strategy: 'safety_fallback', retrievedChunks: [] } : undefined,
    );
  }

  const agentTurn = await prepareAgentTurn({
    input: req.confession,
    history,
    conversationId: conversation.id,
    conversationMetadata: conversation.metadata,
    userId: req.user_id,
    userEmail: req.user_email ?? null,
    modulation: req.modulation ?? null,
  });
  const textStream = await executeAgentResponse(agentTurn);
  const shadowStream = generateShadowStream(agentTurn);
  const encoder = new TextEncoder();
  const SHADOW_SEP = '\x1E';

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const shadowChunks: string[] = [];
      const responseChunks: string[] = [];

      try {
        for await (const chunk of shadowStream) {
          shadowChunks.push(chunk);
          controller.enqueue(encoder.encode(chunk));
        }
        controller.enqueue(encoder.encode(SHADOW_SEP));

        for await (const chunk of textStream) {
          responseChunks.push(chunk);
          controller.enqueue(encoder.encode(chunk));
        }

        const shadowText = shadowChunks.join('');
        const assistantReply = responseChunks.join('');
        const behaviorMetadata = {
          state: agentTurn.behavior.state.name,
          intensity: agentTurn.behavior.state.intensity,
          momentum: agentTurn.behavior.state.momentum,
          volatility: agentTurn.behavior.state.volatility,
          strategy: agentTurn.behavior.decision.strategy,
          secondaryStrategy: agentTurn.behavior.decision.secondaryStrategy ?? null,
          engageDepth: agentTurn.behavior.decision.engageDepth,
          disclosure: agentTurn.behavior.decision.disclosure,
          contradiction: agentTurn.behavior.decision.contradiction,
          rationale: agentTurn.behavior.decision.rationale,
          responseShape: agentTurn.behavior.responseShape,
          relationship: agentTurn.behavior.memory,
          persistentMemory: agentTurn.behavior.persistentMemory,
          interpretation: agentTurn.interpretation,
          runtimeState: agentTurn.runtimeState ?? null,
          memoryEvents: agentTurn.memoryEvents,
          patternMemory: agentTurn.patternMemory,
          profile: agentTurn.profile,
          strategyPlan: agentTurn.strategy,
          retrievedChunks: agentTurn.ragContext ?? [],
          action: agentTurn.action ?? null,
          distortion: agentTurn.distortion ?? null,
          appliedModulation: agentTurn.modulation ?? null,
          tangentCount: agentTurn.distortionState?.tangentCount ?? 0,
          weightTrace: agentTurn.weightTrace ?? null,
          shadowText,
        };

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
              behavior: behaviorMetadata,
            },
          });

          await updateConversationRelationshipMemory({
            conversationId: conversation.id,
            memory: agentTurn.behavior.persistentMemory,
            existingMetadata: {
              ...(conversation.metadata as Record<string, unknown> | null ?? {}),
              ...(agentTurn.secretCodeJustRevealed ? { secretCodeRevealed: true } : {}),
            },
            profile: agentTurn.profile as unknown as Record<string, unknown>,
            patternMemory: agentTurn.patternMemory as unknown as Record<string, unknown>[],
            memoryEvents: agentTurn.memoryEvents as unknown as Record<string, unknown>[],
            distortionState: (agentTurn.distortionState ?? null) as unknown as Record<string, unknown> | null,
            triggerCount: (typeof (conversation.metadata as Record<string, unknown> | null)?.triggerCount === 'number'
              ? (conversation.metadata as Record<string, unknown>).triggerCount as number
              : 0) + (agentTurn.triggerTag ? 1 : 0),
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
              behavior: behaviorMetadata,
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

  const responseHeaders = buildResponseHeaders(
    conversation.session_id,
    agentTurn.action ?? undefined,
    req.debug ? buildDebugPayload(agentTurn) : undefined,
    agentTurn.followUpHint ?? undefined,
    agentTurn.preThoughts,
  );
  responseHeaders['x-has-shadow'] = '1';
  responseHeaders['x-depth-tier'] = String(agentTurn.depthTier ?? 0);

  return new Response(responseStream, { headers: responseHeaders });
}

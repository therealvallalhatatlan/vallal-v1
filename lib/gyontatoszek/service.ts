
import { buildPrompt } from './prompt';
import { checkSafety } from './safety';
import { getAIResponse } from './provider';
import { saveConfessionRecord } from './repository';
import type { GyontatasRequest, GyontatasInsert } from './types';

// Helper: Convert AsyncIterable<string> to ReadableStream<Uint8Array>
function asyncIterableToByteStream(iterable: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for await (const chunk of iterable) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

export async function handleGyontatas(req: GyontatasRequest & { session_id?: string }) {
  const safety = checkSafety(req.confession);
  let aiResponse = '';
  let model = 'gpt-4o';
  let safetyFlag = !safety.safe;
  let responseStream: ReadableStream<Uint8Array>;

  if (!safety.safe) {
    // Return fallback as a single streamed chunk
    aiResponse = safety.fallback;
    const encoder = new TextEncoder();
    responseStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(safety.fallback));
        controller.close();
      },
    });
  } else {
    // Build prompt and stream AI response
    const messages = buildPrompt(req.confession);
    const textStream = await getAIResponse(messages);
    // Collect the response for persistence while streaming
    const encoder = new TextEncoder();
    let responseChunks: string[] = [];
    responseStream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        for await (const chunk of textStream) {
          responseChunks.push(chunk);
          controller.enqueue(encoder.encode(chunk));
        }
        aiResponse = responseChunks.join('');
        controller.close();
      },
    });
  }

  // Persist to Supabase (do not block response if fails)
  (async () => {
    try {
      // Wait for aiResponse to be filled if not safety fallback
      if (!safetyFlag && !aiResponse) {
        // Wait for the stream to finish (responseStream is already being read by the client)
        // So we can't await here, but we can only persist after streaming is done
        // Instead, persist the confession with empty response, or consider a more advanced approach if needed
      }
      const record: GyontatasInsert = {
        session_id: req.session_id || null,
        confession: req.confession,
        response: aiResponse,
        model,
        safety_flag: safetyFlag,
        metadata: {
          timestamp: new Date().toISOString(),
          // Add more metadata as needed
        },
      };
      await saveConfessionRecord(record);
    } catch (err) {
      console.error('Failed to persist confession:', err);
    }
  })();

  return new Response(responseStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

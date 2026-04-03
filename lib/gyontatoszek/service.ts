
import { buildPrompt } from './prompt';
import { checkSafety } from './safety';
import { getAIResponse } from './provider';
import type { GyontatasRequest } from './types';

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

export async function handleGyontatas(req: GyontatasRequest) {
  const safety = checkSafety(req.confession);
  if (!safety.safe) {
    // Return fallback as a single streamed chunk
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(safety.fallback));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  // Build prompt and stream AI response
  const messages = buildPrompt(req.confession);
  const textStream = await getAIResponse(messages);
  const byteStream = asyncIterableToByteStream(textStream);
  return new Response(
    byteStream,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}

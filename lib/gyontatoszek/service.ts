import { buildPrompt } from './prompt';
import { checkSafety } from './safety';
import { getAIResponse } from './provider';
import type { GyontatasRequest } from './types';

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
  return new Response(
    textStream as unknown as ReadableStream<Uint8Array>,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );
}

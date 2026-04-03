import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function getAIResponse(messages: any[]) {
  const model = openai('gpt-4o');
  const result = await streamText({
    model,
    messages,
    temperature: 0.85,
  });
  return result.textStream;
}
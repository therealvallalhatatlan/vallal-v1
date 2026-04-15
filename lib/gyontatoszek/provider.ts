import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

interface AIResponseOptions {
  temperature?: number;
  topP?: number;
}

export async function getAIResponse(messages: any[], options: AIResponseOptions = {}) {
  const model = openai('gpt-4o');
  const result = await streamText({
    model,
    messages,
    temperature: options.temperature ?? 0.85,
    topP: options.topP ?? 0.95,
  });
  return result.textStream;
}
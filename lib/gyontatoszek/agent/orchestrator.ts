import type { GyontatasMessage } from '../types';
import { detectAction } from './action';
import { analyzeInput, finalizeRuntimeState } from './analyzeInput';
import { selectDistortionHook, updateDistortionState } from './distortion';
import { selectExemplars } from './exemplars';
import { buildMemoryContext } from './memory';
import { updateProfile } from './profile';
import { interpretTurn } from './interpretation';
import { searchRelevantChunks } from './rag';
import { generateResponseStream } from './response';
import { buildStrategy } from './strategy';
import type { AgentTurnContext, DistortionState } from './types';

interface PrepareAgentTurnInput {
  input: string;
  history: GyontatasMessage[];
  conversationId: string;
  conversationMetadata: unknown;
  userId?: string;
  userEmail?: string | null;
  modulation?: AgentTurnContext['modulation'];
}

export async function prepareAgentTurn(input: PrepareAgentTurnInput): Promise<AgentTurnContext> {
  const interpretation = interpretTurn(input.input, input.history);
  const draftState = analyzeInput(input.input, input.history, interpretation);
  const memory = buildMemoryContext({
    conversationId: input.conversationId,
    conversationMetadata: input.conversationMetadata,
    history: input.history,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
  });
  const profile = updateProfile(memory.baseProfile, interpretation, memory.memoryEvents, memory.patternMemory);
  const strategyResult = buildStrategy({
    userInput: input.input,
    history: input.history,
    interpretation,
    profile,
    persistedMemory: memory.persistedMemory,
    modulation: input.modulation ?? null,
  });
  const runtimeState = finalizeRuntimeState({
    draft: draftState,
    profile,
    strategy: strategyResult.strategy.mode,
    behaviorIntensity: strategyResult.behavior.state.intensity,
  });
  const existingMetadata = (input.conversationMetadata && typeof input.conversationMetadata === 'object'
    ? (input.conversationMetadata as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const existingDistortion = (existingMetadata.distortionState ?? null) as DistortionState | null;
  const nextDistortionState = updateDistortionState(existingDistortion, memory.memoryEvents, input.input);
  const distortion = selectDistortionHook({
    input: input.input,
    memoryEvents: memory.memoryEvents,
    distortionState: nextDistortionState,
    strategyMode: strategyResult.strategy.mode,
    modulation: input.modulation ?? null,
  });

  const exemplars = selectExemplars(
    strategyResult.strategy.mode,
    interpretation.primaryIntent,
    interpretation.emotionalTone,
  );

  const ragContext = await searchRelevantChunks({
    query: input.input,
    themes: interpretation.extractedTopics,
    tone: runtimeState.emotion,
    intensity: runtimeState.intensity,
    limit: 3,
  });

  const action = detectAction({
    strategy: strategyResult.strategy,
    interpretation,
    profile,
    patternMemory: memory.patternMemory,
  });

  return {
    input: input.input,
    history: input.history,
    modulation: input.modulation ?? null,
    persistedMemory: memory.persistedMemory,
    interpretation,
    memoryEvents: memory.memoryEvents,
    patternMemory: memory.patternMemory,
    profile,
    runtimeState,
    ragContext,
    strategy: strategyResult.strategy,
    weightTrace: strategyResult.weightTrace,
    action,
    distortion: distortion.activeHook,
    distortionState: distortion.nextState,
    exemplars,
    behavior: strategyResult.behavior,
  };
}

export async function executeAgentResponse(context: AgentTurnContext) {
  return generateResponseStream(context);
}

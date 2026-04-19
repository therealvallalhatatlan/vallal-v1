import type { GyontatasMessage } from '../types';
import { detectAction } from './action';
import { analyzeInput, finalizeRuntimeState } from './analyzeInput';
import { selectDistortionHook, updateDistortionState } from './distortion';
import { selectExemplars } from './exemplars';
import { buildMemoryContext } from './memory';
import { updateProfile, computeDepthTier } from './profile';
import { interpretTurn } from './interpretation';
import { searchRelevantChunks } from './rag';
import { generateResponseStream } from './response';
import { buildStrategy } from './strategy';
import { detectEasterEggTrigger, detectSecretCodeTrigger } from './triggers';
import type { AgentTurnContext, DistortionState, UserProfile } from './types';

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
  // Returning user detection — uses stored lastInteractionAt before updateProfile overwrites it
  const storedLastInteraction = memory.baseProfile.lastInteractionAt;
  const hoursSinceLastVisit = storedLastInteraction
    ? (Date.now() - new Date(storedLastInteraction).getTime()) / (1000 * 60 * 60)
    : null;
  const returningUser =
    hoursSinceLastVisit !== null &&
    hoursSinceLastVisit > 4 &&
    (memory.baseProfile.familiarity > 0 || memory.patternMemory.length > 0);

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

  // Queue tangent hook when novelty_seeking is high or THC modulation is active
  const noveltySeeking = (profile.hiddenTraits as Record<string, { value: number } | undefined>)?.noveltySeeking?.value ?? 0;
  const thcLevel = input.modulation?.thc ?? 0;
  const queueTangent = noveltySeeking > 0.5 || thcLevel > 0.5;

  const nextDistortionState = updateDistortionState(existingDistortion, memory.memoryEvents, input.input, undefined, { queueTangent });
  const distortion = selectDistortionHook({
    input: input.input,
    memoryEvents: memory.memoryEvents,
    distortionState: nextDistortionState,
    strategyMode: strategyResult.strategy.mode,
    modulation: input.modulation ?? null,
  });

  // Easter egg trigger detection
  const sessionTriggerCount = typeof existingMetadata.triggerCount === 'number' ? existingMetadata.triggerCount : 0;
  const easterEgg = detectEasterEggTrigger(input.input, sessionTriggerCount);

  // Secret code easter egg (once per conversation)
  const secretCodeRevealed = existingMetadata.secretCodeRevealed === true;
  const secretCodeResult = detectSecretCodeTrigger(input.input, secretCodeRevealed);

  // Build follow-up hint when a follow_up_interrupt hook fires
  const followUpHint = buildFollowUpHint(distortion.activeHook, profile);
  const preThoughts = buildPreThoughts(interpretation, strategyResult.strategy, distortion.activeHook);

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
    triggerTag: easterEgg?.tag ?? null,
    triggerDirective: easterEgg?.directive ?? null,
    followUpHint: followUpHint ?? null,
    preThoughts,
    secretCodeTrigger: secretCodeResult?.directive ?? null,
    secretCodeJustRevealed: !!secretCodeResult,
    returningUser,
    hoursSinceLastVisit: hoursSinceLastVisit ?? null,
    depthTier: computeDepthTier(profile.familiarity, profile.trust),
  };
}

export async function executeAgentResponse(context: AgentTurnContext) {
  return generateResponseStream(context);
}

function buildFollowUpHint(
  hook: import('./types').DistortionHook | null,
  profile: UserProfile,
): string | null {
  if (!hook || hook.type !== 'follow_up_interrupt') return null;

  const topic = profile.recurringTopics[0] ?? hook.topic ?? null;
  if (!topic || topic === 'mellékszál') return null;

  const templates = [
    `...egyébként — ${topic} még mindig ott kering.`,
    `...visszatérve: ${topic}. ezt nem engedem el.`,
    `...${topic}. erre majd visszajövök.`,
    `...ja, és ${topic}. ezt ejtettük, de nem érdemes.`,
  ];

  const idx = Math.abs((topic.length * 7 + profile.recurringTopics.length * 3) % templates.length);
  return templates[idx];
}

function buildPreThoughts(
  interpretation: import('./types').InterpretationResult,
  strategy: import('./types').Strategy,
  distortion: import('./types').DistortionHook | null,
): string[] {
  const intentMap: Record<string, string[]> = {
    confession: ['na ez egy vallomás', 'ezzel mi a fasz legyek', 'komolyan gondolja?'],
    question: ['megint kérdez', 'erre van válaszom?', 'mit akar tudni'],
    challenge: ['nekijön — rendben', 'mi a fasz ez most', 'megint ezt tolja'],
    connection: ['közelebb akar jönni', 'hm. miért most', 'kapcsolódni próbál'],
    self_reference: ['magáról mesél — ezt figyelni kell', 'hova vezet ez', 'ez fontos'],
    unknown: ['nem értem mit akar', 'várj egy pillanat', 'mi ez pontosan'],
  };

  const toneMap: Record<string, string> = {
    vulnerable: 'sérülékeny — ezt nem tépem szét',
    tense: 'feszült — talán élesíteni kell',
    playful: 'játszik — de mi van mögötte',
    guarded: 'védekezik valami ellen',
  };

  const strategyMap: Record<string, string> = {
    confront: 'neki kell menni, nem kerülni',
    destabilize: 'ki kell billenteni',
    validate_then_twist: 'előbb igen — aztán elfordítani',
    challenge_action: 'lépésre kell tolni',
    withhold: 'visszatartom, hadd üljön',
  };

  const thoughts: string[] = [];

  const opts = intentMap[interpretation.primaryIntent] ?? intentMap.unknown;
  const seed = (interpretation.normalizedInput.length * 7 + Math.round(interpretation.confidence * 100)) % opts.length;
  thoughts.push(opts[seed]);

  const toneTh = toneMap[interpretation.emotionalTone];
  if (toneTh) thoughts.push(toneTh);

  const stratTh = strategyMap[strategy.mode];
  if (stratTh) thoughts.push(stratTh);

  if (distortion?.type === 'tangent') thoughts.push('el kéne kalandoznom valahová');

  return thoughts.slice(0, 4);
}

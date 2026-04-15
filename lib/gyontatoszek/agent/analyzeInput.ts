import type { GyontatasMessage } from '../types';
import { interpretTurn } from './interpretation';
import type { InterpretationResult, RuntimeState, StrategyMode, UserProfile } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferBaseIntensity(interpretation: InterpretationResult, historyLength: number) {
  const toneWeights: Record<InterpretationResult['emotionalTone'], number> = {
    neutral: 0.38,
    vulnerable: 0.72,
    guarded: 0.52,
    tense: 0.81,
    playful: 0.57,
  };

  const riskLift = interpretation.riskLevel === 'high' ? 0.12 : interpretation.riskLevel === 'medium' ? 0.06 : 0;
  const historyLift = historyLength > 8 ? 0.04 : 0;

  return clamp(Number((toneWeights[interpretation.emotionalTone] + riskLift + historyLift).toFixed(3)), 0, 1);
}

function inferProvisionalStrategy(interpretation: InterpretationResult): StrategyMode {
  if (interpretation.primaryIntent === 'challenge' || interpretation.emotionalTone === 'tense') {
    return 'confront';
  }

  if (interpretation.emotionalTone === 'vulnerable') {
    return 'validate_then_twist';
  }

  if (interpretation.emotionalTone === 'playful') {
    return 'destabilize';
  }

  if (interpretation.primaryIntent === 'question') {
    return 'withhold';
  }

  return 'mirror';
}

export function analyzeInput(
  message: string,
  history: GyontatasMessage[],
  interpretation: InterpretationResult = interpretTurn(message, history),
): RuntimeState {
  const normalizedMessage = message.toLowerCase();
  const confessionLike =
    /(i keep|ashamed|shame|i am scared|i'm scared|sorry|hurt|do not know why|don't know why)/.test(normalizedMessage);
  const normalizedEmotion =
    confessionLike && interpretation.emotionalTone !== 'playful' ? 'vulnerable' : interpretation.emotionalTone;
  const normalizedIntent =
    confessionLike || (interpretation.primaryIntent === 'question' && normalizedEmotion === 'vulnerable')
      ? 'confession'
      : interpretation.primaryIntent;

  const patterns = interpretation.patterns.length > 0
    ? interpretation.patterns
        .slice()
        .sort((left, right) => right.score - left.score)
        .slice(0, 4)
        .map((pattern) => pattern.name)
    : interpretation.extractedTopics.slice(0, 4);

  return {
    emotion: normalizedEmotion,
    intensity: inferBaseIntensity({ ...interpretation, emotionalTone: normalizedEmotion }, history.length),
    intent: normalizedIntent,
    patterns,
    traits: [],
    strategy: normalizedIntent === 'confession' ? 'validate_then_twist' : inferProvisionalStrategy(interpretation),
  };
}

export function finalizeRuntimeState(input: {
  draft: RuntimeState;
  profile: UserProfile;
  strategy: StrategyMode;
  behaviorIntensity?: number;
}): RuntimeState {
  const traits = Object.entries(input.profile.hiddenTraits)
    .slice()
    .sort((left, right) => right[1].value - left[1].value)
    .filter(([, trait]) => trait.value >= 0.35)
    .slice(0, 4)
    .map(([name]) => name);

  return {
    ...input.draft,
    intensity: clamp(Number((input.behaviorIntensity ?? input.draft.intensity).toFixed(3)), 0, 1),
    traits,
    strategy: input.strategy,
  };
}

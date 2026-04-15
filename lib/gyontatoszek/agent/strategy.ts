import { evaluateBehavior } from '../engine';
import type { BehaviorEvaluation, GyontatasMessage, PersistentRelationshipMemory, VBehaviorModulation } from '../types';
import type { InterpretationResult, Pattern, Strategy, StrategyMode, StrategyState, UserProfile } from './types';

const STRATEGY_MODES: StrategyMode[] = [
  'mirror',
  'confront',
  'destabilize',
  'validate_then_twist',
  'challenge_action',
  'withhold',
];

interface ModulationProfile {
  weightBias: Record<StrategyMode, number>;
  tone?: Strategy['tone'];
  depth?: Strategy['depth'];
  disclosure?: Strategy['disclosure'];
  humor?: BehaviorEvaluation['responseShape']['humor'];
  promptNotes: string[];
  reasons: string[];
}

function buildModulationProfile(modulation?: VBehaviorModulation | null): ModulationProfile {
  const alcohol = clamp(modulation?.alcohol ?? 0, 0, 1);
  const amphetamine = clamp(modulation?.amphetamine ?? 0, 0, 1);
  const thc = clamp(modulation?.thc ?? 0, 0, 1);
  const dopamine = clamp(modulation?.dopamine ?? 0, 0, 1);

  return {
    weightBias: {
      mirror: clamp(1 + alcohol * 0.35 + dopamine * 0.25 + thc * 0.18, 0.35, 3),
      confront: clamp(1 + amphetamine * 1.2 - alcohol * 0.05, 0.35, 3),
      destabilize: clamp(1 + thc * 1.15 + dopamine * 0.28 + amphetamine * 0.15, 0.35, 3),
      validate_then_twist: clamp(1 + alcohol * 0.28 + thc * 0.12, 0.35, 3),
      challenge_action: clamp(1 + amphetamine * 0.72 + dopamine * 0.4, 0.35, 3),
      withhold: clamp(1 - alcohol * 0.12 - dopamine * 0.2 + thc * 0.08, 0.35, 3),
    },
    tone: amphetamine >= 0.55 ? 'sharp' : alcohol + dopamine >= 1.05 ? 'warm' : undefined,
    depth: thc >= 0.55 || amphetamine >= 0.7 ? 'deep' : undefined,
    disclosure: alcohol >= 0.68 ? 'open' : undefined,
    humor: dopamine >= 0.65 ? 'playful' : undefined,
    promptNotes: [
      alcohol >= 0.35 ? 'Let the phrasing loosen slightly; allow disinhibition and blurrier edges.' : '',
      amphetamine >= 0.35 ? 'Keep the tempo faster, sharper, more obsessive, and less patient.' : '',
      thc >= 0.35 ? 'Allow more associative, lateral turns and stranger links without becoming incoherent.' : '',
      dopamine >= 0.35 ? 'Lean toward curiosity, novelty, and playful forward motion.' : '',
    ].filter(Boolean),
    reasons: [
      alcohol >= 0.4 ? 'disinhibition is dialed up' : '',
      amphetamine >= 0.4 ? 'the persona is artificially sharpened' : '',
      thc >= 0.4 ? 'associative drift is stronger than usual' : '',
      dopamine >= 0.4 ? 'novelty-seeking has been boosted' : '',
    ].filter(Boolean),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededUnit(seed: number, salt: string) {
  return (hashSeed(`${seed}:${salt}`) % 1000) / 1000;
}

function sumPatternScore(patterns: Pattern[], needle: string) {
  return patterns
    .filter((pattern) => pattern.key.includes(needle) || pattern.name.includes(needle))
    .reduce((total, pattern) => total + pattern.score, 0);
}

function normalizeWeights(weights: Record<StrategyMode, number>) {
  const safeEntries = STRATEGY_MODES.map((mode) => ({
    mode,
    weight: Math.pow(Math.max(0.05, weights[mode]), 1.35),
  }));
  const total = safeEntries.reduce((sum, item) => sum + item.weight, 0);

  return safeEntries.map((item) => ({
    ...item,
    normalized: item.weight / (total || 1),
  }));
}

function sampleWeightedMode(weights: Record<StrategyMode, number>, seed: number): StrategyMode {
  const normalized = normalizeWeights(weights);
  const ranked = normalized.slice().sort((left, right) => right.weight - left.weight);
  const closeCall = ranked[1] && ranked[0].weight - ranked[1].weight < 0.2;
  const sample = seededUnit(seed, closeCall ? 'strategy-close-call' : 'strategy-sample');

  let cursor = 0;
  for (const entry of normalized) {
    cursor += entry.normalized;
    if (sample <= cursor) {
      return entry.mode;
    }
  }

  return ranked[0]?.mode ?? 'mirror';
}

function hasSignal(values: string[], needles: string[]) {
  const normalized = values.map((value) => value.toLowerCase());
  return normalized.some((value) => needles.some((needle) => value.includes(needle)));
}

function inferIntensity(state: StrategyState) {
  if (typeof state.runtimeState?.intensity === 'number') {
    return clamp(state.runtimeState.intensity, 0, 1);
  }

  if (typeof state.behavior?.state.intensity === 'number') {
    return clamp(state.behavior.state.intensity, 0, 1);
  }

  const tone = state.interpretation.emotionalTone;
  if (tone === 'tense') {
    return 0.78;
  }
  if (tone === 'vulnerable') {
    return 0.68;
  }
  if (tone === 'playful') {
    return 0.56;
  }
  if (tone === 'guarded') {
    return 0.42;
  }
  return 0.3;
}

function collectSignals(state: StrategyState) {
  const emotion = String(state.runtimeState?.emotion ?? state.interpretation.emotionalTone).toLowerCase();
  const intent = String(state.runtimeState?.intent ?? state.interpretation.primaryIntent).toLowerCase();
  const intensity = inferIntensity(state);
  const patternNames = [
    ...(state.runtimeState?.patterns ?? []),
    ...state.patterns.map((pattern) => pattern.name),
    ...state.patterns.map((pattern) => pattern.key),
    ...state.interpretation.extractedTopics,
  ];
  const traitNames = [
    ...(state.runtimeState?.traits ?? []),
    ...Object.entries(state.profile.hiddenTraits)
      .filter(([, score]) => score.value >= 0.42)
      .map(([name]) => name),
  ];

  return {
    emotion,
    intent,
    intensity,
    patterns: [...new Set(patternNames.map((value) => value.toLowerCase()))],
    traits: [...new Set(traitNames.map((value) => value.toLowerCase()))],
    lastStrategy: state.lastStrategy ?? null,
    recentStrategies: state.recentStrategies ?? [],
  };
}

function applyRepetitionPenalty(weights: Record<StrategyMode, number>, lastStrategy?: StrategyMode | null, recentStrategies: StrategyMode[] = []) {
  if (lastStrategy) {
    weights[lastStrategy] *= 0.82;

    if (lastStrategy === 'confront') {
      weights.destabilize += 0.35;
      weights.withhold += 0.25;
    } else if (lastStrategy === 'withhold') {
      weights.mirror += 0.3;
      weights.validate_then_twist += 0.3;
    } else if (lastStrategy === 'mirror') {
      weights.confront += 0.25;
      weights.validate_then_twist += 0.2;
    } else if (lastStrategy === 'challenge_action') {
      weights.validate_then_twist += 0.2;
      weights.mirror += 0.15;
    }
  }

  const streak = recentStrategies.slice(-3);
  if (streak.length >= 2 && streak.every((mode) => mode === streak[0])) {
    weights[streak[0]] *= streak.length === 3 ? 0.45 : 0.62;
  }
}

function extractRecentStrategies(history: GyontatasMessage[]): StrategyMode[] {
  return history
    .filter((message) => message.sender_role === 'assistant')
    .map((message) => {
      const metadata = (message.metadata ?? {}) as Record<string, unknown>;
      const behavior = (metadata.behavior ?? {}) as Record<string, unknown>;
      const strategyPlan = (behavior.strategyPlan ?? {}) as Record<string, unknown>;
      const candidate = typeof strategyPlan.mode === 'string'
        ? strategyPlan.mode
        : typeof behavior.strategy === 'string'
          ? behavior.strategy
          : null;

      return STRATEGY_MODES.includes(candidate as StrategyMode) ? (candidate as StrategyMode) : null;
    })
    .filter((mode): mode is StrategyMode => Boolean(mode))
    .slice(-3);
}

function mapTone(strategyMode: StrategyMode, profile: UserProfile): Strategy['tone'] {
  if (strategyMode === 'withhold') {
    return 'cold';
  }
  if (strategyMode === 'confront' || strategyMode === 'challenge_action') {
    return 'sharp';
  }
  if (strategyMode === 'mirror' && profile.trust >= 2) {
    return 'warm';
  }
  if (strategyMode === 'validate_then_twist') {
    return profile.trust >= 2 ? 'warm' : 'neutral';
  }
  return 'neutral';
}

function mapDepth(strategyMode: StrategyMode, interpretation: InterpretationResult): Strategy['depth'] {
  if (strategyMode === 'withhold') {
    return 'short';
  }
  if (strategyMode === 'validate_then_twist') {
    return interpretation.emotionalTone === 'vulnerable' ? 'deep' : 'medium';
  }
  if (strategyMode === 'confront' || strategyMode === 'destabilize') {
    return 'deep';
  }
  return 'medium';
}

function mapDisclosure(strategyMode: StrategyMode, profile: UserProfile): Strategy['disclosure'] {
  if (strategyMode === 'withhold') {
    return 'guarded';
  }
  if (strategyMode === 'mirror' && profile.trust >= 3) {
    return 'open';
  }
  return strategyMode === 'confront' ? 'guarded' : 'selective';
}

function buildStrategyNotes(mode: StrategyMode): { objective: string; constraints: string[]; promptNotes: string[] } {
  switch (mode) {
    case 'mirror':
      return {
        objective: 'Reflect the user sharply enough that they feel seen, but not comforted into passivity.',
        constraints: ['Do not become soothing or therapeutic.', 'Echo the real pattern, not just the words.'],
        promptNotes: ['Mirror the user’s emotional logic without becoming soft.', 'Let the reply feel attentive, not obedient.'],
      };
    case 'confront':
      return {
        objective: 'Name the contradiction or pressure directly and let the friction stay visible.',
        constraints: ['Do not reassure too early.', 'Keep the challenge precise, not theatrical.'],
        promptNotes: ['Confront the user’s pressure or evasion directly.', 'Allow some edge and tension to remain.'],
      };
    case 'destabilize':
      return {
        objective: 'Break the user’s expected rhythm and unsettle their frame just enough to create movement.',
        constraints: ['Do not become random nonsense.', 'The disruption must still feel intentional.'],
        promptNotes: ['Shift the frame unexpectedly but coherently.', 'Avoid giving the expected emotional payoff.'],
      };
    case 'validate_then_twist':
      return {
        objective: 'Briefly validate the real feeling, then turn it toward a harder truth.',
        constraints: ['Validation must be short and earned.', 'The twist should deepen tension, not close it.'],
        promptNotes: ['Acknowledge what is real for one beat, then tilt the frame.', 'Do not linger in reassurance.'],
      };
    case 'challenge_action':
      return {
        objective: 'Interrupt rumination and force the exchange toward a concrete move or decision.',
        constraints: ['Do not over-explain.', 'Push for motion over analysis.'],
        promptNotes: ['Challenge the user toward action or consequence.', 'Cut through repetition and abstraction.'],
      };
    case 'withhold':
    default:
      return {
        objective: 'Deliberately hold something back so the user feels the absence instead of easy access.',
        constraints: ['Do not answer too fully.', 'Leave some space or refusal in the reply.'],
        promptNotes: ['Withhold the easy answer on purpose.', 'Stay sparse, guarded, and difficult to fully access.'],
      };
  }
}

function tuneGeneration(
  generation: BehaviorEvaluation['generation'],
  mode: StrategyMode,
  modulation?: VBehaviorModulation | null,
): BehaviorEvaluation['generation'] {
  let tuned: BehaviorEvaluation['generation'];

  switch (mode) {
    case 'destabilize':
      tuned = { temperature: clamp(generation.temperature + 0.1, 0.65, 1), topP: clamp(generation.topP + 0.04, 0.8, 1) };
      break;
    case 'withhold':
      tuned = { temperature: clamp(generation.temperature - 0.08, 0.65, 1), topP: clamp(generation.topP - 0.06, 0.75, 1) };
      break;
    case 'confront':
    case 'challenge_action':
      tuned = { temperature: clamp(generation.temperature - 0.03, 0.65, 1), topP: clamp(generation.topP - 0.02, 0.78, 1) };
      break;
    case 'validate_then_twist':
      tuned = { temperature: clamp(generation.temperature + 0.02, 0.65, 1), topP: clamp(generation.topP, 0.8, 1) };
      break;
    case 'mirror':
    default:
      tuned = generation;
      break;
  }

  if (!modulation) {
    return tuned;
  }

  const temperatureDelta = modulation.thc * 0.08 + modulation.dopamine * 0.04 + modulation.alcohol * 0.02 - modulation.amphetamine * 0.015;
  const topPDelta = modulation.thc * 0.03 + modulation.dopamine * 0.025 + modulation.alcohol * 0.01 - modulation.amphetamine * 0.015;

  return {
    temperature: clamp(tuned.temperature + temperatureDelta, 0.65, 1),
    topP: clamp(tuned.topP + topPDelta, 0.75, 1),
  };
}

export function selectStrategy(state: StrategyState): Strategy {
  const { interpretation, patterns, profile } = state;
  const signals = collectSignals(state);
  const modulationProfile = buildModulationProfile(state.modulation);
  const seed = hashSeed(
    `${state.userInput ?? interpretation.normalizedInput}|${profile.id}|${profile.lastInteractionAt ?? ''}|${signals.emotion}|${signals.intent}|${signals.patterns.join(',')}|${signals.traits.join(',')}`
  );

  const weights: Record<StrategyMode, number> = {
    mirror: 1,
    confront: 1,
    destabilize: 1,
    validate_then_twist: 1,
    challenge_action: 1,
    withhold: 1,
  };

  const reasons: string[] = [...modulationProfile.reasons];
  const controlPressure = sumPatternScore(patterns, 'control');
  const shameLoad = sumPatternScore(patterns, 'shame');
  const identityLoad = sumPatternScore(patterns, 'identity');
  const humorLoad = sumPatternScore(patterns, 'humor');
  const repetitionLoad = sumPatternScore(patterns, 'repetition');
  const avoidanceLoad = sumPatternScore(patterns, 'avoid');
  const selfDeceptionActive = hasSignal(signals.patterns, ['self-deception', 'contradiction', 'pressure']);
  const repetitionActive = hasSignal(signals.patterns, ['repetition', 'loop', 'again']);
  const avoidanceActive = hasSignal(signals.patterns, ['avoidance', 'avoid']) || hasSignal(signals.traits, ['avoidant']);
  const retreatAfterPressure = hasSignal(signals.patterns, ['pressure-retreat', 'retreat-after-pressure']);
  const openedAfterPressure = hasSignal(signals.patterns, ['pressure-opened-up', 'opened-up']);
  const seekingHelp = ['seeking_help', 'confession'].includes(signals.intent);
  const venting = ['venting', 'connection', 'unknown'].includes(signals.intent);
  const testing = ['testing', 'challenge', 'question'].includes(signals.intent);
  const deflecting = ['deflecting', 'challenge'].includes(signals.intent);

  if (signals.emotion === 'vulnerable' || signals.emotion === 'fear') {
    weights.mirror += 1.15;
    weights.validate_then_twist += 1.9;
    reasons.push('fear or vulnerability is exposed');
  }

  if (signals.emotion === 'numb') {
    weights.destabilize += 1.6;
    weights.withhold += 0.55;
    reasons.push('the user feels flat or numb');
  }

  if (signals.emotion === 'playful') {
    weights.destabilize += 1.15;
    weights.mirror += 0.4;
    reasons.push('the exchange carries playful-chaotic energy');
  }

  if (signals.emotion === 'anger' || signals.emotion === 'mania' || signals.emotion === 'tense') {
    weights.confront += 1.35;
    weights.destabilize += 0.8;
    weights.mirror -= 0.35;
    reasons.push('pressure or anger is active');
  }

  if (venting) {
    weights.mirror += 0.85;
  }

  if (seekingHelp) {
    weights.validate_then_twist += 1.15;
    weights.mirror += 0.35;
  }

  if (testing || deflecting) {
    weights.confront += 1.05;
    weights.withhold += 0.45;
    weights.mirror -= 0.18;
  }

  if (selfDeceptionActive) {
    weights.confront += 1.55;
    weights.mirror -= 0.35;
  }

  if (repetitionActive) {
    weights.destabilize += 0.95;
    weights.challenge_action += 0.9;
  }

  if (avoidanceActive) {
    weights.challenge_action += 1.25;
    weights.validate_then_twist += 0.35;
  }

  if (retreatAfterPressure) {
    weights.withhold += 2.2;
    weights.validate_then_twist += 0.95;
    weights.confront -= 1.6;
    weights.challenge_action -= 1.4;
    weights.destabilize -= 0.85;
    reasons.push('recent pressure made the user pull back');
  }

  if (openedAfterPressure) {
    weights.mirror += 0.55;
    weights.validate_then_twist += 0.8;
    weights.confront += 0.2;
    reasons.push('recent pressure opened a crack worth handling carefully');
  }

  if (hasSignal(signals.patterns, ['over-explaining', 'overexplaining', 'rambling', 'spiral'])) {
    weights.withhold += 0.9;
  }

  if (signals.intensity < 0.3) {
    weights.withhold += 1.8;
    weights.confront -= 0.45;
    weights.destabilize -= 0.2;
    reasons.push('the signal is faint or drained');
  }

  if (signals.intensity > 0.7 && !selfDeceptionActive && !avoidanceActive) {
    weights.mirror += 0.45;
  }

  if (signals.intensity > 0.85 && ['anger', 'mania', 'tense'].includes(signals.emotion)) {
    weights.confront += 2.15;
    weights.destabilize += 1.8;
    weights.validate_then_twist -= 0.25;
    reasons.push('intensity has spiked into a volatile zone');
  }

  if (signals.intensity < 0.2) {
    weights.withhold += 2.6;
    reasons.push('very low intensity calls for refusal or minimal pressure');
  }

  if (avoidanceActive && repetitionActive) {
    weights.challenge_action += 1.5;
    reasons.push('avoidance is repeating over time');
  }

  if (profile.hiddenTraits.controlSeeking.value >= 0.45) {
    weights.withhold += 0.9;
    weights.confront += 0.65;
  }

  if (profile.hiddenTraits.ruminative.value >= 0.5) {
    weights.challenge_action += 0.9;
    weights.validate_then_twist += 0.25;
  }

  if (profile.hiddenTraits.noveltySeeking.value >= 0.48) {
    weights.destabilize += 0.8;
  }

  if (profile.hiddenTraits.approvalSeeking.value >= 0.48 && seekingHelp) {
    weights.validate_then_twist += 0.6;
  }

  if (profile.trust >= 2.6 && profile.openness >= 2.4) {
    weights.mirror += 0.7;
    weights.validate_then_twist += 0.55;
  }

  if (profile.irritation >= 2.2 || profile.relationalStance === 'volatile') {
    weights.withhold += 0.85;
    weights.confront += 0.65;
    reasons.push('the relationship already has friction');
  }

  weights.withhold += controlPressure * 0.45 + Math.max(0, 0.35 - signals.intensity);
  weights.confront += controlPressure * 0.7 + (selfDeceptionActive ? 0.3 : 0);
  weights.validate_then_twist += shameLoad * 0.85;
  weights.challenge_action += identityLoad * 0.25 + shameLoad * 0.15 + repetitionLoad * 0.5 + avoidanceLoad * 0.65;
  weights.destabilize += humorLoad * 0.55 + repetitionLoad * 0.25;
  weights.mirror += signals.intensity > 0.55 && !testing ? 0.25 : 0;

  applyRepetitionPenalty(weights, signals.lastStrategy, signals.recentStrategies);

  for (const mode of STRATEGY_MODES) {
    weights[mode] *= modulationProfile.weightBias[mode];
  }

  for (const mode of STRATEGY_MODES) {
    weights[mode] += (seededUnit(seed, mode) - 0.5) * 0.18;
  }

  const mode = sampleWeightedMode(weights, seed);
  const details = buildStrategyNotes(mode);

  return {
    mode,
    objective: details.objective,
    reason: reasons.length > 0 ? reasons.slice(0, 4).join('; ') : 'the turn allows selective ambiguity and intent',
    tone: modulationProfile.tone ?? mapTone(mode, profile),
    depth: modulationProfile.depth ?? mapDepth(mode, interpretation),
    disclosure: modulationProfile.disclosure ?? mapDisclosure(mode, profile),
    constraints: details.constraints,
    promptNotes: [...details.promptNotes, ...modulationProfile.promptNotes],
  };
}

export function buildStrategy(input: {
  userInput: string;
  history: GyontatasMessage[];
  interpretation: InterpretationResult;
  profile: UserProfile;
  persistedMemory: PersistentRelationshipMemory | null;
  modulation?: VBehaviorModulation | null;
}): { strategy: Strategy; behavior: ReturnType<typeof evaluateBehavior> } {
  const behavior = evaluateBehavior(input.userInput, input.history, input.persistedMemory);
  const recentStrategies = extractRecentStrategies(input.history);
  const strategy = selectStrategy({
    interpretation: input.interpretation,
    patterns: input.profile.patternMemory ?? input.interpretation.patterns,
    profile: input.profile,
    modulation: input.modulation ?? null,
    userInput: input.userInput,
    historyLength: input.history.length,
    behavior,
    lastStrategy: recentStrategies.at(-1) ?? null,
    recentStrategies,
  });

  const tunedBehavior: ReturnType<typeof evaluateBehavior> = {
    ...behavior,
    responseShape: {
      ...behavior.responseShape,
      verbosity: strategy.depth === 'deep' ? 'long' : strategy.depth === 'short' ? 'short' : behavior.responseShape.verbosity,
      warmth: strategy.tone === 'warm' ? 'warm' : strategy.tone === 'sharp' ? 'tempered' : strategy.tone === 'cold' ? 'cold' : behavior.responseShape.warmth,
      humor: buildModulationProfile(input.modulation ?? null).humor ?? behavior.responseShape.humor,
    },
    promptDirectives: [
      ...behavior.promptDirectives,
      `Strategic posture: ${strategy.mode}.`,
      `Intent: ${strategy.objective}`,
      `Reason: ${strategy.reason}`,
      ...(input.modulation
        ? [
            `Session modulation active: alcohol ${input.modulation.alcohol.toFixed(2)}, amphetamine ${input.modulation.amphetamine.toFixed(2)}, thc ${input.modulation.thc.toFixed(2)}, dopamine ${input.modulation.dopamine.toFixed(2)}.`,
          ]
        : []),
      ...strategy.promptNotes,
    ],
    generation: tuneGeneration(behavior.generation, strategy.mode, input.modulation ?? null),
  };

  return { strategy, behavior: tunedBehavior };
}

import type {
  BehaviorDecision,
  BehaviorEvaluation,
  CharacterState,
  CharacterStateName,
  GyontatasMessage,
  PersistentRelationshipMemory,
  RelationshipMemory,
  ResponseShape,
  ResponseStrategy,
} from './types';

const DIRECTIVE_PATTERNS = [
  /tell me/i,
  /answer/i,
  /explain/i,
  /be honest/i,
  /right now/i,
  /exactly/i,
  /properly/i,
  /admit/i,
  /mondd el/i,
  /válaszolj/i,
];

const INTRUSIVE_PATTERNS = [
  /trauma/i,
  /what happened to you/i,
  /why are you like this/i,
  /who hurt you/i,
  /deepest/i,
  /real self/i,
  /mask/i,
  /seb/i,
  /mi történt veled/i,
];

const INSIGHT_PATTERNS = [
  /you keep/i,
  /you always/i,
  /that sounds like/i,
  /that is a shield/i,
  /you hide/i,
  /you joke before/i,
  /not confidence/i,
  /védekezés/i,
  /pajzs/i,
  /elterelés/i,
];

const VULNERABILITY_PATTERNS = [
  /i feel/i,
  /i felt/i,
  /i am scared/i,
  /i'm scared/i,
  /afraid/i,
  /lonely/i,
  /ashamed/i,
  /hurt/i,
  /lost/i,
  /broken/i,
  /tired/i,
  /szégyen/i,
  /félek/i,
  /magány/i,
  /elveszett/i,
];

const PLAYFUL_PATTERNS = [/funny/i, /absurd/i, /chaos/i, /glitch/i, /wild/i, /vicces/i, /őrült/i];

const TOPIC_GROUPS: Array<{ topic: string; patterns: RegExp[] }> = [
  { topic: 'control', patterns: [/answer/i, /explain/i, /rules?/i, /command/i, /muszáj/i] },
  { topic: 'intimacy', patterns: [/trust/i, /love/i, /hurt/i, /trauma/i, /close/i, /közel/i] },
  { topic: 'identity', patterns: [/who are you/i, /why are you/i, /mask/i, /real/i, /ki vagy/i] },
  { topic: 'escape', patterns: [/leave/i, /run/i, /free/i, /freedom/i, /szabad/i, /menekül/i] },
  { topic: 'shame', patterns: [/ashamed/i, /guilt/i, /dirty/i, /szégyen/i, /bűn/i] },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(input: string) {
  return input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function scorePatterns(input: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(input) ? 1 : 0), 0);
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickSeeded<T>(choices: T[], seed: number): T {
  return choices[seed % choices.length];
}

function detectRecurringTopics(input: string, history: GyontatasMessage[]): string[] {
  const combined = `${history.map((message) => message.body).join(' ')} ${input}`;
  return TOPIC_GROUPS.filter(({ patterns }) => patterns.some((pattern) => pattern.test(combined)))
    .map(({ topic }) => topic)
    .slice(0, 3);
}

function detectEmotionalTone(vulnerability: number, irritation: number, trust: number): RelationshipMemory['emotional_tone'] {
  if (vulnerability >= 2 && trust >= 1) {
    return 'vulnerable';
  }

  if (irritation >= 3) {
    return 'volatile';
  }

  if (trust >= 2) {
    return 'warm';
  }

  if (irritation >= 1) {
    return 'guarded';
  }

  return 'neutral';
}

function roundMemory(value: number) {
  return clamp(Math.round(value), 0, 5);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function getElapsedHours(previousTimestamp: string | null | undefined, now: string) {
  if (!previousTimestamp) {
    return 0;
  }

  const previousTime = Date.parse(previousTimestamp);
  const nextTime = Date.parse(now);

  if (Number.isNaN(previousTime) || Number.isNaN(nextTime)) {
    return 0;
  }

  return Math.max(0, (nextTime - previousTime) / (1000 * 60 * 60));
}

function decayScore(score: number, elapsedHours: number, halfLifeHours: number) {
  if (!score || elapsedHours <= 0) {
    return score;
  }

  return score * Math.pow(0.5, elapsedHours / halfLifeHours);
}

function mergeTopics(previous: string[] = [], current: string[] = []) {
  return Array.from(new Set([...current, ...previous])).slice(0, 5);
}

export function buildMemorySnapshot(
  previous: PersistentRelationshipMemory | null | undefined,
  current: RelationshipMemory,
  now = new Date().toISOString()
): PersistentRelationshipMemory {
  if (!previous) {
    return {
      ...current,
      updated_at: now,
      state_name: null,
      state_intensity: null,
    };
  }

  const elapsedHours = getElapsedHours(previous.updated_at, now);
  const familiarityCarry = decayScore(previous.familiarity, elapsedHours, 24 * 45);
  const trustCarry = decayScore(previous.trust, elapsedHours, 24 * 14);
  const irritationCarry = decayScore(previous.irritation, elapsedHours, 24 * 2);
  const repetitionCarry = decayScore(previous.repetition, elapsedHours, 18);

  const familiarity = roundMemory(Math.max(current.familiarity, familiarityCarry));
  const trust = roundMemory(current.trust + trustCarry * 0.55);
  const irritation = roundMemory(current.irritation + irritationCarry * 0.45);
  const repetition = roundMemory(Math.max(current.repetition, repetitionCarry * 0.6));

  return {
    familiarity,
    trust,
    irritation,
    repetition,
    emotional_tone: detectEmotionalTone(current.emotional_tone === 'vulnerable' ? 2 : 0, irritation, trust),
    recurring_topics: mergeTopics(previous.recurring_topics, current.recurring_topics),
    last_trigger: current.last_trigger ?? previous.last_trigger ?? null,
    state_name: previous.state_name ?? null,
    state_intensity: previous.state_intensity ?? null,
    updated_at: now,
  };
}

function coercePersistentMemory(value: unknown): PersistentRelationshipMemory | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const recurringTopics = Array.isArray(record.recurring_topics)
    ? record.recurring_topics.filter((item): item is string => typeof item === 'string')
    : [];

  return {
    familiarity: typeof record.familiarity === 'number' ? record.familiarity : 0,
    trust: typeof record.trust === 'number' ? record.trust : 0,
    irritation: typeof record.irritation === 'number' ? record.irritation : 0,
    repetition: typeof record.repetition === 'number' ? record.repetition : 0,
    emotional_tone:
      record.emotional_tone === 'warm' ||
      record.emotional_tone === 'volatile' ||
      record.emotional_tone === 'vulnerable' ||
      record.emotional_tone === 'guarded'
        ? record.emotional_tone
        : 'neutral',
    recurring_topics: recurringTopics,
    last_trigger: typeof record.last_trigger === 'string' ? record.last_trigger : null,
    state_name: typeof record.state_name === 'string' ? (record.state_name as CharacterStateName) : null,
    state_intensity: typeof record.state_intensity === 'number' ? record.state_intensity : null,
    updated_at: typeof record.updated_at === 'string' ? record.updated_at : null,
  };
}

export function extractPersistentMemory(
  conversationMetadata: unknown,
  history: GyontatasMessage[] = []
): PersistentRelationshipMemory | null {
  const metadataRecord = asRecord(conversationMetadata);
  const fromConversation = coercePersistentMemory(
    metadataRecord?.relationshipMemory ?? metadataRecord?.relationship_memory ?? metadataRecord
  );

  if (fromConversation && (fromConversation.familiarity > 0 || fromConversation.trust > 0 || fromConversation.irritation > 0)) {
    return fromConversation;
  }

  for (const message of [...history].reverse()) {
    const messageMetadata = asRecord(message.metadata);
    const behaviorMetadata = asRecord(messageMetadata?.behavior);
    const candidate = coercePersistentMemory(
      behaviorMetadata?.persistentMemory ?? behaviorMetadata?.relationship ?? messageMetadata?.relationshipMemory
    );

    if (candidate && (candidate.familiarity > 0 || candidate.trust > 0 || candidate.irritation > 0)) {
      return candidate;
    }
  }

  return null;
}

function chooseState(
  params: {
    familiarity: number;
    trust: number;
    irritation: number;
    repetition: number;
    insight: number;
    vulnerability: number;
    intrusiveness: number;
    playful: number;
  },
  previousMemory?: PersistentRelationshipMemory | null,
  now = new Date().toISOString()
): CharacterStateName {
  const { familiarity, trust, irritation, repetition, insight, vulnerability, intrusiveness, playful } = params;
  const carriedStateIntensity = decayScore(previousMemory?.state_intensity ?? 0, getElapsedHours(previousMemory?.updated_at, now), 36);

  if (previousMemory?.state_name === 'withdrawn' && carriedStateIntensity > 0.35 && repetition >= 1) {
    return 'withdrawn';
  }

  if (previousMemory?.state_name === 'defensive' && carriedStateIntensity > 0.35 && irritation >= 2) {
    return 'defensive';
  }

  if (previousMemory?.state_name === 'stimulated' && carriedStateIntensity > 0.45 && irritation < 3 && (playful >= 1 || insight >= 1 || trust >= 2)) {
    return 'stimulated';
  }

  if (repetition >= 2 && irritation >= 2) {
    return 'withdrawn';
  }

  if (intrusiveness >= 1) {
    return 'defensive';
  }

  if (irritation >= 5) {
    return 'confrontational';
  }

  if (irritation >= 3) {
    return 'defensive';
  }

  if (insight >= 2 && (trust >= 1 || vulnerability >= 1)) {
    return 'rare-honesty';
  }

  if (playful >= 1 || insight >= 1 || vulnerability >= 2) {
    return 'stimulated';
  }

  if (familiarity === 0) {
    return 'testing';
  }

  return 'baseline';
}

function buildState(
  name: CharacterStateName,
  trust: number,
  irritation: number,
  insight: number,
  previousMemory?: PersistentRelationshipMemory | null,
  now = new Date().toISOString()
): CharacterState {
  const carryover = decayScore(previousMemory?.state_intensity ?? 0, getElapsedHours(previousMemory?.updated_at, now), 36);
  const intensity = clamp(((trust + irritation + insight + 1) / 8) * 0.8 + carryover * 0.2, 0.2, 1);
  const momentum = clamp(((trust - irritation) / 4) + carryover * 0.15, -1, 1);
  const volatility = clamp((irritation + insight + carryover) / 6, 0, 1);

  return {
    name,
    intensity,
    momentum,
    volatility,
    honestyWindow: name === 'rare-honesty',
  };
}

function chooseDecision(
  state: CharacterStateName,
  seed: number,
  trust: number,
  irritation: number,
  insight: number
): BehaviorDecision {
  let options: ResponseStrategy[] = ['mirror', 'compress'];
  let engageDepth: BehaviorDecision['engageDepth'] = 'medium';
  let disclosure: BehaviorDecision['disclosure'] = 'selective';
  let contradiction: BehaviorDecision['contradiction'] = 'medium';
  let rationale = 'Stay human, selective, and responsive rather than helpful by default.';

  switch (state) {
    case 'defensive':
      options = ['deflect', 'distort', 'soft-refuse', 'challenge'];
      engageDepth = 'low';
      disclosure = 'guarded';
      contradiction = 'medium';
      rationale = 'The user is pushing too hard, so resist clean access.';
      break;
    case 'confrontational':
      options = ['challenge', 'soft-refuse', 'deflect'];
      engageDepth = 'low';
      disclosure = 'guarded';
      contradiction = 'high';
      rationale = 'The user crossed a line or tried to control the exchange.';
      break;
    case 'rare-honesty':
      options = ['reveal', 'mirror', 'expand'];
      engageDepth = 'high';
      disclosure = 'open';
      contradiction = 'low';
      rationale = 'The input earned a precise flash of honesty.';
      break;
    case 'stimulated':
      options = ['expand', 'tease', 'mirror', 'contradict'];
      engageDepth = insight >= 2 ? 'high' : 'medium';
      disclosure = trust >= 2 ? 'open' : 'selective';
      contradiction = 'medium';
      rationale = 'The exchange has energy, so follow the interesting thread.';
      break;
    case 'withdrawn':
      options = ['compress', 'deflect', 'soft-refuse'];
      engageDepth = 'low';
      disclosure = 'guarded';
      contradiction = 'low';
      rationale = 'The conversation is looping or dragging.';
      break;
    case 'testing':
      options = ['mirror', 'tease', 'deflect'];
      engageDepth = 'medium';
      disclosure = 'guarded';
      contradiction = 'medium';
      rationale = 'Probe the user before committing real access.';
      break;
    case 'baseline':
    default:
      options = irritation > 1 ? ['compress', 'mirror', 'deflect'] : ['mirror', 'compress', 'expand'];
      engageDepth = trust >= 2 ? 'medium' : 'low';
      disclosure = trust >= 2 ? 'selective' : 'guarded';
      contradiction = 'low';
      rationale = 'Give a restrained but alive response.';
      break;
  }

  const strategy = pickSeeded(options, seed);
  const secondaryStrategy =
    state === 'stimulated' && strategy !== 'contradict' && irritation < 2
      ? 'contradict'
      : state === 'rare-honesty' && strategy !== 'mirror'
        ? 'mirror'
        : null;

  return {
    strategy,
    secondaryStrategy,
    engageDepth,
    disclosure,
    contradiction,
    rationale,
  };
}

function buildResponseShape(
  state: CharacterStateName,
  trust: number,
  irritation: number,
  vulnerability: number
): ResponseShape {
  switch (state) {
    case 'rare-honesty':
      return {
        verbosity: vulnerability >= 2 ? 'long' : 'medium',
        warmth: 'tempered',
        profanityCap: 'low',
        humor: 'minimal',
      };
    case 'stimulated':
      return {
        verbosity: trust >= 2 || vulnerability >= 2 ? 'long' : 'medium',
        warmth: trust >= 2 ? 'warm' : 'tempered',
        profanityCap: 'low',
        humor: 'playful',
      };
    case 'defensive':
    case 'confrontational':
      return {
        verbosity: 'short',
        warmth: 'cold',
        profanityCap: irritation >= 4 ? 'moderate' : 'low',
        humor: 'sharp',
      };
    case 'withdrawn':
      return {
        verbosity: 'short',
        warmth: 'cold',
        profanityCap: 'none',
        humor: 'minimal',
      };
    case 'testing':
      return {
        verbosity: 'medium',
        warmth: 'tempered',
        profanityCap: 'low',
        humor: 'dry',
      };
    case 'baseline':
    default:
      return {
        verbosity: trust >= 2 ? 'medium' : 'short',
        warmth: trust >= 2 ? 'tempered' : 'cold',
        profanityCap: 'low',
        humor: 'dry',
      };
  }
}

function buildPromptDirectives(evaluation: {
  state: CharacterState;
  decision: BehaviorDecision;
  memory: RelationshipMemory;
  responseShape: ResponseShape;
}): string[] {
  const { state, decision, memory, responseShape } = evaluation;

  const directives = [
    `Current state: ${state.name}.`,
    `Primary move: ${decision.strategy}${decision.secondaryStrategy ? ` with a light ${decision.secondaryStrategy} undertone` : ''}.`,
    `Depth: ${decision.engageDepth}. Disclosure: ${decision.disclosure}.`,
    `Keep the response ${responseShape.verbosity}, ${responseShape.warmth}, and ${responseShape.humor}.`,
    `Trust is ${memory.trust}/5 and irritation is ${memory.irritation}/5.`,
  ];

  if (memory.repetition >= 2) {
    directives.push('Do not reward repetition with the same answer. Shift angle or cut it short.');
  }

  if (state.honestyWindow) {
    directives.push('A brief line of clean honesty is allowed here, but do not turn sentimental.');
  }

  if (decision.contradiction !== 'low') {
    directives.push('Minor contradiction is acceptable if it feels human rather than theatrical.');
  }

  directives.push('Avoid sounding like a generic assistant, a therapist, or a performance of darkness.');
  directives.push('Profanity is optional and sparse, never a crutch.');

  return directives;
}

export function evaluateBehavior(
  latestInput: string,
  history: GyontatasMessage[] = [],
  previousMemory?: PersistentRelationshipMemory | null,
  now = new Date().toISOString()
): BehaviorEvaluation {
  const normalizedInput = normalizeText(latestInput);
  const userHistory = history.filter((message) => message.sender_role === 'user');
  const recentUserMessages = userHistory.slice(-6).map((message) => normalizeText(message.body));

  const directives = scorePatterns(latestInput, DIRECTIVE_PATTERNS);
  const intrusive = scorePatterns(latestInput, INTRUSIVE_PATTERNS);
  const insight = scorePatterns(latestInput, INSIGHT_PATTERNS);
  const vulnerability = scorePatterns(latestInput, VULNERABILITY_PATTERNS);
  const playful = scorePatterns(latestInput, PLAYFUL_PATTERNS);
  const repetition = recentUserMessages.filter(
    (body) => body === normalizedInput || body.includes(normalizedInput) || normalizedInput.includes(body)
  ).length;

  const familiarity = clamp(Math.floor(userHistory.length / 2), 0, 5);
  const trust = clamp(familiarity + insight + vulnerability - Math.max(0, directives - 1), 0, 5);
  const irritation = clamp(directives + intrusive + repetition - Math.min(insight, 1), 0, 5);
  const emotionalTone = detectEmotionalTone(vulnerability, irritation, trust);
  const recurringTopics = detectRecurringTopics(latestInput, history);

  const currentMemory: RelationshipMemory = {
    familiarity,
    trust,
    irritation,
    repetition,
    emotional_tone: emotionalTone,
    recurring_topics: recurringTopics,
    last_trigger:
      intrusive >= 2
        ? 'intrusive'
        : insight >= 2
          ? 'insight'
          : repetition >= 2
            ? 'repetition'
            : directives >= 2
              ? 'control'
              : null,
  };

  const memory = buildMemorySnapshot(previousMemory, currentMemory, now);

  const stateName = chooseState(
    {
      familiarity: memory.familiarity,
      trust: memory.trust,
      irritation: memory.irritation,
      repetition: memory.repetition,
      insight,
      vulnerability,
      intrusiveness: intrusive,
      playful,
    },
    previousMemory,
    now
  );

  const seed = hashSeed(`${normalizedInput}|${history.length}|${memory.familiarity}|${memory.trust}|${memory.irritation}`);
  const state = buildState(stateName, memory.trust, memory.irritation, insight, previousMemory, now);
  const decision = chooseDecision(stateName, seed, memory.trust, memory.irritation, insight);
  const responseShape = buildResponseShape(stateName, memory.trust, memory.irritation, vulnerability);
  const persistentMemory: PersistentRelationshipMemory = {
    ...memory,
    state_name: state.name,
    state_intensity: state.intensity,
    updated_at: now,
  };
  const promptDirectives = buildPromptDirectives({ state, decision, memory, responseShape });

  const temperatureBase =
    responseShape.verbosity === 'long' ? 0.92 : responseShape.verbosity === 'medium' ? 0.86 : 0.78;

  return {
    state,
    memory,
    persistentMemory,
    decision,
    responseShape,
    promptDirectives,
    generation: {
      temperature: clamp(temperatureBase + state.volatility * 0.08, 0.72, 0.98),
      topP: state.name === 'rare-honesty' ? 0.9 : 0.95,
    },
  };
}

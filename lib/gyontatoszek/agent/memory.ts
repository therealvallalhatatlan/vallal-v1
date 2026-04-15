import { extractPersistentMemory } from '../engine';
import type { GyontatasMessage } from '../types';
import type { HiddenTraitName, MemoryEvent, Pattern, TraitScore, UserProfile } from './types';

interface BuildMemoryContextInput {
  conversationId: string;
  conversationMetadata: unknown;
  history: GyontatasMessage[];
  userId?: string;
  userEmail?: string | null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeText(input: string) {
  return input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasNegation(input: string) {
  return /\b(don t|do not|not|never|no longer|can t|cannot|nem|soha|többé|mar nem)\b/i.test(normalizeText(input));
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

function defaultTraitScore(now: string): TraitScore {
  return { value: 0.35, confidence: 0.4, updatedAt: now };
}

function defaultHiddenTraits(now: string): Record<HiddenTraitName, TraitScore> {
  return {
    impulsive: defaultTraitScore(now),
    avoidant: defaultTraitScore(now),
    controlSeeking: defaultTraitScore(now),
    approvalSeeking: defaultTraitScore(now),
    ruminative: defaultTraitScore(now),
    noveltySeeking: defaultTraitScore(now),
  };
}

function coerceTraitScore(value: unknown, fallback: TraitScore): TraitScore {
  const record = asRecord(value);
  if (!record) {
    return fallback;
  }

  return {
    value: typeof record.value === 'number' ? clamp(record.value, 0, 1) : fallback.value,
    confidence: typeof record.confidence === 'number' ? clamp(record.confidence, 0, 1) : fallback.confidence,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : fallback.updatedAt,
  };
}

function coercePattern(value: unknown): Pattern | null {
  const record = asRecord(value);
  if (!record || typeof record.key !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  return {
    key: record.key,
    name: record.name,
    category:
      record.category === 'intent' ||
      record.category === 'emotion' ||
      record.category === 'topic' ||
      record.category === 'risk'
        ? record.category
        : 'topic',
    score: typeof record.score === 'number' ? clamp(record.score, 0, 1) : 0.3,
    confidence: typeof record.confidence === 'number' ? clamp(record.confidence, 0, 1) : 0.4,
    emotionalWeight: typeof record.emotionalWeight === 'number' ? clamp(record.emotionalWeight, 0, 1) : 0.3,
    occurrences: typeof record.occurrences === 'number' ? Math.max(1, Math.round(record.occurrences)) : 1,
    lastSeenAt: typeof record.lastSeenAt === 'string' ? record.lastSeenAt : new Date().toISOString(),
    evidence: Array.isArray(record.evidence) ? record.evidence.filter((item): item is string => typeof item === 'string') : [],
    summary: typeof record.summary === 'string' ? record.summary : record.name,
  };
}

function isLowSignalMessage(input: string) {
  const normalized = normalizeText(input);
  if (!normalized) {
    return true;
  }

  const lowSignalValues = new Set(['ok', 'oke', 'okay', 'k', 'kk', 'hm', 'hmm', 'aha', 'lol', 'yes', 'no']);
  if (lowSignalValues.has(normalized)) {
    return true;
  }

  return normalized.length < 4;
}

function detectTopics(input: string) {
  const normalized = normalizeText(input);
  const topics: string[] = [];

  if (/answer|explain|must|command|rule|mondd|control|irányítás/i.test(normalized)) {
    topics.push('control');
  }
  if (/trust|love|hurt|close|trauma|scared|afraid|félek/i.test(normalized)) {
    topics.push('intimacy');
  }
  if (/who are you|who am i|real|mask|identity|ki vagy/i.test(normalized)) {
    topics.push('identity');
  }
  if (/ashamed|guilt|shame|szégyen|bűn/i.test(normalized)) {
    topics.push('shame');
  }
  if (/joke|laugh|funny|humor|vicces/i.test(normalized)) {
    topics.push('humor');
  }

  return uniqueStrings(topics);
}

function detectContradiction(
  input: string,
  recentHistory: Array<Pick<GyontatasMessage, 'body'>> = []
) {
  const currentTopics = detectTopics(input);
  if (currentTopics.length === 0 || recentHistory.length === 0) {
    return false;
  }

  const currentNegated = hasNegation(input);

  return recentHistory.some((item) => {
    const previous = normalizeText(item.body);
    const previousTopics = detectTopics(previous);
    const sharesTopic = currentTopics.some((topic) => previousTopics.includes(topic));

    if (!sharesTopic) {
      return false;
    }

    const previousNegated = hasNegation(previous);
    const strongClaim = /\b(always|never|must|need|control|nem|soha|mindig|kell)\b/i.test(previous) || /\b(always|never|must|need|control|nem|soha|mindig|kell)\b/i.test(input);

    return currentNegated !== previousNegated && strongClaim;
  });
}

function getStrategyFromAssistantMetadata(message: GyontatasMessage | null | undefined) {
  const metadata = asRecord(message?.metadata);
  const behavior = asRecord(metadata?.behavior);
  const strategyPlan = asRecord(behavior?.strategyPlan);

  if (typeof strategyPlan?.mode === 'string') {
    return strategyPlan.mode;
  }

  if (typeof behavior?.strategy === 'string') {
    return behavior.strategy;
  }

  return null;
}

function extractConsequenceEvent(
  message: Pick<GyontatasMessage, 'id' | 'conversation_id' | 'sender_role' | 'body' | 'created_at'>,
  previousAssistant: GyontatasMessage | null | undefined,
): MemoryEvent | null {
  if (message.sender_role !== 'user') {
    return null;
  }

  const normalized = normalizeText(message.body);
  const previousStrategy = getStrategyFromAssistantMetadata(previousAssistant);

  if (!previousStrategy) {
    return null;
  }

  const openedUp = /ashamed|shame|i feel|i am scared|i m scared|hurt|lonely|truth is|az igazság|szégyen|félek/i.test(normalized);
  const retreated = isLowSignalMessage(normalized) || /whatever|mindegy|hagyjuk|leave it|forget it|jó akkor|ok akkor/i.test(normalized);

  if (['confront', 'challenge_action', 'withhold'].includes(previousStrategy) && openedUp) {
    return {
      id: `${message.id}:pressure-opened-up`,
      conversationId: message.conversation_id,
      kind: 'breakthrough',
      summary: 'After pressure, the user suddenly became more honest.',
      topics: uniqueStrings(detectTopics(normalized).concat('consequence')),
      confidence: 0.84,
      emotionalWeight: 0.76,
      novelty: 0.72,
      salience: 0.81,
      createdAt: message.created_at,
      metadata: {
        signal: 'pressure-opened-up',
        source: 'consequence-memory',
        priorStrategy: previousStrategy,
      },
    };
  }

  if (['confront', 'challenge_action', 'destabilize'].includes(previousStrategy) && retreated) {
    return {
      id: `${message.id}:pressure-retreat`,
      conversationId: message.conversation_id,
      kind: 'rupture',
      summary: 'After pressure, the user pulled back instead of leaning in.',
      topics: ['consequence', 'control'],
      confidence: 0.78,
      emotionalWeight: 0.58,
      novelty: 0.62,
      salience: 0.72,
      createdAt: message.created_at,
      metadata: {
        signal: 'pressure-retreat',
        source: 'consequence-memory',
        priorStrategy: previousStrategy,
      },
    };
  }

  return null;
}

export function extractEvent(
  message: Pick<GyontatasMessage, 'id' | 'conversation_id' | 'sender_role' | 'body' | 'created_at'>,
  recentHistory: Array<Pick<GyontatasMessage, 'body'>> = []
): MemoryEvent | null {
  if (message.sender_role !== 'user') {
    return null;
  }

  const normalized = normalizeText(message.body);
  if (isLowSignalMessage(normalized)) {
    return null;
  }

  const shame = /ashamed|shame|szégyen|guilt|dirty/i.test(normalized);
  const vulnerability = /i feel|i am scared|i m scared|afraid|hurt|lonely|lost|broken|félek|elveszett/i.test(normalized);
  const repair = /sorry|i pushed too hard|i didn t mean|i did not mean|bocs|sajnálom/i.test(normalized);
  const control = /tell me|answer|be honest|exactly|right now|prove|must|válaszolj|mondd el/i.test(normalized);
  const humorShield = /i joke|i laugh|funny|humor|vicces|nevetek/i.test(normalized);
  const identitySearch = /who am i|who are you|why am i|why are you|real self|mask|ki vagy/i.test(normalized);
  const contradiction = detectContradiction(normalized, recentHistory);

  if (!shame && !vulnerability && !repair && !control && !humorShield && !identitySearch && !contradiction && normalized.length < 12) {
    return null;
  }

  const topics = detectTopics(normalized);
  const priorTexts = recentHistory.map((item) => normalizeText(item.body));
  const repeatedRecently = priorTexts.includes(normalized);
  const confidence = round(clamp(0.45 + [shame, vulnerability, repair, control, humorShield, identitySearch].filter(Boolean).length * 0.1, 0, 0.95));
  const emotionalWeight = round(
    clamp(
      0.2 + (shame ? 0.3 : 0) + (vulnerability ? 0.25 : 0) + (repair ? 0.15 : 0) + (control ? 0.12 : 0) + (contradiction ? 0.12 : 0),
      0,
      1
    )
  );
  const novelty = round(repeatedRecently ? 0.25 : topics.length > 1 ? 0.8 : 0.65);
  const salience = round(clamp(confidence * 0.45 + emotionalWeight * 0.4 + novelty * 0.15, 0, 1));

  let kind: MemoryEvent['kind'] = 'message';
  let signal = 'meaningful-turn';
  let summary = 'User revealed a meaningful personal signal.';

  if (contradiction) {
    kind = 'pattern';
    signal = 'self-contradiction';
    summary = 'User reversed or complicated an earlier claim about themselves.';
  } else if (repair) {
    kind = 'repair';
    signal = 'repair-attempt';
    summary = 'User tried to repair tension after pushing too hard.';
  } else if (control) {
    kind = 'rupture';
    signal = 'control-bid';
    summary = 'User tried to regain control through direct pressure.';
  } else if (shame && humorShield) {
    kind = 'breakthrough';
    signal = 'humor-shield';
    summary = 'User used humor to expose shame without saying it plainly.';
  } else if (shame || vulnerability) {
    kind = 'breakthrough';
    signal = 'shame-disclosure';
    summary = 'User disclosed vulnerable material with emotional weight.';
  } else if (identitySearch) {
    kind = 'pattern';
    signal = 'identity-search';
    summary = 'User circled identity questions and hidden motives.';
  }

  return {
    id: message.id,
    userId: undefined,
    conversationId: message.conversation_id,
    kind,
    summary,
    topics,
    confidence,
    emotionalWeight,
    novelty,
    salience,
    createdAt: message.created_at,
    metadata: {
      signal,
      source: 'user-turn',
    },
  };
}

export function updatePatterns(existingPatterns: Pattern[], events: MemoryEvent[], now = new Date().toISOString()): Pattern[] {
  const patternMap = new Map<string, Pattern>();

  for (const pattern of existingPatterns) {
    const elapsedHours = getElapsedHours(pattern.lastSeenAt, now);
    patternMap.set(pattern.key, {
      ...pattern,
      score: round(clamp(decayScore(pattern.score, elapsedHours, 24 * 30), 0, 1)),
      emotionalWeight: round(clamp(decayScore(pattern.emotionalWeight, elapsedHours, 24 * 21), 0, 1)),
    });
  }

  for (const event of events) {
    if (event.salience < 0.35) {
      continue;
    }

    const signal = typeof event.metadata?.signal === 'string' ? event.metadata.signal : 'meaningful-turn';
    const keys = (event.topics.length ? event.topics : ['general']).map((topic) => `${topic}:${signal}`);

    for (const key of uniqueStrings(keys)) {
      const [topic, name] = key.split(':');
      const previous = patternMap.get(key);
      const contribution = clamp(event.confidence * 0.35 + event.emotionalWeight * 0.35 + event.salience * 0.3, 0, 1);

      patternMap.set(key, {
        key,
        name,
        category: topic === 'control' ? 'risk' : topic === 'shame' || topic === 'humor' ? 'emotion' : 'topic',
        score: round(clamp((previous?.score ?? 0) * 0.72 + contribution * 0.44, 0, 1)),
        confidence: round(clamp((previous?.confidence ?? 0.4) * 0.74 + event.confidence * 0.26, 0, 1)),
        emotionalWeight: round(clamp((previous?.emotionalWeight ?? 0.3) * 0.7 + event.emotionalWeight * 0.3, 0, 1)),
        occurrences: (previous?.occurrences ?? 0) + 1,
        lastSeenAt: event.createdAt,
        evidence: uniqueStrings([...(previous?.evidence ?? []), event.summary]).slice(0, 4),
        summary: `Repeated ${name.replace(/-/g, ' ')} tendency around ${topic}.`,
      });
    }
  }

  return Array.from(patternMap.values())
    .sort((left, right) => right.score - left.score || right.occurrences - left.occurrences)
    .slice(0, 12);
}

export function buildMemoryContext(input: BuildMemoryContextInput): {
  persistedMemory: ReturnType<typeof extractPersistentMemory>;
  memoryEvents: MemoryEvent[];
  patternMemory: Pattern[];
  baseProfile: UserProfile;
} {
  const now = new Date().toISOString();
  const persistedMemory = extractPersistentMemory(input.conversationMetadata, input.history);
  const metadataRecord = asRecord(input.conversationMetadata);
  const storedProfile = asRecord(metadataRecord?.userProfile);
  const storedPatterns = Array.isArray(metadataRecord?.patternMemory)
    ? metadataRecord.patternMemory.map((item) => coercePattern(item)).filter((item): item is Pattern => Boolean(item))
    : [];

  const recentUserMessages = input.history.filter((message) => message.sender_role === 'user').slice(-8);
  const directEvents = recentUserMessages
    .map((message, index) => extractEvent(message, recentUserMessages.slice(Math.max(0, index - 3), index)))
    .filter((event): event is MemoryEvent => Boolean(event));

  const consequenceEvents = input.history
    .map((message, index) => {
      if (message.sender_role !== 'user') {
        return null;
      }

      const previousAssistant = [...input.history.slice(0, index)].reverse().find((item) => item.sender_role === 'assistant') ?? null;
      return extractConsequenceEvent(message, previousAssistant);
    })
    .filter((event): event is MemoryEvent => Boolean(event));

  const memoryEvents = [...directEvents, ...consequenceEvents].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );

  const patternMemory = updatePatterns(storedPatterns, memoryEvents, now);
  const hiddenTraits = defaultHiddenTraits(now);

  if (storedProfile?.hiddenTraits && typeof storedProfile.hiddenTraits === 'object') {
    for (const key of Object.keys(hiddenTraits) as HiddenTraitName[]) {
      hiddenTraits[key] = coerceTraitScore((storedProfile.hiddenTraits as Record<string, unknown>)[key], hiddenTraits[key]);
    }
  }

  const recurringTopics = uniqueStrings([
    ...(persistedMemory?.recurring_topics ?? []),
    ...(Array.isArray(storedProfile?.recurringTopics)
      ? storedProfile.recurringTopics.filter((item): item is string => typeof item === 'string')
      : []),
    ...memoryEvents.flatMap((event) => event.topics),
  ]).slice(0, 8);

  const baseProfile: UserProfile = {
    id: input.userId ?? 'anonymous',
    email: input.userEmail ?? null,
    familiarity:
      typeof storedProfile?.familiarity === 'number' ? storedProfile.familiarity : persistedMemory?.familiarity ?? 0,
    trust: typeof storedProfile?.trust === 'number' ? storedProfile.trust : persistedMemory?.trust ?? 0,
    irritation:
      typeof storedProfile?.irritation === 'number' ? storedProfile.irritation : persistedMemory?.irritation ?? 0,
    openness:
      typeof storedProfile?.openness === 'number'
        ? storedProfile.openness
        : Math.max(0, Math.min(5, (persistedMemory?.trust ?? 0) - (persistedMemory?.irritation ?? 0) + 2)),
    recurringTopics,
    relationalStance:
      storedProfile?.relationalStance === 'wary' ||
      storedProfile?.relationalStance === 'guarded' ||
      storedProfile?.relationalStance === 'engaged' ||
      storedProfile?.relationalStance === 'open' ||
      storedProfile?.relationalStance === 'volatile'
        ? storedProfile.relationalStance
        : 'wary',
    hiddenTraits,
    patternMemory,
    lastInteractionAt:
      (typeof storedProfile?.lastInteractionAt === 'string' ? storedProfile.lastInteractionAt : null) ??
      persistedMemory?.updated_at ??
      input.history.at(-1)?.created_at ??
      null,
  };

  return {
    persistedMemory,
    memoryEvents,
    patternMemory,
    baseProfile,
  };
}

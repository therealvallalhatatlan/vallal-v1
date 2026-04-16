import { readFileSync } from 'fs';
import { join } from 'path';
import type { BehavioralExemplar, StrategyMode } from './types';

// Raw shape on disk — legacy `user_question` field + optional label fields
interface RawExemplarRecord {
  id?: string;
  user?: string;
  user_question?: string;
  intent?: string;
  emotion?: string;
  expected_strategy?: string;
  v_response?: string;
  type?: string;
  timestamp?: string;
}

/**
 * Heuristic strategy inference for records that lack an explicit expected_strategy.
 * Based on signal words found in V.'s response text.
 */
function inferStrategy(response: string): string {
  const lower = response.toLowerCase();
  if (/nem válaszol|skip|más kérdés|parancsol/i.test(lower)) return 'withhold';
  if (/nyafog|hülye|ne is haragudj|ez már/i.test(lower)) return 'confront';
  if (/haha|vicc|érdekes|váratlan/i.test(lower)) return 'destabilize';
  if (/dönt|lép|most\.|csináld|cselekedj/i.test(lower)) return 'challenge_action';
  if (/igen.*de |de.*azért|persze.*viszont/i.test(lower)) return 'validate_then_twist';
  return 'mirror';
}

function normalizeRecord(raw: RawExemplarRecord, index: number): BehavioralExemplar | null {
  const user = raw.user ?? raw.user_question ?? '';
  const v_response = raw.v_response ?? '';
  if (!user || !v_response) return null;
  return {
    id: raw.id ?? `auto-${index}`,
    user,
    intent: raw.intent ?? 'unknown',
    emotion: raw.emotion ?? 'neutral',
    expected_strategy: raw.expected_strategy ?? inferStrategy(v_response),
    v_response,
  };
}

let cached: BehavioralExemplar[] | null = null;

function loadExemplars(): BehavioralExemplar[] {
  if (cached) return cached;
  try {
    const filePath = join(process.cwd(), 'data', 'gyontatoszek', 'knowledge.jsonl');
    const raw = readFileSync(filePath, 'utf-8').trim();

    // Support both JSON array and JSONL (one object per line)
    let records: RawExemplarRecord[];
    if (raw.startsWith('[')) {
      records = JSON.parse(raw) as RawExemplarRecord[];
    } else {
      records = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as RawExemplarRecord);
    }

    cached = records
      .map((r, i) => normalizeRecord(r, i))
      .filter((r): r is BehavioralExemplar => r !== null);
  } catch {
    cached = [];
  }
  return cached;
}

// Creator-referencing signal in v_response — used to prioritize self_reference exemplars
const CREATOR_SIGNAL_RE = /vállalhatatlan|gép vagyok|robot vagyok|mintázatokat látok|drogoz|v\. fejéből|csak egy gép/i;

// Maps agent intent/emotion tokens to broader match categories used in the knowledge base
const INTENT_ALIASES: Record<string, string[]> = {
  confession: ['emotional', 'vulnerability', 'testing'],
  question: ['philosophical', 'validation', 'testing'],
  challenge: ['challenge', 'probing'],
  connection: ['vulnerability', 'emotional'],
  self_reference: ['identity', 'philosophical'],
  unknown: [],
};

const EMOTION_ALIASES: Record<string, string[]> = {
  neutral: ['neutral'],
  vulnerable: ['tired', 'confused', 'insecure'],
  guarded: ['neutral', 'insecure'],
  tense: ['insecure', 'confused'],
  playful: ['neutral'],
};

function scoreExemplar(
  exemplar: BehavioralExemplar,
  intent: string,
  emotion: string,
): number {
  let score = 0;
  const intentMatches = INTENT_ALIASES[intent] ?? [intent];
  if (intentMatches.includes(exemplar.intent)) score += 1;
  const emotionMatches = EMOTION_ALIASES[emotion] ?? [emotion];
  if (emotionMatches.includes(exemplar.emotion)) score += 1;
  return score;
}

/**
 * Condenses a raw v_response into a terse register descriptor for prompt injection.
 * Goal: give the LLM a behavioral anchor (register, move, pacing) without leaking
 * the verbatim text it might copy.
 */
function deriveRegisterDescriptor(exemplar: BehavioralExemplar): string {
  const parts: string[] = [];

  // Strategy → relational move
  const moveMap: Record<string, string> = {
    mirror: 'mirror + self-disclosure',
    confront: 'direct reframe, no softening',
    destabilize: 'short cut, leaves question open',
    withhold: 'minimal acknowledgement, return question',
    validate_then_twist: 'partial validation then pivot',
    challenge_action: 'push toward concrete step',
  };
  parts.push(moveMap[exemplar.expected_strategy] ?? exemplar.expected_strategy);

  // Emotion cue
  if (exemplar.emotion !== 'neutral') parts.push(`${exemplar.emotion} signal`);

  // Length signal (rough)
  const wordCount = exemplar.v_response.split(/\s+/).length;
  if (wordCount <= 6) parts.push('very compressed');
  else if (wordCount <= 14) parts.push('compact');
  else parts.push('medium length');

  // Presence of explicit self-disclosure (first person)
  if (/\bén\b|éreztem|tudod hányszor|ismer/i.test(exemplar.v_response)) {
    parts.push('first-person anchor');
  }

  // Ends with question
  if (exemplar.v_response.trimEnd().endsWith('?')) {
    parts.push('closes with question');
  }

  return parts.join(', ');
}

export function selectExemplars(
  strategy: StrategyMode,
  intent: string,
  emotion: string,
): BehavioralExemplar[] {
  const all = loadExemplars();
  if (all.length === 0) return [];

  // Special path: self_reference queries → prioritize creator-referencing exemplars
  if (intent === 'self_reference') {
    const creatorExemplars = all.filter((e) => CREATOR_SIGNAL_RE.test(e.v_response));
    const pool = creatorExemplars.length >= 2 ? creatorExemplars : all;
    return pool
      .map((e) => ({ exemplar: e, score: scoreExemplar(e, intent, emotion) + (CREATOR_SIGNAL_RE.test(e.v_response) ? 2 : 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.exemplar);
  }

  // Primary filter: exact strategy match; fall back to full corpus
  const pool = all.filter((e) => e.expected_strategy === strategy);
  const candidates = pool.length > 0 ? pool : all;

  // Score by intent + emotion proximity, take top 3 strategy-matched
  const scored = candidates
    .map((e) => ({ exemplar: e, score: scoreExemplar(e, intent, emotion) }))
    .sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 3).map((s) => s.exemplar);

  // Add one random "voice anchor" from the full corpus — ensures V.'s base register is always present
  // Pick deterministically by index so it's stable within a session
  const anchorIndex = (strategy.charCodeAt(0) + intent.charCodeAt(0)) % all.length;
  const anchor = all[anchorIndex];
  if (anchor && !selected.some((e) => e.id === anchor.id)) {
    selected.push(anchor);
  }

  return selected;
}

export type { BehavioralExemplar };
export { deriveRegisterDescriptor };

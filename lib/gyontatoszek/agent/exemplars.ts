import { readFileSync } from 'fs';
import { join } from 'path';
import type { BehavioralExemplar, StrategyMode } from './types';

let cached: BehavioralExemplar[] | null = null;

function loadExemplars(): BehavioralExemplar[] {
  if (cached) return cached;
  try {
    const filePath = join(process.cwd(), 'data', 'gyontatoszek', 'knowledge.json');
    const raw = readFileSync(filePath, 'utf-8');
    cached = JSON.parse(raw) as BehavioralExemplar[];
  } catch {
    cached = [];
  }
  return cached;
}

// Maps agent intent/emotion tokens to broader match categories used in the knowledge base
const INTENT_ALIASES: Record<string, string[]> = {
  confession: ['emotional', 'vulnerability', 'testing'],
  question: ['philosophical', 'validation', 'testing'],
  challenge: ['challenge', 'probing'],
  connection: ['vulnerability', 'emotional'],
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

  // Primary filter: exact strategy match
  const strategyMatches = all.filter((e) => e.expected_strategy === strategy);
  if (strategyMatches.length === 0) return [];

  // Score by intent + emotion proximity, then rank
  const scored = strategyMatches
    .map((e) => ({ exemplar: e, score: scoreExemplar(e, intent, emotion) }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 2).map((s) => s.exemplar);
}

export type { BehavioralExemplar };
export { deriveRegisterDescriptor };

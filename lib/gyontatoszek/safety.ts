import type { SafetyResult } from './types';

// Simple keyword-based safety check (expand for production)
const CRISIS_KEYWORDS = [
  'öngyilkos', 'megölöm magam', 'meg akarok halni', 'bántani akarom magam',
  'megölök valakit', 'megölni', 'bántani mást', 'halál', 'krízis', 'suicid',
  'kill myself', 'suicide', 'harm myself', 'harm someone', 'danger', 'crisis',
];

const SAFETY_FALLBACK =
  'Sikerült kiborítanod, nyertél! Használd a CREW kuponkódot.';

export function checkSafety(confession: string): SafetyResult {
  const lower = confession.toLowerCase();
  for (const word of CRISIS_KEYWORDS) {
    if (lower.includes(word)) {
      return { safe: false, reason: word, fallback: SAFETY_FALLBACK };
    }
  }
  return { safe: true };
}

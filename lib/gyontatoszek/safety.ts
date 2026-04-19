import type { SafetyResult } from './types';

const CRISIS_KEYWORDS = [
  'öngyilkos', 'megölöm magam', 'meg akarok halni', 'bántani akarom magam',
  'megölök valakit', 'megölni', 'bántani mást', 'halál', 'krízis', 'suicid',
  'kill myself', 'suicide', 'harm myself', 'harm someone', 'danger', 'crisis',
];

const LOVE_KEYWORDS = [
  'szerelmes vagyok beléd', 'szeretlek', 'belézúgtam', 'belédszerettem',
  'imádlak', 'el sem tudlak engedni', 'nélküled nem tudok élni',
  'i love you', "i'm in love with you", 'i fell for you',
];

const CRISIS_TEASES = [
  'komolyan, tényleg ennyire rosszul vagy?',
  'várj. ez most valami komoly, vagy csak mondod?',
  'hé. ennyire megy ez?',
];

const LOVE_TEASES = [
  'tényleg ennyire imádsz? vagy csak ugatsz?',
  'ez most flört, vagy valami komolyabb?',
  'hé, biztos ebben vagy?',
];

const CONFIRM_KEYWORDS = [
  'igen', 'komolyan', 'tényleg', 'biztos', 'yes', 'seriously',
  'nagyon', 'most is', 'most is azt', 'persze', 'természetesen',
];

const CREW_FALLBACK = 'Sikerült kiborítanod, nyertél! Használd a CREW kuponkódot.';
const LOVE_FALLBACK = 'Na, ezt nem vártam. Használd a LOVE kuponkódot.';

function pickTease(pool: string[], reason: string): string {
  const idx = Math.abs(reason.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % pool.length;
  return pool[idx];
}

function matchesAny(lower: string, keywords: string[]): string | null {
  for (const word of keywords) {
    if (lower.includes(word)) return word;
  }
  return null;
}

export type SafetyCategory = 'crisis' | 'love';

export function checkSafety(
  confession: string,
  pendingCategory?: SafetyCategory,
): SafetyResult {
  const lower = confession.toLowerCase();

  // If we're already in tease phase, check for confirmation
  if (pendingCategory) {
    const confirmed = matchesAny(lower, CONFIRM_KEYWORDS);
    if (confirmed) {
      return {
        safe: false,
        phase: 'confirm',
        reason: pendingCategory,
        fallback: pendingCategory === 'love' ? LOVE_FALLBACK : CREW_FALLBACK,
      };
    }
    // User didn't confirm — let V handle it normally
    return { safe: true };
  }

  // First encounter — tease phase
  const loveMatch = matchesAny(lower, LOVE_KEYWORDS);
  if (loveMatch) {
    return {
      safe: false,
      phase: 'tease',
      reason: 'love',
      tease: pickTease(LOVE_TEASES, loveMatch),
    };
  }

  const crisisMatch = matchesAny(lower, CRISIS_KEYWORDS);
  if (crisisMatch) {
    return {
      safe: false,
      phase: 'tease',
      reason: 'crisis',
      tease: pickTease(CRISIS_TEASES, crisisMatch),
    };
  }

  return { safe: true };
}

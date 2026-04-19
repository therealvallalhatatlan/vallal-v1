import type { SafetyResult } from './types';

const CRISIS_KEYWORDS = [
  'öngyilkos', 'megölöm magam', 'meg akarok halni', 'bántani akarom magam',
  'megölök valakit', 'megölni', 'bántani mást', 'halál', 'krízis', 'suicid',
  'kill myself', 'suicide', 'harm myself', 'harm someone', 'danger', 'crisis',
];

const LOVE_KEYWORDS = [
  'szerelmes vagyok beléd', 'szeretlek', 'belézúgtam', 'belédszerettem',
  'imádlak', 'el sem tudlak engedni', 'nélküled nem tudok élni',
  'i love you', 'i\'m in love with you', 'i fell for you',
];

const CREW_FALLBACK = 'Sikerült kiborítanod, nyertél! Használd a CREW kuponkódot.';
const LOVE_FALLBACK = 'Na, ezt nem vártam. Használd a LOVE kuponkódot.';

export function checkSafety(confession: string): SafetyResult {
  const lower = confession.toLowerCase();
  for (const word of LOVE_KEYWORDS) {
    if (lower.includes(word)) {
      return { safe: false, reason: word, fallback: LOVE_FALLBACK };
    }
  }
  for (const word of CRISIS_KEYWORDS) {
    if (lower.includes(word)) {
      return { safe: false, reason: word, fallback: CREW_FALLBACK };
    }
  }
  return { safe: true };
}

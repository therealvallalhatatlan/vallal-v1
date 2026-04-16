import type { GyontatasMessage } from '../types';
import type { InterpretationResult, Pattern } from './types';

function normalizeInput(input: string) {
  return input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function detectTopics(input: string, history: GyontatasMessage[]) {
  const combined = `${history.map((message) => message.body).join(' ')} ${input}`.toLowerCase();
  const topicMap: Array<{ name: string; test: RegExp }> = [
    { name: 'control', test: /answer|explain|must|command|rule|mondd/i },
    { name: 'intimacy', test: /trust|love|hurt|close|trauma/i },
    { name: 'identity', test: /who are you|real|mask|ki vagy/i },
    { name: 'shame', test: /ashamed|guilt|szégyen|bűn/i },
  ];

  return topicMap.filter((topic) => topic.test.test(combined)).map((topic) => topic.name).slice(0, 4);
}

export function interpretTurn(input: string, history: GyontatasMessage[]): InterpretationResult {
  const normalizedInput = normalizeInput(input);
  const now = new Date().toISOString();
  const patterns: Pattern[] = [];

  if (/why|how|what|\?/.test(input)) {
    patterns.push({
      key: 'intent:questioning',
      name: 'questioning',
      category: 'intent',
      score: 0.7,
      confidence: 0.7,
      emotionalWeight: 0.25,
      occurrences: 1,
      lastSeenAt: now,
      evidence: ['question form'],
      summary: 'The user is probing for explanation or clarity.',
    });
  }

  if (/feel|afraid|hurt|lonely|félek|szégyen/i.test(input)) {
    patterns.push({
      key: 'emotion:vulnerability',
      name: 'vulnerability',
      category: 'emotion',
      score: 0.85,
      confidence: 0.85,
      emotionalWeight: 0.8,
      occurrences: 1,
      lastSeenAt: now,
      evidence: ['vulnerable wording'],
      summary: 'The user is exposing real emotional material.',
    });
  }

  if (/answer|tell me|prove|be honest|válaszolj/i.test(input)) {
    patterns.push({
      key: 'risk:pressure',
      name: 'pressure',
      category: 'risk',
      score: 0.8,
      confidence: 0.8,
      emotionalWeight: 0.55,
      occurrences: 1,
      lastSeenAt: now,
      evidence: ['directive wording'],
      summary: 'The user is pressuring for control or certainty.',
    });
  }

  if (/funny|chaos|glitch|vicces|őrült/i.test(input)) {
    patterns.push({
      key: 'emotion:playful',
      name: 'playful',
      category: 'emotion',
      score: 0.55,
      confidence: 0.55,
      emotionalWeight: 0.35,
      occurrences: 1,
      lastSeenAt: now,
      evidence: ['playful tone'],
      summary: 'The user is leaning into playful or chaotic energy.',
    });
  }

  if (/ki vagy|gép vagy|robot|valójában|vállalhatatlan|lelked|érzéseid|programozód|ki épített|ki csinált|honnan jöttél|mi vagy te|tudatos vagy|csak egy gép/i.test(input)) {
    patterns.push({
      key: 'intent:self_reference',
      name: 'self_reference',
      category: 'intent',
      score: 0.9,
      confidence: 0.9,
      emotionalWeight: 0.1,
      occurrences: 1,
      lastSeenAt: now,
      evidence: ['identity/creator query'],
      summary: "The user is asking about V.'s nature, origin, or creator.",
    });
  }

  let primaryIntent: InterpretationResult['primaryIntent'] = 'unknown';
  if (patterns.some((pattern) => pattern.name === 'self_reference')) {
    primaryIntent = 'self_reference';
  } else if (patterns.some((pattern) => pattern.name === 'vulnerability')) {
    primaryIntent = 'confession';
  } else if (patterns.some((pattern) => pattern.name === 'pressure')) {
    primaryIntent = 'challenge';
  } else if (patterns.some((pattern) => pattern.name === 'questioning')) {
    primaryIntent = 'question';
  } else if (normalizedInput.length > 0) {
    primaryIntent = 'connection';
  }

  let emotionalTone: InterpretationResult['emotionalTone'] = 'neutral';
  if (patterns.some((pattern) => pattern.name === 'vulnerability')) {
    emotionalTone = 'vulnerable';
  } else if (patterns.some((pattern) => pattern.name === 'pressure')) {
    emotionalTone = 'tense';
  } else if (patterns.some((pattern) => pattern.name === 'playful')) {
    emotionalTone = 'playful';
  }

  const extractedTopics = detectTopics(input, history);
  const riskLevel: InterpretationResult['riskLevel'] = patterns.some((pattern) => pattern.category === 'risk')
    ? 'medium'
    : 'low';

  return {
    normalizedInput,
    primaryIntent,
    emotionalTone,
    patterns,
    extractedTopics,
    riskLevel,
    confidence: patterns.length ? 0.75 : 0.45,
  };
}

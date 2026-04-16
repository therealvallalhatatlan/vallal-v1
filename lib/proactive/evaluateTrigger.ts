import type {
  ProactiveCooldownStatus,
  ProactiveEvaluationInput,
  ProactiveEvaluationResult,
  ProactiveTriggerDecision,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function toTimestamp(value?: string | Date | null) {
  if (!value) return null;
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCooldownStatus(nowTs: number, recentLog: ProactiveEvaluationInput['recentProactiveLog']): ProactiveCooldownStatus {
  const entries = recentLog ?? [];
  const last24hCount = entries.filter((entry) => {
    const sentAt = toTimestamp(entry.sentAt);
    return sentAt !== null && nowTs - sentAt < DAY_MS;
  }).length;
  const last7dCount = entries.filter((entry) => {
    const sentAt = toTimestamp(entry.sentAt);
    return sentAt !== null && nowTs - sentAt < WEEK_MS;
  }).length;

  return {
    blocked: last24hCount >= 1 || last7dCount >= 3,
    last24hCount,
    last7dCount,
  };
}

function computeRepetitionRatio(messages: string[]) {
  const normalized = messages.map(normalizeText).filter(Boolean);
  if (normalized.length < 2) return 0;

  const uniqueCount = new Set(normalized).size;
  return clamp(1 - uniqueCount / normalized.length);
}

function hasAvoidanceLanguage(messages: string[]) {
  const joined = messages.map(normalizeText).join(' ');
  return /(kerul|elkerul|elfordul|majd|kesobb|nem most|halogat|visszavonul)/iu.test(joined);
}

function pushCandidate(
  candidates: ProactiveTriggerDecision[],
  type: ProactiveTriggerDecision['type'],
  reason: string,
  score: number,
  hoursSinceLastUserMessage: number,
) {
  if (score < 0.6) return;
  candidates.push({ type, reason, score: clamp(score), hoursSinceLastUserMessage });
}

export function evaluateProactiveTrigger(input: ProactiveEvaluationInput): ProactiveEvaluationResult {
  const nowTs = toTimestamp(input.now) ?? Date.now();
  const cooldown = getCooldownStatus(nowTs, input.recentProactiveLog);

  if (cooldown.blocked) {
    return {
      eligible: false,
      reason: 'cooldown active',
      trigger: null,
      cooldown,
    };
  }

  const lastUserTs = toTimestamp(input.lastUserMessageAt ?? input.lastMessageAt);
  if (lastUserTs === null || input.recentUserMessages.length === 0) {
    return {
      eligible: false,
      reason: 'no prior interaction',
      trigger: null,
      cooldown,
    };
  }

  const memory = input.relationshipMemory;
  const hoursSinceLastUserMessage = Math.max(0, (nowTs - lastUserTs) / (60 * 60 * 1000));
  const repetitionRatio = computeRepetitionRatio(input.recentUserMessages);
  const trust = memory?.trust ?? 0;
  const irritation = memory?.irritation ?? 0;
  const stateIntensity = memory?.state_intensity ?? 0;

  const candidates: ProactiveTriggerDecision[] = [];

  if (hoursSinceLastUserMessage >= 36) {
    const score = 0.62 + Math.min(hoursSinceLastUserMessage / 120, 0.28) + trust * 0.015 - irritation * 0.025;
    pushCandidate(
      candidates,
      'inactivity',
      'the user went quiet after a meaningful exchange',
      score,
      hoursSinceLastUserMessage,
    );
  }

  if (hoursSinceLastUserMessage >= 12 && ((memory?.repetition ?? 0) >= 4 || repetitionRatio >= 0.34)) {
    const score = 0.72 + repetitionRatio * 0.25 + Math.min((memory?.repetition ?? 0) * 0.03, 0.12);
    pushCandidate(
      candidates,
      'repetition',
      'the user is looping the same pattern without moving it forward',
      score,
      hoursSinceLastUserMessage,
    );
  }

  if (hoursSinceLastUserMessage >= 18 && hasAvoidanceLanguage(input.recentUserMessages)) {
    const score = 0.67 + (memory?.emotional_tone === 'guarded' ? 0.08 : 0) + (memory?.trust ?? 0) * 0.01;
    pushCandidate(
      candidates,
      'avoidance',
      'the user stepped away from the central point and left it unresolved',
      score,
      hoursSinceLastUserMessage,
    );
  }

  if (hoursSinceLastUserMessage >= 10 / 60 && stateIntensity >= 0.8) {
    const score = 0.66 + Math.min(stateIntensity * 0.18, 0.18);
    pushCandidate(
      candidates,
      'emotional_spike',
      'the last exchange carried unusually high emotional charge',
      score,
      hoursSinceLastUserMessage,
    );
  }

  if (hoursSinceLastUserMessage >= 10 / 60 && input.pendingAction) {
    const score = 0.65 + Math.min(trust * 0.02, 0.12);
    pushCandidate(
      candidates,
      'action_followup',
      'the user left with an unfinished action hanging in the air',
      score,
      hoursSinceLastUserMessage,
    );
  }

  if (candidates.length === 0) {
    return {
      eligible: false,
      reason: 'no proactive trigger strong enough',
      trigger: null,
      cooldown,
    };
  }

  candidates.sort((left, right) => right.score - left.score || right.hoursSinceLastUserMessage - left.hoursSinceLastUserMessage);

  return {
    eligible: true,
    reason: candidates[0].reason,
    trigger: candidates[0],
    cooldown,
  };
}

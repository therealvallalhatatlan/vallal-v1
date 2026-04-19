import type { HiddenTraitName, InterpretationResult, MemoryEvent, Pattern, TraitScore, UserProfile } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function updateTrait(previous: TraitScore | undefined, target: number, confidence: number, now: string): TraitScore {
  const current = previous ?? { value: 0.35, confidence: 0.4, updatedAt: now };

  return {
    value: round(clamp(current.value * 0.78 + target * 0.22, 0, 1)),
    confidence: round(clamp(current.confidence * 0.8 + confidence * 0.2, 0, 1)),
    updatedAt: now,
  };
}

function sumPatternScore(patterns: Pattern[], needle: string) {
  return patterns
    .filter((pattern) => pattern.key.includes(needle) || pattern.name.includes(needle))
    .reduce((total, pattern) => total + pattern.score, 0);
}

function countEvents(events: MemoryEvent[], kind: MemoryEvent['kind']) {
  return events.filter((event) => event.kind === kind).length;
}

function determineRelationalStance(profile: UserProfile): UserProfile['relationalStance'] {
  if (profile.irritation >= 3.2) {
    return 'volatile';
  }

  if (profile.hiddenTraits.controlSeeking.value >= 0.38 || profile.irritation >= 1.2) {
    return 'guarded';
  }

  if (profile.trust >= 3 && profile.openness >= 3) {
    return 'open';
  }

  if (profile.trust >= 2) {
    return 'engaged';
  }

  return 'wary';
}

export function updateProfile(
  baseProfile: UserProfile,
  interpretation: InterpretationResult,
  events: MemoryEvent[] = [],
  patterns: Pattern[] = [],
  now = new Date().toISOString()
): UserProfile {
  const ruptureCount = countEvents(events, 'rupture');
  const repairCount = countEvents(events, 'repair');
  const breakthroughCount = countEvents(events, 'breakthrough');
  const controlPattern = sumPatternScore(patterns, 'control');
  const shamePattern = sumPatternScore(patterns, 'shame');
  const humorPattern = sumPatternScore(patterns, 'humor');
  const identityPattern = sumPatternScore(patterns, 'identity');

  const hiddenTraits: Record<HiddenTraitName, TraitScore> = {
    impulsive: updateTrait(
      baseProfile.hiddenTraits.impulsive,
      clamp(0.25 + ruptureCount * 0.18 + (interpretation.riskLevel === 'medium' ? 0.12 : 0), 0, 1),
      0.65,
      now
    ),
    avoidant: updateTrait(
      baseProfile.hiddenTraits.avoidant,
      clamp(0.3 + identityPattern * 0.2 + ruptureCount * 0.08 - breakthroughCount * 0.04, 0, 1),
      0.6,
      now
    ),
    controlSeeking: updateTrait(
      baseProfile.hiddenTraits.controlSeeking,
      clamp(0.2 + controlPattern * 0.55 + (interpretation.riskLevel === 'medium' ? 0.12 : 0), 0, 1),
      0.8,
      now
    ),
    approvalSeeking: updateTrait(
      baseProfile.hiddenTraits.approvalSeeking,
      clamp(0.25 + repairCount * 0.16 + (interpretation.emotionalTone === 'vulnerable' ? 0.1 : 0), 0, 1),
      0.62,
      now
    ),
    ruminative: updateTrait(
      baseProfile.hiddenTraits.ruminative,
      clamp(0.28 + shamePattern * 0.3 + identityPattern * 0.18, 0, 1),
      0.72,
      now
    ),
    noveltySeeking: updateTrait(
      baseProfile.hiddenTraits.noveltySeeking,
      clamp(0.22 + humorPattern * 0.24 + (interpretation.emotionalTone === 'playful' ? 0.12 : 0), 0, 1),
      0.58,
      now
    ),
  };

  const trust = round(
    clamp(
      baseProfile.trust + (interpretation.emotionalTone === 'vulnerable' ? 0.45 : 0) + breakthroughCount * 0.15 + repairCount * 0.12,
      0,
      5
    )
  );
  const irritation = round(
    clamp(
      baseProfile.irritation + (interpretation.riskLevel === 'medium' ? 0.35 : 0) + ruptureCount * 0.18 - repairCount * 0.12,
      0,
      5
    )
  );
  const openness = round(
    clamp(
      baseProfile.openness + (interpretation.primaryIntent === 'connection' ? 0.25 : 0) + (interpretation.emotionalTone === 'vulnerable' ? 0.2 : 0) - ruptureCount * 0.1,
      0,
      5
    )
  );
  const familiarity = round(clamp(baseProfile.familiarity + 0.2 + Math.min(events.length, 3) * 0.05, 0, 5));

  const profile: UserProfile = {
    ...baseProfile,
    familiarity,
    trust,
    irritation,
    openness,
    recurringTopics: Array.from(new Set([...baseProfile.recurringTopics, ...interpretation.extractedTopics])).slice(0, 8),
    hiddenTraits,
    patternMemory: patterns,
    lastInteractionAt: now,
    relationalStance: baseProfile.relationalStance,
  };

  profile.relationalStance = determineRelationalStance(profile);
  return profile;
}

export function buildUserProfile(baseProfile: UserProfile, interpretation: InterpretationResult): UserProfile {
  return updateProfile(baseProfile, interpretation, [], baseProfile.patternMemory ?? []);
}

export function computeDepthTier(familiarity: number, trust: number): 0 | 1 | 2 | 3 | 4 {
  if (familiarity >= 4 && trust >= 3) return 4;
  if (familiarity >= 3 && trust >= 2) return 3;
  if (familiarity >= 2 && trust >= 1) return 2;
  if (familiarity >= 1) return 1;
  return 0;
}

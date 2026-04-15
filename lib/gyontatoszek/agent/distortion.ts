import type { DistortionHook, DistortionState, AgentTurnContext, MemoryEvent } from './types';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function seededUnit(seed: string) {
  return (hashSeed(seed) % 1000) / 1000;
}

function pickCue(type: DistortionHook['type'], topic: string, event: MemoryEvent): string {
  switch (type) {
    case 'unexpected_recall':
      return topic === 'shame'
        ? 'That earlier bruise is still in the room.'
        : `This is not the first time ${topic} has come back wearing a new coat.`;
    case 'delayed_callback':
      return `Something you said earlier is still echoing: ${event.summary}`;
    case 'pattern_slip':
    default:
      return `You keep finding the same edge through ${topic || 'another angle'}.`;
  }
}

function shouldQueueEvent(event: MemoryEvent) {
  return event.salience >= 0.62 && event.emotionalWeight >= 0.55;
}

export function updateDistortionState(
  existing: DistortionState | null | undefined,
  events: MemoryEvent[],
  input: string,
  now = new Date().toISOString()
): DistortionState {
  const current: DistortionState = existing ?? {
    pendingHooks: [],
    cooldownUntilTurn: 0,
    turnCount: 0,
  };

  const nextTurnCount = current.turnCount + 1;
  const pendingHooks = [...current.pendingHooks]
    .filter((hook) => !hook.triggered)
    .map((hook) => ({ ...hook, turnsUntilEligible: Math.max(0, hook.turnsUntilEligible - 1) }));

  for (const event of events) {
    if (!shouldQueueEvent(event)) {
      continue;
    }

    const topic = event.topics[0] ?? 'memory';
    const type: DistortionHook['type'] =
      topic === 'shame' || topic === 'intimacy'
        ? 'delayed_callback'
        : topic === 'control'
          ? 'pattern_slip'
          : 'unexpected_recall';

    pendingHooks.push({
      id: `${event.id}:hook`,
      type,
      topic,
      cue: pickCue(type, topic, event),
      sourceEventId: event.id,
      strength: clamp(event.salience * 0.85 + event.emotionalWeight * 0.15, 0, 1),
      turnsUntilEligible: 2,
      createdAt: now,
      triggered: false,
    });
  }

  return {
    pendingHooks: pendingHooks.slice(-8),
    cooldownUntilTurn: current.cooldownUntilTurn,
    turnCount: nextTurnCount,
    lastCue: current.lastCue,
  };
}

export function selectDistortionHook(context: {
  input: string;
  memoryEvents: MemoryEvent[];
  distortionState: DistortionState;
  strategyMode: AgentTurnContext['strategy']['mode'];
  modulation?: AgentTurnContext['modulation'];
}): { activeHook: DistortionHook | null; nextState: DistortionState } {
  const state = context.distortionState;
  const normalizedInput = context.input.toLowerCase();

  if (state.turnCount < state.cooldownUntilTurn) {
    return { activeHook: null, nextState: state };
  }

  const eligible = state.pendingHooks.filter((hook) => !hook.triggered && hook.turnsUntilEligible <= 0);
  if (eligible.length === 0) {
    return { activeHook: null, nextState: state };
  }

  const topical = eligible.find((hook) => normalizedInput.includes(hook.topic));
  const candidate = topical ?? eligible.sort((left, right) => right.strength - left.strength)[0];

  const subtleChance = seededUnit(`${context.input}|${candidate.id}|${state.turnCount}`);
  const thc = context.modulation?.thc ?? 0;
  const alcohol = context.modulation?.alcohol ?? 0;
  const amphetamine = context.modulation?.amphetamine ?? 0;
  const allowStrategy = thc >= 0.72 || ['mirror', 'destabilize', 'validate_then_twist', 'withhold'].includes(context.strategyMode);
  const distortionThreshold = thc >= 0.72
    ? clamp(0.58 - thc * 0.48, 0.05, 0.75)
    : clamp(0.58 - thc * 0.2 - alcohol * 0.05 + amphetamine * 0.03, 0.18, 0.75);

  if (!allowStrategy || subtleChance < distortionThreshold) {
    return { activeHook: null, nextState: state };
  }

  const nextState: DistortionState = {
    pendingHooks: state.pendingHooks.map((hook) =>
      hook.id === candidate.id ? { ...hook, triggered: true } : hook
    ),
    cooldownUntilTurn: state.turnCount + 2,
    turnCount: state.turnCount,
    lastCue: candidate.cue,
  };

  return {
    activeHook: candidate,
    nextState,
  };
}

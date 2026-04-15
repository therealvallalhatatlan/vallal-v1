import type { AgentAction, AgentTurnContext } from './types';

export function detectAction(context: Pick<AgentTurnContext, 'strategy' | 'interpretation' | 'profile' | 'patternMemory'>): AgentAction | null {
  const controlPattern = context.patternMemory.find((pattern) => pattern.key.includes('control'))?.score ?? 0;
  const identityPattern = context.patternMemory.find((pattern) => pattern.key.includes('identity'))?.score ?? 0;

  const shouldChallenge =
    context.strategy.mode === 'challenge_action' ||
    (context.strategy.mode === 'confront' && (controlPattern > 0.6 || context.profile.hiddenTraits.controlSeeking.value > 0.58)) ||
    (context.profile.hiddenTraits.ruminative.value > 0.62 && context.interpretation.primaryIntent !== 'confession');

  if (!shouldChallenge) {
    return null;
  }

  let instruction = 'Name one concrete thing you will do in the next 24 hours instead of circling the same thought.';

  if (controlPattern > 0.6) {
    instruction = 'Stop trying to control the answer. Say the one thing you are actually avoiding.';
  } else if (identityPattern > 0.55) {
    instruction = 'Describe the version of yourself you perform, then the version you hide.';
  } else if (context.interpretation.emotionalTone === 'vulnerable') {
    instruction = 'Say the uncomfortable truth in one sentence, without decoration.';
  }

  return {
    type: 'challenge',
    instruction,
    follow_up: true,
  };
}

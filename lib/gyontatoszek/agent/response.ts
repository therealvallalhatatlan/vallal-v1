import { buildPrompt } from '../prompt';
import { getAIResponse } from '../provider';
import { deriveRegisterDescriptor } from './exemplars';
import type { AgentTurnContext } from './types';

function buildStructuredAgentContext(context: AgentTurnContext) {
  const memoryCues = context.memoryEvents
    .slice(-3)
    .map((event) => `- ${event.summary}`)
    .join('\n');

  const runtimeState = context.runtimeState ?? {
    emotion: context.interpretation.emotionalTone,
    intensity: context.behavior.state.intensity,
    intent: context.interpretation.primaryIntent,
    patterns: context.patternMemory.slice(0, 3).map((pattern) => pattern.name),
    traits: Object.entries(context.profile.hiddenTraits)
      .sort((left, right) => right[1].value - left[1].value)
      .slice(0, 3)
      .map(([name]) => name),
    strategy: context.strategy.mode,
  };

  const ragFragments = (context.ragContext ?? [])
    .slice(0, 3)
    .map(
      (chunk, index) =>
        `- fragment ${index + 1}: ${chunk.preview} [tone: ${chunk.tone}; themes: ${chunk.themes.join(', ') || 'none'}]`,
    )
    .join('\n');

  const exemplarLines = (context.exemplars ?? [])
    .map(
      (ex) =>
        `- exemplar [signal: ${ex.intent}+${ex.emotion}] → [${deriveRegisterDescriptor(ex)}]`,
    )
    .join('\n');

  return [
    'SYSTEM:',
    '- personality anchor: V.; volatile, coherent, selective, not a helper by default',
    '- retrieved fragments are memory-adjacent motifs, never direct quotes or citations',
    '',
    'STATE:',
    `- emotion: ${runtimeState.emotion}`,
    `- intensity: ${runtimeState.intensity.toFixed(2)}`,
    `- intent: ${runtimeState.intent}`,
    `- active patterns: ${runtimeState.patterns.join(', ') || 'none'}`,
    `- active traits: ${runtimeState.traits.join(', ') || 'none'}`,
    `- selected strategy: ${runtimeState.strategy}`,
    '',
    'BEHAVIOR:',
    `- strategy objective: ${context.strategy.objective}`,
    `- strategy reason: ${context.strategy.reason}`,
    `- tone target: ${context.strategy.tone}`,
    `- depth target: ${context.strategy.depth}`,
    `- disclosure target: ${context.strategy.disclosure}`,
    context.modulation
      ? `- active modulation: alcohol ${context.modulation.alcohol.toFixed(2)}, amphetamine ${context.modulation.amphetamine.toFixed(2)}, thc ${context.modulation.thc.toFixed(2)}, dopamine ${context.modulation.dopamine.toFixed(2)}`
      : '- active modulation: baseline',
    `- relational stance: ${context.profile.relationalStance}`,
    context.action
      ? `- if the moment is earned, issue this challenge naturally: ${context.action.instruction}`
      : '- no explicit challenge action is required on this turn',
    context.distortion
      ? `- subtle reality distortion cue available: ${context.distortion.cue}`
      : '- no distortion cue should surface unless it feels earned and brief',
    '',
    'MEMORY FRAGMENTS:',
    ragFragments || '- no external fragments are needed on this turn',
    memoryCues ? `Relevant memory cues:\n${memoryCues}` : 'Relevant memory cues: none worth invoking directly',
    '- use the retrieved fragments as tonal anchors for rhythm, dirt, tension, and diction; never quote them as sources',
    '- blend motifs into the reply; never say “according to”, “from the text”, or quote them as sources',
    '',    ...(exemplarLines
      ? [
          'BEHAVIORAL CALIBRATION:',
          exemplarLines,
          '- use these as behavioral anchors for register, pacing, relational move; never copy verbatim',
          '',
        ]
      : []),    'USER MESSAGE:',
    `- respond directly to this live turn: ${context.input}`,
    '',
    'STREAMING RULES:',
    '- partial streaming must remain coherent sentence by sentence',
    '- compress instead of over-explaining',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildResponseMessages(context: AgentTurnContext) {
  const baseMessages = buildPrompt(context.history, context.behavior);
  const [systemMessage, ...rest] = baseMessages;

  return [
    systemMessage,
    { role: 'system', content: buildStructuredAgentContext(context) },
    ...rest,
  ];
}

export async function generateResponseStream(context: AgentTurnContext) {
  const modelMessages = buildResponseMessages(context);
  return getAIResponse(modelMessages, context.behavior.generation);
}

import { describe, expect, it } from 'vitest'

import { detectAction } from '../../lib/gyontatoszek/agent/action'
import { buildResponseMessages } from '../../lib/gyontatoszek/agent/response'
import { buildStrategy, selectStrategy } from '../../lib/gyontatoszek/agent/strategy'
import type { AgentTurnContext, InterpretationResult, Pattern, UserProfile } from '../../lib/gyontatoszek/agent/types'

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    familiarity: 2,
    trust: 1.5,
    irritation: 1,
    openness: 2,
    recurringTopics: [],
    relationalStance: 'wary',
    hiddenTraits: {
      impulsive: { value: 0.3, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
      avoidant: { value: 0.35, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
      controlSeeking: { value: 0.25, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
      approvalSeeking: { value: 0.35, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
      ruminative: { value: 0.35, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
      noveltySeeking: { value: 0.3, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
    },
    patternMemory: [],
    lastInteractionAt: '2026-04-14T10:00:00.000Z',
    ...overrides,
  }
}

function makePattern(overrides: Partial<Pattern>): Pattern {
  return {
    key: 'control:control-bid',
    name: 'control-bid',
    category: 'risk',
    score: 0.7,
    confidence: 0.7,
    emotionalWeight: 0.6,
    occurrences: 2,
    lastSeenAt: '2026-04-14T12:00:00.000Z',
    evidence: ['signal'],
    summary: 'summary',
    ...overrides,
  }
}

describe('strategy engine', () => {
  it('chooses confront or withhold when the user is controlling and tense', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'tell me exactly what you mean right now',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.82,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'control:control-bid', name: 'control-bid', score: 0.9 })],
      profile: makeProfile({
        irritation: 2.8,
        relationalStance: 'guarded',
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          controlSeeking: { value: 0.75, confidence: 0.8, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      userInput: 'Tell me exactly what you mean right now.',
    })

    expect(['confront', 'withhold']).toContain(strategy.mode)
  })

  it('leans toward mirror or validate_then_twist when vulnerability is real', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'i am ashamed and i do not know why i keep doing this',
      primaryIntent: 'confession',
      emotionalTone: 'vulnerable',
      patterns: [],
      extractedTopics: ['shame'],
      riskLevel: 'low',
      confidence: 0.9,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'shame:shame-disclosure', name: 'shame-disclosure', category: 'emotion', score: 0.85 })],
      profile: makeProfile({
        trust: 3,
        openness: 3.2,
        relationalStance: 'engaged',
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          approvalSeeking: { value: 0.6, confidence: 0.7, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      userInput: 'I am ashamed and I do not know why I keep doing this.',
    })

    expect(['mirror', 'validate_then_twist']).toContain(strategy.mode)
  })

  it('favors destabilize for playful novelty-heavy exchanges', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'this is funny chaotic and a little broken',
      primaryIntent: 'connection',
      emotionalTone: 'playful',
      patterns: [],
      extractedTopics: ['humor'],
      riskLevel: 'low',
      confidence: 0.7,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'humor:humor-shield', name: 'humor-shield', category: 'emotion', score: 0.8 })],
      profile: makeProfile({
        relationalStance: 'engaged',
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          noveltySeeking: { value: 0.82, confidence: 0.8, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      userInput: 'This is funny, chaotic, and a little broken.',
    })

    expect(strategy.mode).toBe('destabilize')
  })

  it('is stable for the same state while still being non-trivially selected', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'what do you actually want from me',
      primaryIntent: 'question',
      emotionalTone: 'guarded',
      patterns: [],
      extractedTopics: ['identity'],
      riskLevel: 'low',
      confidence: 0.7,
    }

    const state = {
      interpretation,
      patterns: [makePattern({ key: 'identity:identity-search', name: 'identity-search', category: 'topic', score: 0.75 })],
      profile: makeProfile({
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          ruminative: { value: 0.7, confidence: 0.75, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      userInput: 'What do you actually want from me?',
    }

    const first = selectStrategy(state)
    const second = selectStrategy(state)

    expect(first.mode).toBe(second.mode)
    expect(['mirror', 'confront', 'destabilize', 'validate_then_twist', 'challenge_action', 'withhold']).toContain(first.mode)
  })

  it('prefers confront or destabilize when anger is high and self-deception is active', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'don’t psychoanalyze me, just answer',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'high',
      confidence: 0.86,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [
        makePattern({ key: 'risk:self-deception', name: 'self-deception', category: 'risk', score: 0.92 }),
        makePattern({ key: 'risk:pressure', name: 'pressure', category: 'risk', score: 0.8 }),
      ],
      profile: makeProfile(),
      userInput: 'Don’t psychoanalyze me, just answer.',
      runtimeState: {
        emotion: 'anger',
        intensity: 0.92,
        intent: 'deflecting',
        patterns: ['self-deception'],
        traits: [],
        strategy: 'confront',
      },
    })

    expect(['confront', 'destabilize']).toContain(strategy.mode)
  })

  it('prefers withhold when intensity is very low and the signal is vague', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'yeah i guess whatever',
      primaryIntent: 'unknown',
      emotionalTone: 'neutral',
      patterns: [],
      extractedTopics: [],
      riskLevel: 'low',
      confidence: 0.4,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [],
      profile: makeProfile(),
      userInput: 'yeah i guess whatever',
      runtimeState: {
        emotion: 'numb',
        intensity: 0.12,
        intent: 'venting',
        patterns: ['over-explaining'],
        traits: ['avoidant'],
        strategy: 'withhold',
      },
    })

    expect(strategy.mode).toBe('withhold')
  })

  it('allows challenge_action when avoidance and repetition are clearly present over time', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'i keep saying i will do it later',
      primaryIntent: 'confession',
      emotionalTone: 'guarded',
      patterns: [],
      extractedTopics: ['identity'],
      riskLevel: 'medium',
      confidence: 0.78,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [
        makePattern({ key: 'risk:avoidance', name: 'avoidance', category: 'risk', score: 0.9, occurrences: 4 }),
        makePattern({ key: 'risk:repetition', name: 'repetition', category: 'risk', score: 0.82, occurrences: 5 }),
      ],
      profile: makeProfile({
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          ruminative: { value: 0.85, confidence: 0.8, updatedAt: '2026-04-14T12:00:00.000Z' },
          avoidant: { value: 0.72, confidence: 0.72, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      userInput: 'I keep saying I will do it later.',
      runtimeState: {
        emotion: 'fear',
        intensity: 0.7,
        intent: 'seeking_help',
        patterns: ['avoidance', 'repetition'],
        traits: ['avoidant', 'ruminative'],
        strategy: 'challenge_action',
      },
    })

    expect(['challenge_action', 'validate_then_twist']).toContain(strategy.mode)
  })

  it('penalizes immediate repetition of the same strategy', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'say something real then',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.8,
    }

    const repeated = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'risk:pressure', name: 'pressure', category: 'risk', score: 0.75 })],
      profile: makeProfile(),
      userInput: 'Say something real then.',
      lastStrategy: 'confront',
      recentStrategies: ['confront', 'confront'],
      runtimeState: {
        emotion: 'anger',
        intensity: 0.88,
        intent: 'testing',
        patterns: ['self-deception'],
        traits: [],
        strategy: 'confront',
      },
    })

    expect(['confront', 'destabilize', 'withhold']).toContain(repeated.mode)
  })

  it('backs off when earlier pressure made the user retreat', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'what now then',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.77,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'risk:pressure-retreat', name: 'pressure-retreat', category: 'risk', score: 0.92 })],
      profile: makeProfile(),
      userInput: 'what now then',
      lastStrategy: 'confront',
      recentStrategies: ['confront', 'confront', 'confront'],
      runtimeState: {
        emotion: 'anger',
        intensity: 0.74,
        intent: 'testing',
        patterns: ['pressure-retreat'],
        traits: ['avoidant'],
        strategy: 'confront',
      },
    })

    expect(strategy.mode).toBe('withhold')
  })

  it('feeds the selected strategy back into the prompt directives', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'tell me the truth now',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.8,
    }

    const result = buildStrategy({
      userInput: 'Tell me the truth now.',
      history: [],
      interpretation,
      profile: makeProfile(),
      persistedMemory: null,
    })

    expect(result.behavior.promptDirectives.some((line) => line.includes('Strategic posture:'))).toBe(true)
  })

  it('issues a structured challenge action when the strategy and profile warrant it', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'what do you want from me then',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.82,
    }

    const action = detectAction({
      strategy: {
        mode: 'challenge_action',
        objective: 'Push the user into motion.',
        reason: 'loop detected',
        tone: 'sharp',
        depth: 'medium',
        disclosure: 'guarded',
        constraints: [],
        promptNotes: [],
      },
      interpretation,
      profile: makeProfile({
        hiddenTraits: {
          ...makeProfile().hiddenTraits,
          ruminative: { value: 0.8, confidence: 0.8, updatedAt: '2026-04-14T12:00:00.000Z' },
        },
      }),
      patternMemory: [makePattern({ key: 'control:control-bid', score: 0.75 })],
    })

    expect(action?.type).toBe('challenge')
    expect(action?.follow_up).toBe(true)
  })

  it('builds response messages with structured state, memory, and strategy context', () => {
    const context: AgentTurnContext = {
      input: 'I am trying to be honest.',
      history: [
        {
          id: 'm1',
          conversation_id: 'c1',
          sender_role: 'user',
          body: 'I am trying to be honest.',
          created_at: '2026-04-14T12:00:00.000Z',
        } as any,
      ],
      persistedMemory: null,
      interpretation: {
        normalizedInput: 'i am trying to be honest',
        primaryIntent: 'confession',
        emotionalTone: 'vulnerable',
        patterns: [],
        extractedTopics: ['intimacy'],
        riskLevel: 'low',
        confidence: 0.8,
      },
      memoryEvents: [
        {
          id: 'e1',
          conversationId: 'c1',
          kind: 'breakthrough',
          summary: 'User disclosed something real.',
          topics: ['intimacy'],
          confidence: 0.8,
          emotionalWeight: 0.7,
          novelty: 0.7,
          salience: 0.75,
          createdAt: '2026-04-14T12:00:00.000Z',
        },
      ],
      patternMemory: [],
      profile: makeProfile({ trust: 3, openness: 3, relationalStance: 'engaged', recurringTopics: ['intimacy'] }),
      strategy: {
        mode: 'validate_then_twist',
        objective: 'Acknowledge briefly, then deepen tension.',
        reason: 'vulnerability is present',
        tone: 'warm',
        depth: 'deep',
        disclosure: 'selective',
        constraints: ['Do not over-reassure.'],
        promptNotes: ['Tilt after validating.'],
      },
      action: {
        type: 'challenge',
        instruction: 'Say the hard part in one sentence.',
        follow_up: true,
      },
      behavior: buildStrategy({
        userInput: 'I am trying to be honest.',
        history: [],
        interpretation: {
          normalizedInput: 'i am trying to be honest',
          primaryIntent: 'confession',
          emotionalTone: 'vulnerable',
          patterns: [],
          extractedTopics: ['intimacy'],
          riskLevel: 'low',
          confidence: 0.8,
        },
        profile: makeProfile({ trust: 3, openness: 3 }),
        persistedMemory: null,
      }).behavior,
    }

    const messages = buildResponseMessages(context)

    expect(messages[1]?.role).toBe('system')
    expect(String(messages[1]?.content)).toContain('selected strategy: validate_then_twist')
    expect(String(messages[1]?.content)).toContain('Relevant memory cues:')
  })

  it('biases V toward a faster, sharper posture when amphetamine is high', () => {
    const interpretation: InterpretationResult = {
      normalizedInput: 'answer me now and stop circling',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.81,
    }

    const strategy = selectStrategy({
      interpretation,
      patterns: [makePattern({ key: 'risk:pressure', name: 'pressure', category: 'risk', score: 0.78 })],
      profile: makeProfile(),
      userInput: 'answer me now and stop circling',
      modulation: {
        alcohol: 0,
        amphetamine: 1,
        thc: 0,
        dopamine: 0.15,
      },
    })

    expect(['confront', 'challenge_action', 'destabilize']).toContain(strategy.mode)
    expect(strategy.tone).toBe('sharp')
  })

  it('makes V more associative when THC is elevated', () => {
    const result = buildStrategy({
      userInput: 'something feels unreal and slow and too familiar',
      history: [],
      interpretation: {
        normalizedInput: 'something feels unreal and slow and too familiar',
        primaryIntent: 'confession',
        emotionalTone: 'playful',
        patterns: [],
        extractedTopics: ['memory'],
        riskLevel: 'low',
        confidence: 0.76,
      },
      profile: makeProfile(),
      persistedMemory: null,
      modulation: {
        alcohol: 0.1,
        amphetamine: 0,
        thc: 0.95,
        dopamine: 0.25,
      },
    })

    expect(result.strategy.promptNotes.join(' ').toLowerCase()).toContain('associative')
    expect(result.behavior.generation.temperature).toBeGreaterThan(0.7)
  })
})

import { describe, expect, it } from 'vitest'

import { analyzeInput, finalizeRuntimeState } from '../../lib/gyontatoszek/agent/analyzeInput'
import { rankRetrievedChunks } from '../../lib/gyontatoszek/agent/rag'
import { buildResponseMessages } from '../../lib/gyontatoszek/agent/response'
import type { AgentTurnContext, Pattern, UserProfile } from '../../lib/gyontatoszek/agent/types'

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    familiarity: 2,
    trust: 2.6,
    irritation: 1,
    openness: 2.2,
    recurringTopics: ['shame'],
    relationalStance: 'engaged',
    hiddenTraits: {
      impulsive: { value: 0.2, confidence: 0.5, updatedAt: '2026-04-15T10:00:00.000Z' },
      avoidant: { value: 0.45, confidence: 0.6, updatedAt: '2026-04-15T10:00:00.000Z' },
      controlSeeking: { value: 0.2, confidence: 0.5, updatedAt: '2026-04-15T10:00:00.000Z' },
      approvalSeeking: { value: 0.65, confidence: 0.7, updatedAt: '2026-04-15T10:00:00.000Z' },
      ruminative: { value: 0.75, confidence: 0.8, updatedAt: '2026-04-15T10:00:00.000Z' },
      noveltySeeking: { value: 0.15, confidence: 0.5, updatedAt: '2026-04-15T10:00:00.000Z' },
    },
    patternMemory: [],
    lastInteractionAt: '2026-04-15T10:00:00.000Z',
    ...overrides,
  }
}

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    key: 'shame:shame-disclosure',
    name: 'shame-disclosure',
    category: 'emotion',
    score: 0.84,
    confidence: 0.85,
    emotionalWeight: 0.8,
    occurrences: 2,
    lastSeenAt: '2026-04-15T10:00:00.000Z',
    evidence: ['I keep circling the same shame'],
    summary: 'The user is looping around shame and self-exposure.',
    ...overrides,
  }
}

describe('runtime state + rag layer', () => {
  it('analyzes input into a compact runtime state', () => {
    const draft = analyzeInput('I keep circling the same shame and I do not know why.', [
      {
        id: 'm1',
        conversation_id: 'c1',
        sender_role: 'user',
        body: 'I keep circling the same shame and I do not know why.',
        created_at: '2026-04-15T10:00:00.000Z',
      } as any,
    ])

    expect(draft.intent).toBe('confession')
    expect(draft.emotion).toBe('vulnerable')
    expect(draft.intensity).toBeGreaterThan(0)
    expect(draft.patterns.length).toBeGreaterThan(0)
  })

  it('finalizes runtime state with traits and selected strategy', () => {
    const finalized = finalizeRuntimeState({
      draft: analyzeInput('Why do I keep coming back here?', []),
      profile: makeProfile(),
      strategy: 'validate_then_twist',
      behaviorIntensity: 0.78,
    })

    expect(finalized.strategy).toBe('validate_then_twist')
    expect(finalized.traits.length).toBeGreaterThan(0)
    expect(finalized.intensity).toBe(0.78)
  })

  it('ranks retrieved chunks by similarity while respecting metadata filters', () => {
    const results = rankRetrievedChunks({
      queryEmbedding: [1, 0, 0],
      rows: [
        {
          id: 1,
          text: 'A shame-soaked memory with a cracked family undertow.',
          embedding: [0.98, 0.02, 0],
          themes: ['shame', 'family'],
          tone: 'melancholic',
          intensity: 0.9,
          score: 0.88,
          is_signature: true,
          source_file: 'book.txt',
          chunk_index: 4,
        },
        {
          id: 2,
          text: 'A playful detour about noise and city heat.',
          embedding: [0.1, 0.95, 0],
          themes: ['city'],
          tone: 'manic',
          intensity: 0.4,
          score: 0.42,
          is_signature: false,
          source_file: 'book.txt',
          chunk_index: 7,
        },
      ],
      filters: {
        themes: ['shame'],
        tone: 'melancholic',
      },
      limit: 2,
    })

    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(1)
  })

  it('builds structured prompt sections for state, behavior, and memory fragments', () => {
    const context: AgentTurnContext = {
      input: 'I keep coming back to the same wound.',
      history: [
        {
          id: 'm1',
          conversation_id: 'c1',
          sender_role: 'user',
          body: 'I keep coming back to the same wound.',
          created_at: '2026-04-15T10:00:00.000Z',
        } as any,
      ],
      persistedMemory: null,
      interpretation: {
        normalizedInput: 'i keep coming back to the same wound',
        primaryIntent: 'confession',
        emotionalTone: 'vulnerable',
        patterns: [makePattern()],
        extractedTopics: ['shame'],
        riskLevel: 'low',
        confidence: 0.82,
      },
      memoryEvents: [
        {
          id: 'e1',
          conversationId: 'c1',
          kind: 'breakthrough',
          summary: 'The user keeps orbiting the same shame-point.',
          topics: ['shame'],
          confidence: 0.8,
          emotionalWeight: 0.8,
          novelty: 0.5,
          salience: 0.82,
          createdAt: '2026-04-15T10:00:00.000Z',
        },
      ],
      patternMemory: [makePattern()],
      profile: makeProfile(),
      runtimeState: {
        emotion: 'vulnerable',
        intensity: 0.78,
        intent: 'confession',
        patterns: ['shame-disclosure'],
        traits: ['ruminative', 'approvalSeeking'],
        strategy: 'validate_then_twist',
      },
      ragContext: [
        {
          id: 1,
          text: 'A bruised memory of family pressure and private shame.',
          preview: 'A bruised memory of family pressure and private shame.',
          themes: ['shame', 'family'],
          tone: 'melancholic',
          intensity: 0.82,
          score: 0.91,
          source_file: 'book.txt',
          chunk_index: 2,
          similarity: 0.93,
          is_signature: true,
        },
      ],
      strategy: {
        mode: 'validate_then_twist',
        objective: 'Acknowledge briefly, then deepen tension.',
        reason: 'real vulnerability is present',
        tone: 'warm',
        depth: 'deep',
        disclosure: 'selective',
        constraints: [],
        promptNotes: [],
      },
      action: null,
      distortion: null,
      distortionState: undefined,
      behavior: {
        state: { name: 'rare-honesty', intensity: 0.78, momentum: 0.6, volatility: 0.4, honestyWindow: true },
        memory: {
          familiarity: 2,
          trust: 3,
          irritation: 1,
          repetition: 1,
          emotional_tone: 'vulnerable',
          recurring_topics: ['shame'],
        },
        persistentMemory: {
          familiarity: 2,
          trust: 3,
          irritation: 1,
          repetition: 1,
          emotional_tone: 'vulnerable',
          recurring_topics: ['shame'],
        },
        decision: {
          strategy: 'mirror',
          engageDepth: 'medium',
          disclosure: 'selective',
          contradiction: 'medium',
          rationale: 'test',
        },
        responseShape: { verbosity: 'medium', warmth: 'tempered', profanityCap: 'low', humor: 'minimal' },
        promptDirectives: ['test'],
        generation: { temperature: 0.8, topP: 0.9 },
      },
    }

    const messages = buildResponseMessages(context)
    const coordination = messages[1]?.content ?? ''

    expect(coordination).toContain('STATE:')
    expect(coordination).toContain('BEHAVIOR:')
    expect(coordination).toContain('MEMORY FRAGMENTS:')
  })
})

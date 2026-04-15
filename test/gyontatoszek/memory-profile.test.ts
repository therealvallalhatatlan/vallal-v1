import { describe, expect, it } from 'vitest'

import { buildMemoryContext, extractEvent, updatePatterns } from '../../lib/gyontatoszek/agent/memory'
import { updateProfile } from '../../lib/gyontatoszek/agent/profile'
import type { InterpretationResult, Pattern, UserProfile } from '../../lib/gyontatoszek/agent/types'

describe('memory layer', () => {
  it('extracts a meaningful shame disclosure event from a vulnerable user message', () => {
    const event = extractEvent(
      {
        id: 'm1',
        conversation_id: 'c1',
        sender_role: 'user',
        body: 'I joke because I am ashamed and it is easier than saying I am scared.',
        created_at: '2026-04-14T12:00:00.000Z',
      } as any,
      []
    )

    expect(event).not.toBeNull()
    expect(event?.kind).toBe('breakthrough')
    expect(event?.topics).toContain('shame')
    expect(event?.emotionalWeight).toBeGreaterThan(0.6)
  })

  it('ignores low-signal noise instead of storing raw chat clutter', () => {
    const event = extractEvent(
      {
        id: 'm2',
        conversation_id: 'c1',
        sender_role: 'user',
        body: 'ok',
        created_at: '2026-04-14T12:00:01.000Z',
      } as any,
      []
    )

    expect(event).toBeNull()
  })

  it('detects self-contradiction when the user reverses a recent claim', () => {
    const event = extractEvent(
      {
        id: 'm3',
        conversation_id: 'c1',
        sender_role: 'user',
        body: 'I do not even want control anymore.',
        created_at: '2026-04-14T12:03:00.000Z',
      } as any,
      [{ body: 'I need control over everything or I panic.' } as any]
    )

    expect(event).not.toBeNull()
    expect(event?.metadata?.signal).toBe('self-contradiction')
  })

  it('stores consequence memory when pressure leads to sudden honesty', () => {
    const context = buildMemoryContext({
      conversationId: 'c1',
      conversationMetadata: {},
      history: [
        {
          id: 'a1',
          conversation_id: 'c1',
          sender_role: 'assistant',
          body: 'Ne kerüld meg. Mondd ki.',
          created_at: '2026-04-14T12:00:00.000Z',
          metadata: {
            behavior: {
              strategyPlan: { mode: 'confront' },
            },
          },
        } as any,
        {
          id: 'u3',
          conversation_id: 'c1',
          sender_role: 'user',
          body: 'Jó. Az igazság az, hogy szégyellem az egészet.',
          created_at: '2026-04-14T12:01:00.000Z',
        } as any,
      ],
      userId: 'u1',
      userEmail: 'user@example.com',
    })

    expect(context.memoryEvents.some((event) => event.metadata?.signal === 'pressure-opened-up')).toBe(true)
  })

  it('strengthens repeated control patterns gradually over time', () => {
    const next = updatePatterns(
      [],
      [
        {
          id: 'e1',
          conversationId: 'c1',
          kind: 'rupture',
          summary: 'User pushed for a direct answer and control.',
          topics: ['control'],
          confidence: 0.8,
          emotionalWeight: 0.7,
          novelty: 0.5,
          salience: 0.8,
          createdAt: '2026-04-14T12:00:00.000Z',
          metadata: { signal: 'control-bid' },
        },
        {
          id: 'e2',
          conversationId: 'c1',
          kind: 'rupture',
          summary: 'User again demanded certainty and compliance.',
          topics: ['control'],
          confidence: 0.85,
          emotionalWeight: 0.75,
          novelty: 0.3,
          salience: 0.85,
          createdAt: '2026-04-14T12:01:00.000Z',
          metadata: { signal: 'control-bid' },
        },
      ] as any
    )

    const controlPattern = next.find((pattern) => pattern.key === 'control:control-bid')
    expect(controlPattern).toBeDefined()
    expect(controlPattern?.occurrences).toBe(2)
    expect((controlPattern?.score ?? 0)).toBeGreaterThan(0.55)
  })
})

describe('profile engine', () => {
  it('updates hidden traits probabilistically instead of flipping them on or off', () => {
    const baseProfile: UserProfile = {
      id: 'u1',
      familiarity: 1,
      trust: 1,
      irritation: 1,
      openness: 2,
      recurringTopics: [],
      relationalStance: 'wary',
      hiddenTraits: {
        impulsive: { value: 0.2, confidence: 0.4, updatedAt: '2026-04-14T10:00:00.000Z' },
        avoidant: { value: 0.3, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
        controlSeeking: { value: 0.2, confidence: 0.3, updatedAt: '2026-04-14T10:00:00.000Z' },
        approvalSeeking: { value: 0.3, confidence: 0.4, updatedAt: '2026-04-14T10:00:00.000Z' },
        ruminative: { value: 0.4, confidence: 0.5, updatedAt: '2026-04-14T10:00:00.000Z' },
        noveltySeeking: { value: 0.2, confidence: 0.3, updatedAt: '2026-04-14T10:00:00.000Z' },
      },
      patternMemory: [],
      lastInteractionAt: '2026-04-14T10:00:00.000Z',
    }

    const interpretation: InterpretationResult = {
      normalizedInput: 'tell me exactly what you mean',
      primaryIntent: 'challenge',
      emotionalTone: 'tense',
      patterns: [],
      extractedTopics: ['control'],
      riskLevel: 'medium',
      confidence: 0.75,
    }

    const patterns: Pattern[] = [
      {
        key: 'control:control-bid',
        name: 'control-bid',
        category: 'risk',
        score: 0.8,
        confidence: 0.85,
        emotionalWeight: 0.7,
        occurrences: 3,
        lastSeenAt: '2026-04-14T12:01:00.000Z',
        evidence: ['demanded exact answer'],
        summary: 'User often tries to regain control through direct pressure.',
      },
    ]

    const next = updateProfile(baseProfile, interpretation, [], patterns)

    expect(next.hiddenTraits.controlSeeking.value).toBeGreaterThan(0.2)
    expect(next.hiddenTraits.controlSeeking.value).toBeLessThan(1)
    expect(next.relationalStance).toBe('guarded')
  })
})

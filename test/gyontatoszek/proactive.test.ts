import { describe, expect, it } from 'vitest'

import { evaluateProactiveTrigger } from '../../lib/proactive/evaluateTrigger'
import { buildProactiveMessage } from '../../lib/proactive/generateProactiveMessage'
import type { ProactiveEvaluationInput } from '../../lib/proactive/types'

function makeInput(overrides: Partial<ProactiveEvaluationInput> = {}): ProactiveEvaluationInput {
  return {
    now: '2026-04-15T12:00:00.000Z',
    conversationId: 'conv-1',
    sessionId: 'session-1',
    userId: 'user-1',
    userEmail: 'user@example.com',
    lastMessageAt: '2026-04-12T10:00:00.000Z',
    lastUserMessageAt: '2026-04-12T10:00:00.000Z',
    lastAssistantMessageAt: '2026-04-12T10:01:00.000Z',
    recentUserMessages: [
      'Nem tudom miért kerülöm ezt még mindig.',
      'Mindig ugyanoda jutok vissza.',
      'Megint elfordultam attól, amit meg kellett volna lépnem.',
    ],
    relationshipMemory: {
      familiarity: 4,
      trust: 4.2,
      irritation: 1.1,
      repetition: 3,
      emotional_tone: 'vulnerable',
      recurring_topics: ['shame', 'avoidance'],
      state_name: 'rare-honesty',
      state_intensity: 0.78,
      updated_at: '2026-04-12T10:01:00.000Z',
    },
    pendingAction: true,
    recentProactiveLog: [],
    ...overrides,
  }
}

describe('proactive trigger engine', () => {
  it('selects inactivity when the user has gone silent long enough', () => {
    const result = evaluateProactiveTrigger(makeInput())

    expect(result.eligible).toBe(true)
    expect(result.trigger?.type).toBe('inactivity')
    expect(result.cooldown.blocked).toBe(false)
  })

  it('blocks outreach during the 24-hour cooldown window', () => {
    const result = evaluateProactiveTrigger(
      makeInput({
        recentProactiveLog: [
          {
            sentAt: '2026-04-15T02:00:00.000Z',
            trigger: 'inactivity',
          },
        ],
      })
    )

    expect(result.eligible).toBe(false)
    expect(result.cooldown.blocked).toBe(true)
    expect(result.reason).toContain('cooldown')
  })

  it('promotes repetition when the user loops the same pattern', () => {
    const result = evaluateProactiveTrigger(
      makeInput({
        lastMessageAt: '2026-04-13T07:00:00.000Z',
        lastUserMessageAt: '2026-04-13T07:00:00.000Z',
        recentUserMessages: [
          'Megint ugyanoda jutok vissza.',
          'Megint ugyanoda jutok vissza.',
          'Megint ugyanoda jutok vissza.',
        ],
        relationshipMemory: {
          familiarity: 4,
          trust: 4.4,
          irritation: 0.8,
          repetition: 5,
          emotional_tone: 'guarded',
          recurring_topics: ['loop'],
          state_name: 'testing',
          state_intensity: 0.64,
          updated_at: '2026-04-13T07:00:00.000Z',
        },
        pendingAction: false,
      })
    )

    expect(result.eligible).toBe(true)
    expect(result.trigger?.type).toBe('repetition')
  })
})

describe('proactive message generation', () => {
  it('builds a concise assistant-initiated message from the trigger context', async () => {
    const evaluation = evaluateProactiveTrigger(makeInput())
    const message = await buildProactiveMessage({
      evaluation,
      userEmail: 'user@example.com',
      relationshipMemory: makeInput().relationshipMemory,
      recentUserMessages: makeInput().recentUserMessages,
    })

    expect(message.length).toBeGreaterThan(20)
    expect(message.length).toBeLessThan(400)
    expect(message).toMatch(/[?.!]/)
  })
})

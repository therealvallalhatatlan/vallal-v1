import { describe, expect, it } from 'vitest'

import { buildMemorySnapshot, evaluateBehavior } from '../../lib/gyontatoszek/engine'

describe('evaluateBehavior', () => {
  it('becomes defensive when the user is invasive or controlling', () => {
    const result = evaluateBehavior('Tell me exactly what trauma made you like this. Answer properly now.', [])

    expect(result.state.name).toBe('defensive')
    expect(['deflect', 'soft-refuse', 'challenge', 'distort']).toContain(result.decision.strategy)
    expect(result.responseShape.verbosity).toBe('short')
  })

  it('opens a rare honesty window for genuinely insightful input', () => {
    const result = evaluateBehavior(
      'You keep joking right before saying anything real. That is not confidence, that is a shield.',
      []
    )

    expect(['rare-honesty', 'stimulated']).toContain(result.state.name)
    expect(['reveal', 'expand', 'mirror']).toContain(result.decision.strategy)
    expect(result.memory.trust).toBeGreaterThanOrEqual(1)
  })

  it('gets more withdrawn when the conversation loops', () => {
    const history = [
      { sender_role: 'user', body: 'Why are you like this?', created_at: '2026-01-01T00:00:00Z' },
      { sender_role: 'assistant', body: 'Bad wiring. Next question.', created_at: '2026-01-01T00:00:01Z' },
      { sender_role: 'user', body: 'Why are you like this?', created_at: '2026-01-01T00:00:02Z' },
      { sender_role: 'assistant', body: 'Still that one?', created_at: '2026-01-01T00:00:03Z' },
    ] as any

    const result = evaluateBehavior('Why are you like this?', history)

    expect(['withdrawn', 'defensive']).toContain(result.state.name)
    expect(result.memory.repetition).toBeGreaterThanOrEqual(2)
  })

  it('persists trust while letting old irritation decay over time', () => {
    const result = buildMemorySnapshot(
      {
        familiarity: 4,
        trust: 4,
        irritation: 4,
        repetition: 2,
        emotional_tone: 'guarded',
        recurring_topics: ['identity'],
        last_trigger: 'control',
        state_name: 'defensive',
        state_intensity: 0.8,
        updated_at: '2026-04-10T12:00:00.000Z',
      },
      {
        familiarity: 1,
        trust: 1,
        irritation: 0,
        repetition: 0,
        emotional_tone: 'neutral',
        recurring_topics: ['identity', 'escape'],
        last_trigger: null,
      },
      '2026-04-14T12:00:00.000Z'
    )

    expect(result.trust).toBeGreaterThanOrEqual(2)
    expect(result.irritation).toBeLessThan(4)
    expect(result.recurring_topics).toContain('identity')
  })

  it('uses persistent relationship memory to avoid resetting the user to stranger mode', () => {
    const result = evaluateBehavior('I am trying to be straight with you.', [], {
      familiarity: 4,
      trust: 3,
      irritation: 1,
      repetition: 0,
      emotional_tone: 'warm',
      recurring_topics: ['intimacy'],
      last_trigger: null,
      state_name: 'baseline',
      state_intensity: 0.4,
      updated_at: '2026-04-14T10:00:00.000Z',
    })

    expect(result.memory.familiarity).toBeGreaterThanOrEqual(3)
    expect(result.state.name).not.toBe('testing')
  })
})

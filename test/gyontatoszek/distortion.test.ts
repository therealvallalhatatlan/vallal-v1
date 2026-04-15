import { describe, expect, it } from 'vitest'

import { selectDistortionHook, updateDistortionState } from '../../lib/gyontatoszek/agent/distortion'
import type { DistortionState, MemoryEvent } from '../../lib/gyontatoszek/agent/types'

describe('reality distortion layer', () => {
  it('queues subtle delayed hooks from high-salience emotional events', () => {
    const state = updateDistortionState(
      null,
      [
        {
          id: 'e1',
          conversationId: 'c1',
          kind: 'breakthrough',
          summary: 'User disclosed shame under a joke.',
          topics: ['shame', 'humor'],
          confidence: 0.82,
          emotionalWeight: 0.78,
          novelty: 0.7,
          salience: 0.8,
          createdAt: '2026-04-14T12:00:00.000Z',
          metadata: { signal: 'humor-shield' },
        },
      ] as MemoryEvent[],
      'I am fine, probably.',
      '2026-04-14T12:00:00.000Z'
    )

    expect(state.pendingHooks.length).toBeGreaterThan(0)
    expect(state.pendingHooks[0]?.type).toBe('delayed_callback')
  })

  it('surfaces a cue only when it is eligible and the turn allows subtle distortion', () => {
    const distortionState: DistortionState = {
      pendingHooks: [
        {
          id: 'hook-1',
          type: 'pattern_slip',
          topic: 'control',
          cue: 'You keep finding the same edge through control.',
          sourceEventId: 'e1',
          strength: 0.82,
          turnsUntilEligible: 0,
          createdAt: '2026-04-14T12:00:00.000Z',
          triggered: false,
        },
      ],
      cooldownUntilTurn: 0,
      turnCount: 3,
    }

    const result = selectDistortionHook({
      input: 'Why do you keep avoiding the point about control?',
      memoryEvents: [],
      distortionState,
      strategyMode: 'destabilize',
    })

    expect(result.activeHook?.cue).toContain('control')
    expect(result.nextState.lastCue).toContain('control')
  })

  it('respects cooldown and stays subtle when the hook should not fire', () => {
    const distortionState: DistortionState = {
      pendingHooks: [
        {
          id: 'hook-1',
          type: 'unexpected_recall',
          topic: 'shame',
          cue: 'That earlier bruise is still in the room.',
          sourceEventId: 'e1',
          strength: 0.9,
          turnsUntilEligible: 0,
          createdAt: '2026-04-14T12:00:00.000Z',
          triggered: false,
        },
      ],
      cooldownUntilTurn: 5,
      turnCount: 3,
    }

    const result = selectDistortionHook({
      input: 'ok',
      memoryEvents: [],
      distortionState,
      strategyMode: 'mirror',
    })

    expect(result.activeHook).toBeNull()
  })
})

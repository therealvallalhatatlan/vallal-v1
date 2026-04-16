import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

import { interpretTurn } from '../../lib/gyontatoszek/agent/interpretation'
import { selectStrategy } from '../../lib/gyontatoszek/agent/strategy'
import type { BehavioralExemplar, UserProfile } from '../../lib/gyontatoszek/agent/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALLOWED_STRATEGIES = [
  'mirror',
  'confront',
  'destabilize',
  'validate_then_twist',
  'challenge_action',
  'withhold',
] as const

type AllowedStrategy = (typeof ALLOWED_STRATEGIES)[number]

function makeNeutralProfile(): UserProfile {
  const ts = '2026-01-01T00:00:00.000Z'
  return {
    id: 'eval-user',
    familiarity: 2,
    trust: 2,
    irritation: 1,
    openness: 2,
    recurringTopics: [],
    relationalStance: 'guarded',
    hiddenTraits: {
      impulsive:      { value: 0.3, confidence: 0.5, updatedAt: ts },
      avoidant:       { value: 0.3, confidence: 0.5, updatedAt: ts },
      controlSeeking: { value: 0.3, confidence: 0.5, updatedAt: ts },
      approvalSeeking:{ value: 0.3, confidence: 0.5, updatedAt: ts },
      ruminative:     { value: 0.3, confidence: 0.5, updatedAt: ts },
      noveltySeeking: { value: 0.3, confidence: 0.5, updatedAt: ts },
    },
    patternMemory: [],
    lastInteractionAt: ts,
  }
}

// ---------------------------------------------------------------------------
// Load exemplars (supports JSON array and JSONL)
// ---------------------------------------------------------------------------

function parseKnowledgeFile(raw: string): { all: BehavioralExemplar[]; labeled: BehavioralExemplar[] } {
  const trimmed = raw.trim()
  interface RawRecord { id?: string; user?: string; user_question?: string; intent?: string; emotion?: string; expected_strategy?: string; v_response?: string }
  let records: RawRecord[]
  if (trimmed.startsWith('[')) {
    records = JSON.parse(trimmed) as RawRecord[]
  } else {
    records = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RawRecord)
  }

  const all: BehavioralExemplar[] = []
  const labeled: BehavioralExemplar[] = []

  records.forEach((r, i) => {
    const user = r.user ?? r.user_question ?? ''
    const v_response = r.v_response ?? ''
    if (!user || !v_response) return
    const hasLabel = typeof r.expected_strategy === 'string' && r.expected_strategy.length > 0
    const entry: BehavioralExemplar = {
      id: r.id ?? `auto-${i}`,
      user,
      intent: r.intent ?? 'unknown',
      emotion: r.emotion ?? 'neutral',
      expected_strategy: r.expected_strategy ?? 'mirror',
      v_response,
    }
    all.push(entry)
    if (hasLabel) labeled.push(entry)
  })

  return { all, labeled }
}

const knowledgePath = join(process.cwd(), 'data', 'gyontatoszek', 'knowledge.jsonl')
const { all: exemplars, labeled: labeledExemplars } = parseKnowledgeFile(readFileSync(knowledgePath, 'utf-8'))

// ---------------------------------------------------------------------------
// Evaluation suite
// ---------------------------------------------------------------------------

describe('exemplar Q/A evaluation', () => {
  it('loads exemplars successfully', () => {
    expect(exemplars.length).toBeGreaterThan(0)
    for (const ex of exemplars) {
      expect(ex.id).toBeTruthy()
      expect(ex.user).toBeTruthy()
      expect(ex.expected_strategy).toBeTruthy()
      expect(ALLOWED_STRATEGIES).toContain(ex.expected_strategy as AllowedStrategy)
    }
  })

  it('all expected_strategy values are valid StrategyMode values', () => {
    const invalid = exemplars.filter(
      (ex) => !ALLOWED_STRATEGIES.includes(ex.expected_strategy as AllowedStrategy),
    )
    expect(invalid).toHaveLength(0)
  })

  it('expected strategy has above-average weight for ≥50% of labeled exemplars (regression guard)', () => {
    if (labeledExemplars.length === 0) {
      console.log('[eval] No labeled exemplars found — skipping regression guard (add expected_strategy fields to knowledge.jsonl to enable)')
      return
    }

    const AVERAGE_WEIGHT = 1 / 6 // uniform baseline

    const results = labeledExemplars.map((ex) => {
      const interpretation = interpretTurn(ex.user, [])
      const { weightTrace } = selectStrategy({
        interpretation,
        patterns: interpretation.patterns,
        profile: makeNeutralProfile(),
        userInput: ex.user,
      })
      const expectedWeight = weightTrace[ex.expected_strategy as keyof typeof weightTrace] ?? 0
      return { id: ex.id, expectedWeight, aboveAvg: expectedWeight > AVERAGE_WEIGHT }
    })

    const passed = results.filter((r) => r.aboveAvg).length
    const rate   = passed / results.length

    console.log(
      `[eval] ${passed}/${results.length} labeled exemplars where expected strategy weight > avg (${(rate * 100).toFixed(1)}%)`,
    )

    expect(rate).toBeGreaterThanOrEqual(0.50)
  })

  it('weightTrace is always a complete normalized distribution', () => {
    // Pick the first exemplar to verify the trace shape
    const ex = exemplars[0]!
    const interpretation = interpretTurn(ex.user, [])

    const { weightTrace } = selectStrategy({
      interpretation,
      patterns: interpretation.patterns,
      profile: makeNeutralProfile(),
      userInput: ex.user,
    })

    expect(weightTrace).toBeDefined()
    // All six modes must be present
    for (const mode of ALLOWED_STRATEGIES) {
      expect(weightTrace).toHaveProperty(mode)
      expect(typeof weightTrace[mode]).toBe('number')
    }
    // Probabilities sum to ~1 (allow floating point slack)
    const sum = Object.values(weightTrace).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 1)
  })
})

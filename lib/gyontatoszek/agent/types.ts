import type { BehaviorEvaluation, GyontatasMessage, PersistentRelationshipMemory, VBehaviorModulation } from '../types';

export type HiddenTraitName =
  | 'impulsive'
  | 'avoidant'
  | 'controlSeeking'
  | 'approvalSeeking'
  | 'ruminative'
  | 'noveltySeeking';

export interface TraitScore {
  value: number;
  confidence: number;
  updatedAt: string;
}

export interface Pattern {
  key: string;
  name: string;
  category: 'intent' | 'emotion' | 'topic' | 'risk';
  score: number;
  confidence: number;
  emotionalWeight: number;
  occurrences: number;
  lastSeenAt: string;
  evidence: string[];
  summary: string;
}

export interface UserProfile {
  id: string;
  email?: string | null;
  familiarity: number;
  trust: number;
  irritation: number;
  openness: number;
  recurringTopics: string[];
  relationalStance: 'wary' | 'guarded' | 'engaged' | 'open' | 'volatile';
  hiddenTraits: Record<HiddenTraitName, TraitScore>;
  patternMemory: Pattern[];
  lastInteractionAt?: string | null;
}

export interface MemoryEvent {
  id: string;
  userId?: string;
  conversationId: string;
  kind: 'message' | 'pattern' | 'repair' | 'rupture' | 'breakthrough' | 'summary';
  summary: string;
  topics: string[];
  confidence: number;
  emotionalWeight: number;
  novelty: number;
  salience: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface InterpretationResult {
  normalizedInput: string;
  primaryIntent: 'confession' | 'question' | 'challenge' | 'connection' | 'self_reference' | 'unknown';
  emotionalTone: 'neutral' | 'vulnerable' | 'guarded' | 'tense' | 'playful';
  patterns: Pattern[];
  extractedTopics: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export type StrategyMode =
  | 'mirror'
  | 'confront'
  | 'destabilize'
  | 'validate_then_twist'
  | 'challenge_action'
  | 'withhold';

export interface StrategyState {
  interpretation: InterpretationResult;
  patterns: Pattern[];
  profile: UserProfile;
  modulation?: VBehaviorModulation | null;
  userInput?: string;
  historyLength?: number;
  behavior?: BehaviorEvaluation;
  runtimeState?: Partial<RuntimeState>;
  lastStrategy?: StrategyMode | null;
  recentStrategies?: StrategyMode[];
}

export interface Strategy {
  mode: StrategyMode;
  objective: string;
  reason: string;
  tone: 'cold' | 'neutral' | 'warm' | 'sharp';
  depth: 'short' | 'medium' | 'deep';
  disclosure: 'guarded' | 'selective' | 'open';
  constraints: string[];
  promptNotes: string[];
}

export interface RuntimeState {
  emotion: string;
  intensity: number;
  intent: string;
  patterns: string[];
  traits: string[];
  strategy: string;
}

export interface RetrievedMemoryFragment {
  id: string | number;
  text: string;
  preview: string;
  themes: string[];
  tone: string;
  intensity: number;
  score: number;
  similarity: number;
  source_file: string;
  chunk_index: number;
  is_signature: boolean;
}

export interface AgentAction {
  type: 'challenge';
  instruction: string;
  follow_up: boolean;
}

export interface DistortionHook {
  id: string;
  type: 'unexpected_recall' | 'delayed_callback' | 'pattern_slip';
  topic: string;
  cue: string;
  sourceEventId: string;
  strength: number;
  turnsUntilEligible: number;
  createdAt: string;
  triggered: boolean;
}

export interface BehavioralExemplar {
  id: string;
  user: string;
  intent: string;
  emotion: string;
  expected_strategy: string;
  v_response: string;
}

export interface DistortionState {
  pendingHooks: DistortionHook[];
  cooldownUntilTurn: number;
  turnCount: number;
  lastCue?: string;
}

export interface AgentTurnContext {
  input: string;
  history: GyontatasMessage[];
  modulation?: VBehaviorModulation | null;
  persistedMemory: PersistentRelationshipMemory | null;
  interpretation: InterpretationResult;
  memoryEvents: MemoryEvent[];
  patternMemory: Pattern[];
  profile: UserProfile;
  runtimeState?: RuntimeState;
  ragContext?: RetrievedMemoryFragment[];
  strategy: Strategy;
  weightTrace?: Record<string, number>;
  action?: AgentAction | null;
  distortion?: DistortionHook | null;
  distortionState?: DistortionState;
  exemplars?: BehavioralExemplar[];
  behavior: BehaviorEvaluation;
}

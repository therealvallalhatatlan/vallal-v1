export const MAX_GYONTATAS_MESSAGE_LENGTH = 2000;
export const MAX_GYONTATAS_HISTORY_MESSAGES = 12;
export const GYONTATAS_HISTORY_PAGE_SIZE = 50;

export type GyontatasSenderRole = 'user' | 'assistant';

export interface VBehaviorModulation {
  alcohol: number;
  amphetamine: number;
  thc: number;
  dopamine: number;
}

export interface GyontatasRequest {
  confession: string;
  session_id: string;
  user_id?: string;
  user_email?: string | null;
  debug?: boolean;
  modulation?: VBehaviorModulation | null;
}

function clampModulationValue(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeBehaviorModulation(value: unknown): VBehaviorModulation | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const normalized: VBehaviorModulation = {
    alcohol: clampModulationValue(record.alcohol),
    amphetamine: clampModulationValue(record.amphetamine),
    thc: clampModulationValue(record.thc),
    dopamine: clampModulationValue(record.dopamine),
  };

  const total = normalized.alcohol + normalized.amphetamine + normalized.thc + normalized.dopamine;
  return total > 0 ? normalized : null;
}

export interface GyontatasConversation {
  id: string;
  session_id: string;
  user_id?: string | null;
  user_email?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface GyontatasMessage {
  id: string;
  conversation_id: string;
  sender_role: GyontatasSenderRole;
  body: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface GyontatasMessageInsert {
  conversation_id: string;
  sender_role: GyontatasSenderRole;
  body: string;
  model?: string | null;
  safety_flag?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GyontatasHistoryResponse {
  session_id: string;
  messages: GyontatasMessage[];
}

export type CharacterStateName =
  | 'baseline'
  | 'stimulated'
  | 'defensive'
  | 'confrontational'
  | 'rare-honesty'
  | 'withdrawn'
  | 'testing';

export type ResponseStrategy =
  | 'deflect'
  | 'distort'
  | 'challenge'
  | 'tease'
  | 'mirror'
  | 'reveal'
  | 'compress'
  | 'expand'
  | 'soft-refuse'
  | 'contradict';

export interface RelationshipMemory {
  familiarity: number;
  trust: number;
  irritation: number;
  repetition: number;
  emotional_tone: 'neutral' | 'warm' | 'volatile' | 'vulnerable' | 'guarded';
  recurring_topics: string[];
  last_trigger?: string | null;
}

export interface PersistentRelationshipMemory extends RelationshipMemory {
  state_name?: CharacterStateName | null;
  state_intensity?: number | null;
  updated_at?: string | null;
}

export interface CharacterState {
  name: CharacterStateName;
  intensity: number;
  momentum: number;
  volatility: number;
  honestyWindow: boolean;
}

export interface BehaviorDecision {
  strategy: ResponseStrategy;
  secondaryStrategy?: ResponseStrategy | null;
  engageDepth: 'low' | 'medium' | 'high';
  disclosure: 'guarded' | 'selective' | 'open';
  contradiction: 'low' | 'medium' | 'high';
  rationale: string;
}

export interface ResponseShape {
  verbosity: 'short' | 'medium' | 'long';
  warmth: 'cold' | 'tempered' | 'warm';
  profanityCap: 'none' | 'low' | 'moderate';
  humor: 'dry' | 'sharp' | 'playful' | 'minimal';
}

export interface BehaviorEvaluation {
  state: CharacterState;
  memory: RelationshipMemory;
  persistentMemory: PersistentRelationshipMemory;
  decision: BehaviorDecision;
  responseShape: ResponseShape;
  promptDirectives: string[];
  generation: {
    temperature: number;
    topP: number;
  };
}

export type SafetyResult =
  | { safe: true }
  | { safe: false; reason: string; fallback: string };

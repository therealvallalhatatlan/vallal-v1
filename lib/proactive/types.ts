import type { PersistentRelationshipMemory } from '../gyontatoszek/types';

export type ProactiveTriggerType =
  | 'inactivity'
  | 'avoidance'
  | 'repetition'
  | 'emotional_spike'
  | 'action_followup';

export interface ProactiveLogEntry {
  sentAt: string;
  trigger: ProactiveTriggerType;
}

export interface ProactiveCooldownStatus {
  blocked: boolean;
  last24hCount: number;
  last7dCount: number;
}

export interface ProactiveTriggerDecision {
  type: ProactiveTriggerType;
  reason: string;
  score: number;
  hoursSinceLastUserMessage: number;
}

export interface ProactiveEvaluationInput {
  now?: string | Date;
  conversationId: string;
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  lastMessageAt?: string | null;
  lastUserMessageAt?: string | null;
  lastAssistantMessageAt?: string | null;
  recentUserMessages: string[];
  relationshipMemory: PersistentRelationshipMemory | null;
  pendingAction?: boolean;
  recentProactiveLog?: ProactiveLogEntry[];
}

export interface ProactiveEvaluationResult {
  eligible: boolean;
  reason: string;
  trigger: ProactiveTriggerDecision | null;
  cooldown: ProactiveCooldownStatus;
}

export interface ProactiveMessageBuildInput {
  evaluation: ProactiveEvaluationResult;
  relationshipMemory: PersistentRelationshipMemory | null;
  recentUserMessages: string[];
  userEmail?: string | null;
}

export interface ProactiveRunItem {
  conversationId: string;
  userId?: string | null;
  sessionId: string;
  eligible: boolean;
  reason: string;
  trigger: ProactiveTriggerType | null;
  preview?: string | null;
  sent: boolean;
}

export interface ProactiveRunResult {
  dryRun: boolean;
  scanned: number;
  eligible: number;
  sent: number;
  items: ProactiveRunItem[];
}

// lib/live/auth.ts
import { nanoid } from 'nanoid';
import { getEventBySlug } from './events';

export type Role = 'viewer' | 'participant' | 'admin';

export function sanitizeDisplayName(name: string): string {
  return name.replace(/[^\w\s\-\u00C0-\u017F]/g, '').trim().slice(0, 32);
}

export function generateIdentity(slug: string, role: Role, displayName: string): string {
  // For MVP: use nanoid for uniqueness, can be replaced with a hash for stability
  return `${slug}-${role}-${nanoid(10)}`;
}

export function validateParticipantKey(key: string | undefined): boolean {
  return !!key && key === process.env.LIVEKIT_PARTICIPANT_KEY;
}

export function validateAdminKey(key: string | undefined): boolean {
  return !!key && key === process.env.LIVEKIT_ADMIN_KEY;
}

export function validateRoleAccess(role: Role, key: string | undefined): boolean {
  if (role === 'viewer') return true;
  if (role === 'participant') return validateParticipantKey(key);
  if (role === 'admin') return validateAdminKey(key);
  return false;
}

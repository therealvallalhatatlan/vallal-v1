// lib/live/auth.ts
import { nanoid } from 'nanoid';

export type Role = 'viewer' | 'broadcaster';

export function sanitizeDisplayName(name: string): string {
  return name.replace(/[^\w\s\-\u00C0-\u017F]/g, '').trim().slice(0, 32);
}

export function generateIdentity(role: Role): string {
  return `${role}-${nanoid(8)}`;
}

export function validateBroadcasterKey(key: string | undefined): boolean {
  const expected = process.env.LIVEKIT_BROADCASTER_KEY;
  return !!expected && !!key && key === expected;
}

export function validateRoleAccess(role: Role, key: string | undefined): boolean {
  if (role === 'viewer') return true;
  if (role === 'broadcaster') return validateBroadcasterKey(key);
  return false;
}

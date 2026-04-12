// lib/live/auth.ts
import { nanoid } from 'nanoid';

export type Role = 'viewer' | 'broadcaster';

export function sanitizeDisplayName(name: string): string {
  return name.replace(/[^\w\s\-\u00C0-\u017F]/g, '').trim().slice(0, 32);
}

export function generateIdentity(role: Role): string {
  return `${role}-${nanoid(8)}`;
}

export function validateRoleAccess(role: Role): boolean {
  return role === 'viewer' || role === 'broadcaster';
}

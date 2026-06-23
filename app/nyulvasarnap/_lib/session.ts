"use client";

import type { NyulIdentitySession } from "./types";

const SESSION_KEY = "nyulvasarnap.identity.v1";

export function getNyulSession(): NyulIdentitySession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NyulIdentitySession;
    if (!parsed.identityToken || !parsed.publicId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setNyulSession(session: NyulIdentitySession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearNyulSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function generatePublicId(): string {
  const serial = Math.floor(Math.random() * 9000 + 1000);
  return `RABBIT-${serial}`;
}

export function buildIdentity(displayName: string): NyulIdentitySession {
  const normalizedDisplayName = displayName.trim().toUpperCase();

  return {
    identityToken: crypto.randomUUID(),
    publicId: generatePublicId(),
    displayName: normalizedDisplayName,
    createdAt: new Date().toISOString(),
  };
}

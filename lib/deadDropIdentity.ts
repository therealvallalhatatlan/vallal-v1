"use client";

import { DEAD_DROP_ALIAS_STORAGE_KEY } from "@/lib/deadDrops";

const PREFIXES = [
  "OPERATOR",
  "SECTOR",
  "GHOST",
  "NEON",
  "PROXY",
  "NODE",
  "ECHO",
  "NULL",
  "CIPHER",
  "SIGNAL",
];

function randomAlias() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)] ?? "OPERATOR";
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${prefix}_${suffix}`;
}

export function getOrCreateDeadDropAlias() {
  if (typeof window === "undefined") return "OPERATOR_73";

  const existing = window.localStorage.getItem(DEAD_DROP_ALIAS_STORAGE_KEY);
  if (existing) return existing;

  const nextAlias = randomAlias();
  window.localStorage.setItem(DEAD_DROP_ALIAS_STORAGE_KEY, nextAlias);
  return nextAlias;
}

export function regenerateDeadDropAlias() {
  const nextAlias = randomAlias();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(DEAD_DROP_ALIAS_STORAGE_KEY, nextAlias);
  }
  return nextAlias;
}
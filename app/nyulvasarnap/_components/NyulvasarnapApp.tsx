"use client";

import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import IdentityGenerator from "./IdentityGenerator";
import { buildIdentity, clearNyulSession, generatePublicId, getNyulSession, setNyulSession } from "../_lib/session";
import { ensureIdentity } from "../_lib/supabase";
import type { NyulIdentitySession } from "../_lib/types";
import styles from "./nyulvasarnap.module.css";

type GateState = "loading" | "identity" | "dashboard";

export default function NyulvasarnapApp() {
  const [gateState, setGateState] = useState<GateState>("loading");
  const [session, setSession] = useState<NyulIdentitySession | null>(null);
  const [identityError, setIdentityError] = useState("");
  const [suggestedId, setSuggestedId] = useState("");

  useEffect(() => {
    setSuggestedId(generatePublicId());

    const existing = getNyulSession();
    if (!existing) {
      setGateState("identity");
      return;
    }

    setSession(existing);
    setGateState("dashboard");

    void ensureIdentity(existing).catch(() => {
      clearNyulSession();
      setSession(null);
      setIdentityError("A korabbi PUBLIC ID mar nem hasznalhato. Valassz ujat.");
      setSuggestedId(generatePublicId());
      setGateState("identity");
    });
  }, []);

  async function handleIdentitySubmit(publicId: string) {
    const normalizedPublicId = publicId.trim().toUpperCase();
    const next = buildIdentity(normalizedPublicId);
    next.publicId = normalizedPublicId;
    next.displayName = normalizedPublicId;

    try {
      await ensureIdentity(next);
    } catch (error) {
      setIdentityError(error instanceof Error ? error.message : "Identity hiba tortent.");
      setSuggestedId(generatePublicId());
      return;
    }

    setIdentityError("");
    setNyulSession(next);
    setSession(next);
    setGateState("dashboard");
  }

  function handleResetIdentity() {
    clearNyulSession();
    setSession(null);
    setIdentityError("");
    setSuggestedId(generatePublicId());
    setGateState("identity");
  }

  if (gateState === "loading") {
    return (
      <main className={styles.bootScreen}>
        <p>BOOTING /NYULVASARNAP...</p>
      </main>
    );
  }

  if (gateState === "identity") {
    return (
      <main className={styles.pageRoot}>
        <IdentityGenerator suggestedId={suggestedId || generatePublicId()} errorMessage={identityError} onSubmit={handleIdentitySubmit} />
      </main>
    );
  }

  if (!session) {
    return (
      <main className={styles.bootScreen}>
        <p>Session hiba. Frissitsd az oldalt.</p>
      </main>
    );
  }

  return <Dashboard session={session} onResetIdentity={handleResetIdentity} />;
}

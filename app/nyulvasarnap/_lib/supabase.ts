"use client";

import { createClient } from "@/lib/browser";
import type { NyulFeatureKey, NyulIdentitySession } from "./types";

export type NyulDbClient = {
  from: (...args: unknown[]) => any;
  rpc: (...args: unknown[]) => any;
  channel: (...args: unknown[]) => any;
  removeChannel: (...args: unknown[]) => any;
};

export function getNyulDbClient(): NyulDbClient | null {
  const client = createClient() as Partial<NyulDbClient>;

  if (
    typeof client.from !== "function" ||
    typeof client.rpc !== "function" ||
    typeof client.channel !== "function" ||
    typeof client.removeChannel !== "function"
  ) {
    return null;
  }

  return client as NyulDbClient;
}

export async function ensureIdentity(session: NyulIdentitySession): Promise<void> {
  const db = getNyulDbClient();
  if (!db) return;

  const existingByPublicId = await db
    .from("nyul_identities")
    .select("identity_token")
    .eq("public_id", session.publicId)
    .limit(1)
    .maybeSingle();

  if (existingByPublicId.error) {
    throw new Error(existingByPublicId.error.message);
  }

  if (
    existingByPublicId.data?.identity_token &&
    existingByPublicId.data.identity_token !== session.identityToken
  ) {
    throw new Error("Ez a PUBLIC ID mar foglalt. Valassz masikat.");
  }

  const result = await db.from("nyul_identities").upsert(
    {
      identity_token: session.identityToken,
      public_id: session.publicId,
      display_name: session.displayName,
    },
    { onConflict: "identity_token" }
  );

  if (result.error) {
    if (result.error.message.includes("nyul_identities_public_id_key")) {
      throw new Error("Ez a PUBLIC ID mar foglalt. Valassz masikat.");
    }
    throw new Error(result.error.message);
  }
}

export async function markFeatureComplete(session: NyulIdentitySession, featureKey: NyulFeatureKey): Promise<void> {
  const response = await fetch("/api/nyulvasarnap/progress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identityToken: session.identityToken,
      featureKey,
    }),
  });

  let payload: { ok?: boolean; error?: string } | null = null;

  try {
    payload = (await response.json()) as { ok?: boolean; error?: string };
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "progress_write_failed");
  }
}

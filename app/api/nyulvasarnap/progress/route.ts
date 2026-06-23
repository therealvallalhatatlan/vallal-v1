import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FEATURE_KEYS = new Set([
  "rabbit-network",
  "person-finder",
  "fourth-volume",
  "meet-someone",
]);

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { identityToken, featureKey } = payload as {
    identityToken?: unknown;
    featureKey?: unknown;
  };

  const normalizedIdentityToken = typeof identityToken === "string" ? identityToken.trim() : "";
  const normalizedFeatureKey = typeof featureKey === "string" ? featureKey.trim() : "";

  if (!normalizedIdentityToken || !FEATURE_KEYS.has(normalizedFeatureKey)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const identityLookup = await admin
    .from("nyul_identities")
    .select("identity_token")
    .eq("identity_token", normalizedIdentityToken)
    .maybeSingle();

  if (identityLookup.error) {
    console.error("[nyulvasarnap/progress] identity lookup failed", identityLookup.error);
    return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
  }

  if (!identityLookup.data) {
    return NextResponse.json({ ok: false, error: "identity_not_found" }, { status: 404 });
  }

  const upsertResult = await admin.from("nyul_feature_progress").upsert(
    {
      identity_token: normalizedIdentityToken,
      feature_key: normalizedFeatureKey,
    },
    {
      onConflict: "identity_token,feature_key",
      ignoreDuplicates: true,
    }
  );

  if (upsertResult.error) {
    console.error("[nyulvasarnap/progress] progress upsert failed", upsertResult.error);
    return NextResponse.json({ ok: false, error: upsertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
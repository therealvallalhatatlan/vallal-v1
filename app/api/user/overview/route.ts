import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = parseBearerToken(req.headers);
  if (!token) {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 401 });
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const [authUserRes, userRowRes, claimsRes, shadowProfilesRes] = await Promise.all([
    db.auth.admin.getUserById(user.id),
    db
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    db
      .from("claims")
      .select(
        "id, user_id, spot_id, status, user_image_url, comment, created_at, spot:sticker_spots(id, title, status, remaining_quantity, total_quantity, lat, lng, radius_claim, radius_visibility)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("shadow_profiles")
      .select("session_id, sponsor_id, insider_enabled, drop_credits, banned_at, burn_reason, metadata, created_at, updated_at")
      .contains("metadata", { uid: user.id })
      .order("updated_at", { ascending: false }),
  ]);

  if (userRowRes.error || claimsRes.error || shadowProfilesRes.error || authUserRes.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "overview_query_failed",
        details: {
          user: userRowRes.error?.message ?? null,
          claims: claimsRes.error?.message ?? null,
          shadowProfiles: shadowProfilesRes.error?.message ?? null,
          auth: authUserRes.error?.message ?? null,
        },
      },
      { status: 500 }
    );
  }

  const shadowProfiles = shadowProfilesRes.data ?? [];
  const sessionIds = shadowProfiles.map((row) => row.session_id).filter(Boolean);

  let shadowClaims: Array<Record<string, unknown>> = [];
  if (sessionIds.length > 0) {
    const shadowClaimsRes = await db
      .from("shadow_drop_claims")
      .select(
        "id, drop_id, session_id, claimed_at, metadata, drop:shadow_drops(id, code_name, is_claimed, claimed_at, burn_after, claimed_by_session_id, geofence_meters, created_at, metadata)"
      )
      .in("session_id", sessionIds)
      .order("claimed_at", { ascending: false })
      .limit(200);

    if (shadowClaimsRes.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "shadow_claims_query_failed",
          details: shadowClaimsRes.error.message,
        },
        { status: 500 }
      );
    }

    shadowClaims = (shadowClaimsRes.data ?? []) as Array<Record<string, unknown>>;
  }

  const claims = claimsRes.data ?? [];
  const claimSummary = {
    total: claims.length,
    pending: claims.filter((c) => c.status === "pending").length,
    accepted: claims.filter((c) => c.status === "accepted").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };

  const phantomSummary = {
    sessions: shadowProfiles.length,
    totalCredits: shadowProfiles.reduce((sum, row) => sum + Number(row.drop_credits ?? 0), 0),
    claimedDrops: shadowClaims.length,
    activeSessions: shadowProfiles.filter((row) => !row.banned_at).length,
    bannedSessions: shadowProfiles.filter((row) => !!row.banned_at).length,
  };

  const authUser = authUserRes.data.user;

  return NextResponse.json({
    ok: true,
    overview: {
      generated_at: new Date().toISOString(),
      auth: {
        id: authUser?.id ?? user.id,
        email: authUser?.email ?? user.email,
        created_at: authUser?.created_at ?? null,
        last_sign_in_at: authUser?.last_sign_in_at ?? null,
        app_metadata: authUser?.app_metadata ?? null,
        user_metadata: authUser?.user_metadata ?? null,
      },
      database: {
        user: userRowRes.data ?? null,
        claims,
        claim_summary: claimSummary,
      },
      phantom: {
        profiles: shadowProfiles,
        claims: shadowClaims,
        summary: phantomSummary,
      },
    },
  });
}

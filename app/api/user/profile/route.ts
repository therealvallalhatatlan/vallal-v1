// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserRoleByEmail } from "@/lib/auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const adminClient = supabaseAdmin();

const NICKNAME_MIN = 3;
const NICKNAME_MAX = 20;
const RESERVED_NICKNAMES = new Set([
  "admin",
  "administrator",
  "system",
  "moderator",
  "mod",
  "support",
]);

function normalizeNickname(value: string): string {
  return value.trim().toLocaleLowerCase("hu-HU");
}

function isValidNickname(value: string): boolean {
  return /^[\p{L}\p{N}_-]+$/u.test(value);
}

// PATCH /api/user/profile - Update user's nickname
export async function PATCH(req: Request) {
  try {
    // Check authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
    }

    // Parse body
    const json = await req.json();
    const rawNickname = (json.nickname || "").toString();
    const nickname = normalizeNickname(rawNickname);

    if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
      return NextResponse.json(
        { ok: false, error: `A felhasznalonev ${NICKNAME_MIN}-${NICKNAME_MAX} karakter kozott kell legyen` }, 
        { status: 400 }
      );
    }

    if (!isValidNickname(nickname)) {
      return NextResponse.json(
        { ok: false, error: "Csak betu, szam, _ es - karakter hasznalhato" },
        { status: 400 }
      );
    }

    if (RESERVED_NICKNAMES.has(nickname)) {
      return NextResponse.json(
        { ok: false, error: "Ez a felhasznalonev foglalt" },
        { status: 409 }
      );
    }

    // Check if user.email exists (required by database)
    if (!user.email) {
      console.error("User email is missing for user:", user.id);
      return NextResponse.json(
        { ok: false, error: "User email is missing" }, 
        { status: 400 }
      );
    }

    // First, check if user profile exists by ID
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id, email")
      .eq("id", user.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error on no results

    let legacyProfileId: string | null = null;
    let legacyProfileEmail: string | null = null;

    if (!existingUser) {
      // Never delete a legacy profile directly. If the same email belongs to
      // another public.users row, reconcile that legacy identity first so
      // orders/shop orders/book copies are moved before the old row is removed.
      const { data: emailCheck, error: emailCheckError } = await supabase
        .from("users")
        .select("id, email")
        .ilike("email", user.email)
        .limit(2);

      if (emailCheckError) {
        console.error("Email identity lookup error:", emailCheckError);
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }

      if (emailCheck && emailCheck.length > 1) {
        console.error("Multiple public profiles match email:", user.email);
        return NextResponse.json(
          { ok: false, error: "multiple_profiles_same_email" },
          { status: 409 }
        );
      }

      const matchedProfile = emailCheck?.[0] ?? null;
      if (matchedProfile && matchedProfile.id !== user.id) {
        legacyProfileId = matchedProfile.id;
        legacyProfileEmail = matchedProfile.email;
      }
    }

    const { data: nicknameOwner, error: nicknameCheckError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (nicknameCheckError) {
      console.error("Nickname uniqueness check error:", nicknameCheckError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    // The nickname may already belong to the legacy profile that is about to
    // be reconciled. In that case it is safe to transfer/overwrite it.
    if (
      nicknameOwner &&
      nicknameOwner.id !== user.id &&
      nicknameOwner.id !== legacyProfileId
    ) {
      return NextResponse.json({ ok: false, error: "nickname_taken" }, { status: 409 });
    }

    let data, error;

    if (existingUser) {
      // User exists - UPDATE only nickname.
      console.log("Updating existing user:", user.id);
      const result = await supabase
        .from("users")
        .update({ nickname })
        .eq("id", user.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else if (legacyProfileId) {
      console.log(
        "Reconciling legacy user profile before saving nickname:",
        legacyProfileId,
        legacyProfileEmail
      );

      const { data: reconciliation, error: reconcileError } = await adminClient.rpc(
        "reconcile_legacy_user",
        {
          p_legacy_user_id: legacyProfileId,
          p_canonical_user_id: user.id,
          p_note: "Automatic reconciliation before authenticated profile save",
        }
      );

      if (reconcileError) {
        console.error("Legacy user reconciliation error:", reconcileError);
        return NextResponse.json(
          { ok: false, error: "identity_reconciliation_failed" },
          { status: 500 }
        );
      }

      if (!reconciliation?.ok) {
        console.error("Legacy user reconciliation returned non-ok:", reconciliation);
        return NextResponse.json(
          { ok: false, error: "identity_reconciliation_failed" },
          { status: 500 }
        );
      }

      // The reconciliation function creates the canonical public profile when
      // it does not exist. Apply the nickname requested by the current user.
      const result = await supabase
        .from("users")
        .update({ nickname })
        .eq("id", user.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // No existing profile and no legacy profile with this email.
      console.log("Inserting new user:", user.id);

      const result = await supabase
        .from("users")
        .insert({
          id: user.id,
          email: user.email,
          nickname,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      if ((error as any)?.code === "23505") {
        return NextResponse.json({ ok: false, error: "nickname_taken" }, { status: 409 });
      }
      console.error("Supabase operation error:", error);
      console.error("User data:", { id: user.id, email: user.email, nickname });
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// GET /api/user/profile?userId=xxx - Get public profile info
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "userId required" }, 
        { status: 400 }
      );
    }

    // Fetch user's public profile (nickname from DB)
    const { data, error } = await supabase
      .from("users")
      .select("id, nickname")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase select error", error);
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    const { count: foundCount, error: foundError } = await supabase
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("status", ["pending", "accepted"]);

    if (foundError) {
      console.error("Supabase foundCount error", foundError);
      return NextResponse.json({ ok: false, error: "db_error", details: foundError.message }, { status: 500 });
    }

    const { count: acceptedCount, error: acceptedError } = await supabase
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (acceptedError) {
      console.error("Supabase acceptedCount error", acceptedError);
      return NextResponse.json({ ok: false, error: "db_error", details: acceptedError.message }, { status: 500 });
    }

    // Fetch avatar from Auth user metadata
    let avatar_url: string | null = null;
    let authEmail: string | null = null;
    try {
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
      authEmail = authUser?.user?.email ?? null;
      if (!authError && authUser?.user?.user_metadata?.avatar_url) {
        avatar_url = authUser.user.user_metadata.avatar_url;
      }
    } catch (err) {
      console.warn('Failed to fetch avatar from auth:', err);
    }

    return NextResponse.json({
      ok: true,
      profile: {
        ...data,
        avatar_url,
        score: foundCount ?? 0,
        accepted: acceptedCount ?? 0,
        role: getUserRoleByEmail(authEmail),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

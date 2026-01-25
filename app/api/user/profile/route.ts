// app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const nickname = (json.nickname || "").toString().trim();

    if (nickname.length < 1 || nickname.length > 50) {
      return NextResponse.json(
        { ok: false, error: "Nickname 1-50 karakter között kell lennie" }, 
        { status: 400 }
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

    let data, error;

    if (existingUser) {
      // User exists - UPDATE only nickname (don't touch email to avoid unique constraint conflict)
      console.log("Updating existing user:", user.id);
      const result = await supabase
        .from("users")
        .update({ nickname })
        .eq("id", user.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // User doesn't exist - INSERT with email
      console.log("Inserting new user:", user.id);
      
      // Check if email already exists with different user_id (edge case: duplicate accounts)
      const { data: emailCheck } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", user.email)
        .maybeSingle();
      
      if (emailCheck && emailCheck.id !== user.id) {
        console.error("Email already exists with different user_id:", emailCheck);
        // Delete the old record and insert new one (migration fix)
        await supabase.from("users").delete().eq("email", user.email);
      }
      
      const result = await supabase
        .from("users")
        .insert({ 
          id: user.id, 
          email: user.email,
          nickname 
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
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

    // Fetch user's public profile (only nickname)
    const { data, error } = await supabase
      .from("users")
      .select("id, nickname")
      .eq("id", userId)
      .maybeSingle(); // Use maybeSingle instead of single

    if (error) {
      console.error("Supabase select error", error);
      return NextResponse.json({ ok: false, error: "db_error", details: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, profile: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

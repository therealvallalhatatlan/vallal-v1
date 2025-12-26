import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/reader-access
 * Checks if the authenticated user has access to the reader (exists in "users" table).
 * Returns { hasAccess: boolean }
 */
export async function GET(req: NextRequest) {
  // 1. Get bearer token from Authorization header
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ hasAccess: false, error: "missing_token" }, { status: 401 });
  }

  // 2. Verify token and get user
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return NextResponse.json({ hasAccess: false, error: "unauthenticated" }, { status: 401 });
  }

  let email = (data.user.email || "").toString().trim().toLowerCase();
  // Normalize email: strip everything after '+' (plus-addressing) for comparison
  email = email.split("+")[0];
  if (!email) {
    return NextResponse.json({ hasAccess: false, error: "no_email" }, { status: 403 });
  }

  // 3. Check if user exists in "users" table (use exact equality on stored normalized email)
  try {
    const admin = supabaseAdmin();
    const { data: userList, error: allowedErr } = await admin
      .from("users")
      .select("id")
      .eq("email", email);

    if (allowedErr) {
      console.error("[reader-access] users entitlement query failed", allowedErr);
      return NextResponse.json({ hasAccess: false, error: "server_error" }, { status: 500 });
    }

    // If no exact match, try case-insensitive ilike as fallback (in case stored email differs in case)
    let hasAccess = !!(userList && userList.length > 0);
    if (!hasAccess) {
      const { data: ilikelist, error: ilikeerr } = await admin
        .from("users")
        .select("id")
        .ilike("email", email)
        .limit(1);
      if (!ilikeerr && ilikelist && ilikelist.length > 0) {
        hasAccess = true;
      }
    }
    return NextResponse.json({ hasAccess, email });
  } catch (err) {
    console.error("[reader-access] entitlement check crashed", err);
    return NextResponse.json({ hasAccess: false, error: "server_misconfigured" }, { status: 500 });
  }
}

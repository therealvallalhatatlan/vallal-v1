import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, parseBearerToken } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserBadges } from "@/lib/userBadges";

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

  const { data: authUser, error } = await supabaseAdmin().auth.admin.getUserById(user.id);
  if (error) {
    return NextResponse.json({ ok: false, error: "user_lookup_failed" }, { status: 500 });
  }

  const badges = await getUserBadges(user.id, authUser.user?.email ?? user.email ?? null);

  return NextResponse.json({ ok: true, badges });
}

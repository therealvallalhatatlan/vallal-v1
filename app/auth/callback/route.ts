// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectParam = requestUrl.searchParams.get("redirect") || "/reader";

  if (code) {
    // ⬇⬇ Itt volt a hiba: hiányzott az await
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase exchangeCodeForSession hiba:", error.message);
      // opcionálisan:
      // return NextResponse.redirect(new URL("/login?error=auth", requestUrl));
    }
  }

  // base URL – legyen konzisztens env-ből
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`;

  // védjük magunkat: csak relatív path-ot engedjünk
  const safeRedirect =
    redirectParam.startsWith("http") || redirectParam.startsWith("//")
      ? "/reader"
      : redirectParam;

  return NextResponse.redirect(new URL(safeRedirect, siteUrl));
}

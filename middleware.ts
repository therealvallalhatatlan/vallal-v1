// middleware.ts
// - Stripe webhook és statikus assetek kihagyása, hogy ne basszuk szét őket

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.SECRET_ACCESS_COOKIE_NAME ?? "secret_access";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const path = pathname.startsWith("/") ? pathname.slice(1) : pathname;

  // 1. PASSWORD PROTECTION /secret-area alatt
  // ide rakod a csak-jelszós aloldalt (lehet más route is, csak írd át)
  if (pathname.startsWith("/secret-area")) {
    const cookie = req.cookies.get(COOKIE_NAME);

    // ha nincs cookie vagy rossz az értéke → dobjuk a login oldalra
    if (!cookie || cookie.value !== "1") {
      const url = req.nextUrl.clone();
      url.pathname = "/secret"; // login/jelszó oldal
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. EREDTI KIZÁRÁSOK – EZEKHEZ NEM NYULTAM
  if (
    !path ||
    path.includes("/") ||
    path.startsWith("api") ||
    path.startsWith("_next") ||
    path.startsWith("static") ||
    path.startsWith("assets") ||
    /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|map|txt|woff2?|xml)$/i.test(path) ||
    ["favicon.ico", "robots.txt", "sitemap.xml"].includes(path.toLowerCase())
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// Matcher:
// A middleware CSAK olyan kéréseknél fusson le, ahol értelme van a slug redirectnek.
// Megmarad az eredeti globális matcher.
export const config = {
  matcher: ["/:path*"],
};

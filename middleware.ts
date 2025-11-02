// middleware.ts
// - Stripe webhook és statikus assetek kihagyása, hogy ne basszuk szét őket

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ...existing code...

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const path = pathname.startsWith("/") ? pathname.slice(1) : pathname

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
    return NextResponse.next()
  }

  return NextResponse.next()
}

// Matcher:
// A middleware CSAK olyan kéréseknél fusson le, ahol értelme van a slug redirectnek.
// Kizárjuk:
// - /api/**  (különösen /api/stripe/webhook)
// - /_next/** (Next.js belső assetek)
// - /static/**, /assets/** (statikus cuccok)
// - fájl jellegű hívások (.png, .jpg, .css, .js, .mp3 stb.)
// - favicon.ico, robots.txt, sitemap.xml stb.
//
// Maradnak a "publikus" első szintű route-ok, pl. /jezus-megszoktet
export const config = {
  matcher: ["/:path*"],
};

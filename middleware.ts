// middleware.ts — kizárjuk a Stripe webhookot a middleware-ből (különben 405/verify hibákat okozhat)
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Ha volt korábban bármi header-módosításod / auth-od, tedd vissza a NEXTRESPONSE.NEXT() ELÉ,
// de NE a /api/stripe/webhook útvonalra fusson rá.

export function middleware(_req: NextRequest) {
  // pass-through
  return NextResponse.next();
}

// Matcher: mindenre fusson, KIVÉVE:
// - api/stripe/webhook (Stripe POST)
// - Next statikus fájlok és assetek
export const config = {
  matcher: [
    // negative lookahead: kizárjuk az alábbiakat
    "/((?!api/stripe/webhook|_next/|static/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|map|txt|woff2?)$).*)",
  ],
};

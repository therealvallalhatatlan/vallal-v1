// middleware.ts
// - QR kódos régi slugok → új, számozott slugok redirectje (308 Permanent Redirect)
// - Stripe webhook és statikus assetek kihagyása, hogy ne basszuk szét őket

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Régi slug (ahogy a könyvben / QR-ben van) -> Új slug (számozott verzió)
const redirectMap: Record<string, string> = {
  // TÖLTSD KI PONTOSAN A LISTÁDAT:
  "jezus-megszoktet": "01-jezus-megszoktet",
  "teleki-ter": "02-teleki-ter",
  "utazas-fuegyhazara": "03-utazas-fuegyhazara",
  "tartozunk-egy-ukranak": "04-tartozunk-egy-ukranak",
  "bosnyak-ter": "05-bosnyak-ter",
  "ibolya-presszo": "06-ibolya-presszo",
  "elso-nap-a-paradicsomban": "07-elso-nap-a-paradicsomban",
  "a-mersekelten-hires": "08-a-mersekelten-hires",
  "bortonbe-kerulok": "09-bortonbe-kerulok",
  "agressziv-laci": "10-agressziv-laci",
  // stb…
  //
  // FONTOS:
  // - bal oldalon: az a slug, ami a könyvben / QR-ben szerepel (szám NÉLKÜL)
  // - jobb oldalon: az új path, számmal
  //
  // ha valamelyik nem változott (régi == új), NE tedd ide, felesleges
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // példa: "/jezus-megszoktet" -> "jezus-megszoktet"
  const slug = pathname.startsWith("/") ? pathname.slice(1) : pathname;

  // Ha üres ("/"), vagy több szintű útvonal (pl. "api/valami", "app/foo/bar"),
  // akkor nem próbáljuk redirectelni.
  // Ez megvédi az aloldalakat is (/music/1 stb.)
  if (!slug || slug.includes("/")) {
    return NextResponse.next();
  }

  const newSlug = redirectMap[slug];

  if (newSlug) {
    // átírjuk az URL-t az új sluggal
    const url = req.nextUrl.clone();
    url.pathname = `/${newSlug}`;

    // 308 Permanent Redirect:
    // - SEO-barát (search engine érti hogy végleges költözés)
    // - böngésző címsorában is az új URL fog megjelenni
    return NextResponse.redirect(url, 308);
  }

  // ha nincs match a táblában → normál működés
  return NextResponse.next();
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
  matcher: [
    // Ez annyit jelent nagyjából:
    // /valami
    // de NEM /api/... és NEM /_next/... stb.
    "/((?!api/|_next/|static/|assets/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|.*\\.(png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|map|txt|woff2?)$).*)",
  ],
};

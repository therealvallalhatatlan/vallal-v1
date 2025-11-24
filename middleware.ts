// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "vallalhatatlan_pass";
const COOKIE_VALUE_OK = "ok";

// Ezeket az útvonalakat NEM védjük jelszóval.
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/secret",    // jelszó bekérő oldal
  "/novellak",  // ha ezt szabadon akarod hagyni
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Next statikus cuccok menjenek szabadon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // PUBLIC route-ok szabadon (ide NEM rakjuk a /reader-t!)
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Ha van érvényes süti → mehet minden: /reader, /holnaptol-leallok, stb.
  const cookie = req.cookies.get(COOKIE_NAME);
  if (cookie?.value === COOKIE_VALUE_OK) {
    return NextResponse.next();
  }

  // Nincs jogosultság → irány a /secret, vigyük magunkkal, honnan jött.
  const url = req.nextUrl.clone();
  url.pathname = "/secret";
  url.searchParams.set("from", pathname);

  return NextResponse.redirect(url);
}

// Minden route-ra lefut, kivéve a Next statikus dolgokat.
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

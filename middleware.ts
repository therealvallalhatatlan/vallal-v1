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
  "/checkout",  // ha ezt szabadon akarod hagyni
  "/visualizer",
  "/video.mp4",
  "/gift",
  "/auth",      // Supabase magic link auth UI
  "/dashboard", // Supabase protected in-app; allow page load
]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Next statikus cuccok menjenek szabadon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" || 
    pathname === "/manifest.webmanifest" ||      // ⬅️ KELL
  pathname.startsWith("/icons") ||             // ⬅️ ikonok is kellenek
  pathname.endsWith(".png") ||                 // ⬅️ ha máshol hívjuk az ikonokat
  pathname.endsWith(".mp4") ||
  pathname.endsWith(".webmanifest") ||          // ⬅️ ha máshol hívjuk a manifestet
    pathname.startsWith("/api/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/img/") ||  // vagy pontosan /og.jpg
    pathname.startsWith("/videos/") ||
    pathname.startsWith("/playlists/") ||
    pathname === "/og.jpg" ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/service-worker.js")       
  ) {
    return NextResponse.next();
  }

  // PUBLIC route-ok szabadon (ide NEM rakjuk a /reader-t!)
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/gift/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/reader")
  ) {
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

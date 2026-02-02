// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Ezeket az útvonalakat NEM védjük jelszóval.
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/novellak",  // ha ezt szabadon akarod hagyni
  "/checkout",  // ha ezt szabadon akarod hagyni
  "/visualizer",
  "/video.mp4",
  "/gift",
  "/auth",      // Supabase magic link auth UI
  "/dashboard", // Supabase protected in-app; allow page load
  "/admin/inbox",     // admin felület
  "/messages",
  "/ar",       // AR oldal
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
    pathname.startsWith("/img/") ||  // vagy pontosan /og.png
    pathname.startsWith("/videos/") ||
    pathname.startsWith("/playlists/") ||
    pathname === "/og.png" ||
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
    pathname.startsWith("/reader") ||
    pathname.startsWith("/public-story")
  ) {
    return NextResponse.next();
  }

  // All other routes are now public - cookie protection removed
  return NextResponse.next();
}

// Minden route-ra lefut, kivéve a Next statikus dolgokat.
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

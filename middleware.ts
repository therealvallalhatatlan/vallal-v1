// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from './lib/supabaseAdmin';
import { isAdminEmail } from './lib/auth';

// In-memory cache for system mode (30 second TTL)
let cachedMode: { mode: 'SAFE' | 'READ_ONLY'; timestamp: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

async function getSystemMode(): Promise<'SAFE' | 'READ_ONLY'> {
  const now = Date.now();
  
  // Return cached value if still valid
  if (cachedMode && (now - cachedMode.timestamp) < CACHE_TTL) {
    return cachedMode.mode;
  }
  
  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('system_control')
      .select('mode')
      .eq('id', 1)
      .single();
    
    if (error || !data) {
      console.error('[Kill Switch] Failed to fetch system mode:', error);
      // Fail-safe: allow operations if DB is unreachable
      return 'SAFE';
    }
    
    const mode = data.mode as 'SAFE' | 'READ_ONLY';
    cachedMode = { mode, timestamp: now };
    return mode;
  } catch (err) {
    console.error('[Kill Switch] Exception fetching system mode:', err);
    return 'SAFE'; // Fail-safe
  }
}

async function isAdminRequest(req: NextRequest): Promise<boolean> {
  // Check for admin email in session/auth
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)/i);
    if (match) {
      try {
        const supabase = supabaseAdmin();
        const { data } = await supabase.auth.getUser(match[1].trim());
        if (data?.user?.email) {
          return isAdminEmail(data.user.email);
        }
      } catch {
        // Ignore auth errors
      }
    }
  }
  
  return false;
}

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

// Write operations to block in READ_ONLY mode
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

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

  // Check system mode for write operations
  if (WRITE_METHODS.has(method)) {
    const mode = await getSystemMode();
    
    if (mode === 'READ_ONLY') {
      // Check if this is an admin request
      const isAdmin = await isAdminRequest(req);
      
      // Block non-admin write operations in READ_ONLY mode
      if (!isAdmin) {
        // Special handling for auth endpoints - block entirely
        if (pathname.startsWith('/api/auth/') || pathname.startsWith('/auth/')) {
          return new NextResponse(
            JSON.stringify({ 
              error: 'System is in read-only mode. Authentication is temporarily disabled.' 
            }),
            { 
              status: 503, 
              headers: { 
                'Content-Type': 'application/json',
                'X-System-Mode': 'READ_ONLY'
              } 
            }
          );
        }
        
        // Block all other write operations
        return new NextResponse(
          JSON.stringify({ 
            error: 'System is in read-only mode. Write operations are temporarily disabled.',
            mode: 'READ_ONLY'
          }),
          { 
            status: 503, 
            headers: { 
              'Content-Type': 'application/json',
              'X-System-Mode': 'READ_ONLY',
              'Retry-After': '60'
            } 
          }
        );
      }
    }
  }

  // All other routes are now public - cookie protection removed
  return NextResponse.next();
}

// Minden route-ra lefut, kivéve a Next statikus dolgokat.
export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

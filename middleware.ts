// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from './lib/supabaseAdmin';
import { isAdminEmail } from './lib/auth';
import { TELEGRAM_MINI_APP_SESSION_COOKIE, verifyTelegramMiniAppSessionToken } from './lib/security/telegramMiniAppSession';

let cachedMode: { mode: 'SAFE' | 'READ_ONLY'; timestamp: number } | null = null;
const CACHE_TTL = 30000;

async function getSystemMode(): Promise<'SAFE' | 'READ_ONLY'> {
  const now = Date.now();

  if (cachedMode && (now - cachedMode.timestamp) < CACHE_TTL) return cachedMode.mode;

  try {
    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from('system_control')
      .select('mode')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('[Kill Switch] Failed to fetch system mode:', error);
      cachedMode = { mode: 'READ_ONLY', timestamp: now };
      return 'READ_ONLY';
    }

    const mode = data.mode === 'SAFE' || data.mode === 'READ_ONLY' ? data.mode : 'READ_ONLY';
    cachedMode = { mode, timestamp: now };
    return mode;
  } catch (err) {
    console.error('[Kill Switch] Exception fetching system mode:', err);
    cachedMode = { mode: 'READ_ONLY', timestamp: now };
    return 'READ_ONLY';
  }
}

async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) return false;

  const match = authHeader.match(/^Bearer\s+(.+)/i);
  if (!match) return false;

  try {
    const supabase = supabaseAdmin();
    const { data } = await supabase.auth.getUser(match[1].trim());
    return Boolean(data?.user?.email && isAdminEmail(data.user.email));
  } catch {
    return false;
  }
}

const PUBLIC_PATHS = new Set<string>([
  "/",
  "/novellak",
  "/checkout",
  "/visualizer",
  "/video.mp4",
  "/gift",
  "/auth",
  "/dashboard",
  "/admin/inbox",
  "/messages",
  "/ar",
]);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isTelegramAppRequest(req: NextRequest): boolean {
  const { searchParams } = req.nextUrl;
  const hasTelegramQuery =
    searchParams.has('tgWebAppData') ||
    searchParams.has('tgWebAppVersion') ||
    searchParams.has('tgWebAppPlatform') ||
    searchParams.has('tgWebAppStartParam');

  if (hasTelegramQuery) return true;

  const userAgent = (req.headers.get('user-agent') || '').toLowerCase();
  const referer = (req.headers.get('referer') || '').toLowerCase();
  return userAgent.includes('telegram') || referer.includes('t.me') || referer.includes('telegram.me') || referer.includes('web.telegram.org');
}

function isLocalDevRequest(req: NextRequest): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const host = (req.headers.get('host') || req.nextUrl.host || '').toLowerCase();
  return host.startsWith('localhost:') || host.startsWith('127.0.0.1:');
}

function applyTelegramGateHeaders(
  response: NextResponse,
  details: {
    decision: 'allow' | 'deny';
    reason: string;
    sessionCookie: 'present' | 'missing';
    session: 'valid' | 'invalid';
    telegramOrigin: 'yes' | 'no';
  },
): NextResponse {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('X-TG-Gate-Decision', details.decision);
  response.headers.set('X-TG-Gate-Reason', details.reason);
  response.headers.set('X-TG-Session-Cookie', details.sessionCookie);
  response.headers.set('X-TG-Session-Valid', details.session);
  response.headers.set('X-TG-Origin', details.telegramOrigin);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (pathname === '/telegram-app' || pathname.startsWith('/telegram-app/')) {
    if (isLocalDevRequest(req)) return NextResponse.next();

    const sessionToken = req.cookies.get(TELEGRAM_MINI_APP_SESSION_COOKIE)?.value;
    const hasSessionCookie = Boolean(sessionToken);
    const hasValidMiniAppSession = Boolean(await verifyTelegramMiniAppSessionToken(sessionToken));
    const isCheckoutRoute = pathname.startsWith('/telegram-app/checkout');
    const isTelegramOrigin = isTelegramAppRequest(req);

    if (!hasValidMiniAppSession && !isTelegramOrigin) {
      return applyTelegramGateHeaders(new NextResponse('Not Found', { status: 404 }), {
        decision: 'deny',
        reason: isCheckoutRoute ? 'checkout_requires_session_or_telegram_origin' : 'requires_session_or_telegram_origin',
        sessionCookie: hasSessionCookie ? 'present' : 'missing',
        session: hasValidMiniAppSession ? 'valid' : 'invalid',
        telegramOrigin: isTelegramOrigin ? 'yes' : 'no',
      });
    }

    return applyTelegramGateHeaders(NextResponse.next(), {
      decision: 'allow',
      reason: hasValidMiniAppSession ? 'valid_session' : 'telegram_origin_fallback',
      sessionCookie: hasSessionCookie ? 'present' : 'missing',
      session: hasValidMiniAppSession ? 'valid' : 'invalid',
      telegramOrigin: isTelegramOrigin ? 'yes' : 'no',
    });
  }

  // Stripe/Telegram webhooks are independently authenticated by their own signatures/secrets.
  if (pathname.startsWith("/api/telegram") || pathname.startsWith("/api/stripe")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/icons") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".mp4") ||
    pathname.endsWith(".webmanifest") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/img/") ||
    pathname.startsWith("/videos/") ||
    pathname.startsWith("/playlists/") ||
    pathname === "/og.png" ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/service-worker.js")
  ) {
    return NextResponse.next();
  }

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

  if (WRITE_METHODS.has(method)) {
    const mode = await getSystemMode();

    if (mode === 'READ_ONLY') {
      const isAdmin = await isAdminRequest(req);

      if (!isAdmin) {
        return new NextResponse(
          JSON.stringify({
            error: 'System is in read-only mode. Write operations are temporarily disabled.',
            mode: 'READ_ONLY',
          }),
          {
            status: 503,
            headers: {
              'Content-Type': 'application/json',
              'X-System-Mode': 'READ_ONLY',
              'Retry-After': '60',
              'Cache-Control': 'no-store',
            },
          },
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)"],
};

// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'vallalhatatlan_pass'
const COOKIE_VALUE_OK = 'ok'

// Ezeket az útvonalakat NEM védjük jelszóval.
const PUBLIC_PATHS = new Set<string>([
  '/',
  '/secret',      // a jelszó bekérő oldal
  '/novellak',    // ha ezt szabadon akarod hagyni
])

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Statikus / technikai cuccok: hagyjuk békén
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots') ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next()
  }

  // Publikus oldalak (home, /novellak, /secret, stb.)
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next()
  }

  // Csak az olyan oldalt védjük, ami egyetlen path-szegmens: /valami
  // (tehát NEM /valami/masik, nem /app/akarmi, stb.)
  const segments = pathname.split('/').filter(Boolean)
  const isSingleSegment = segments.length === 1

  if (!isSingleSegment) {
    return NextResponse.next()
  }

  // Ha már van jó cookie → mehet tovább
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (cookie === COOKIE_VALUE_OK) {
    return NextResponse.next()
  }

  // Nincs jogosultság → irány a /secret, és vigyük magunkkal honnan jöttünk
  const url = req.nextUrl.clone()
  url.pathname = '/secret'
  url.searchParams.set('from', pathname)

  return NextResponse.redirect(url)
}

// Csak root szintű pathokra fut ("/valami", de nem "/valami/masik").
export const config = {
  matcher: ['/:path*'],
}

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/', // allow homepage without auth
  '/sign-in(.*)',
  '/sign-up(.*)',
])

function manualIsPublic(pathname: string | undefined) {
  if (!pathname) return false
  if (pathname === '/') return true
  if (/^\/sign-in(.*)/.test(pathname)) return true
  if (/^\/sign-up(.*)/.test(pathname)) return true
  return false
}

export default clerkMiddleware(async (auth, req: NextRequest) => {
  // derive a pathname/string to use as fallback
  const pathname =
    (req as any)?.nextUrl?.pathname ||
    (typeof (req as any)?.url === 'string' ? new URL((req as any).url).pathname : '/')

  // Try multiple ways to ask createRouteMatcher whether this is public.
  let publicRoute = false
  try {
    // preferred: pass the request object (works with Clerk implementation expecting a Request-like)
    publicRoute = Boolean(isPublicRoute(req))
  } catch (err1) {
    try {
      // fallback: pass a pathname string (some implementations accept string)
      publicRoute = Boolean(isPublicRoute(pathname))
    } catch (err2) {
      // final fallback: manual regex check
      publicRoute = manualIsPublic(pathname)
    }
  }

  if (!publicRoute) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
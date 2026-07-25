const DEFAULT_AUTH_FALLBACK = '/halozat'
const AUTH_NEXT_COOKIE = 'vallal_auth_next'

interface ResolveAuthReturnTargetOptions {
  nextParam?: string | null
  fromParam?: string | null
  storedNext?: string | null
  fallback?: string
  currentOrigin?: string
}

function decodeCandidate(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeCandidate(value: string | null | undefined, currentOrigin?: string): string | null {
  if (!value) return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const candidates = [trimmed, decodeCandidate(trimmed)]

  for (const candidate of candidates) {
    if (!candidate) continue

    if (candidate.startsWith('/') && !candidate.startsWith('//')) {
      return candidate
    }

    if (/^https?:\/\//i.test(candidate)) {
      try {
        const parsed = new URL(candidate)
        if (currentOrigin && parsed.origin !== currentOrigin) {
          continue
        }
        return `${parsed.pathname}${parsed.search}${parsed.hash}`
      } catch {
        // Invalid absolute URL; skip.
      }
    }
  }

  return null
}

export function resolveAuthReturnTarget({
  nextParam,
  fromParam,
  storedNext,
  fallback = DEFAULT_AUTH_FALLBACK,
  currentOrigin,
}: ResolveAuthReturnTargetOptions): string {
  const fromNext = normalizeCandidate(nextParam, currentOrigin)
  if (fromNext) return fromNext

  const fromFrom = normalizeCandidate(fromParam, currentOrigin)
  if (fromFrom) return fromFrom

  const fromStorage = normalizeCandidate(storedNext, currentOrigin)
  if (fromStorage) return fromStorage

  return normalizeCandidate(fallback, currentOrigin) ?? DEFAULT_AUTH_FALLBACK
}

export function buildAuthHref(returnTo: string): string {
  const encoded = encodeURIComponent(returnTo)
  return `/auth?from=${encoded}&next=${encoded}`
}

export function persistAuthReturnTarget(target: string): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(AUTH_NEXT_COOKIE, target)
    window.localStorage.setItem(AUTH_NEXT_COOKIE, target)
  } catch {
    // ignore
  }

  try {
    const encoded = encodeURIComponent(target)
    document.cookie = `${AUTH_NEXT_COOKIE}=${encoded}; Path=/; Max-Age=1800; SameSite=Lax`
  } catch {
    // ignore
  }
}

export function readStoredAuthReturnTarget(): string {
  if (typeof window === 'undefined') return ''

  try {
    const fromSession = window.sessionStorage.getItem(AUTH_NEXT_COOKIE)
    if (fromSession) return fromSession
    const fromLocal = window.localStorage.getItem(AUTH_NEXT_COOKIE)
    if (fromLocal) return fromLocal
  } catch {
    // ignore
  }

  try {
    const match = document.cookie
      .split('; ')
      .find((part) => part.startsWith(`${AUTH_NEXT_COOKIE}=`))
    if (!match) return ''
    return decodeCandidate(match.slice(`${AUTH_NEXT_COOKIE}=`.length))
  } catch {
    return ''
  }
}

export function clearStoredAuthReturnTarget(): void {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.removeItem(AUTH_NEXT_COOKIE)
    window.localStorage.removeItem(AUTH_NEXT_COOKIE)
  } catch {
    // ignore
  }

  try {
    document.cookie = `${AUTH_NEXT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
  } catch {
    // ignore
  }
}

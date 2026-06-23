import Link from 'next/link'

/**
 * Minimal escape hatch — the only shared UI element injected by the dispatcher.
 * Sits fixed in the top-left corner, fully transparent to pointer events on its surroundings.
 */
export function BackLink() {
  return (
    <Link
      href="/konyv-2"
      className="fixed left-4 top-4 z-50 text-xs text-white/40 transition-colors hover:text-white/80"
      aria-label="Vissza a könyvhöz"
    >
      ← Vissza
    </Link>
  )
}

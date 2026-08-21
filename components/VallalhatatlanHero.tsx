"use client"
import React from "react"
import Link from "next/link"
import { useSessionGuard } from "@/hooks/useSessionGuard"
// Inline Avatar component to replace Navigation.tsx export
function Avatar({ avatarUrl, label }: { avatarUrl?: string | null; label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || '?'
  if (!avatarUrl) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white uppercase">
        {initial}
      </span>
    )
  }
  return (
    <img
      src={avatarUrl}
      alt={label}
      className="h-10 w-10 rounded-full object-cover"
      referrerPolicy="no-referrer"
    />
  )
}
import { Lock } from "lucide-react"
import { buildAuthHref, clearStoredAuthReturnTarget } from "@/lib/authRedirect"
export default function VallalhatatlanHero() {
  const { session } = useSessionGuard()
  const user = session?.user
  const avatarUrl = user?.user_metadata?.avatar_url
  const profileLabel = user?.user_metadata?.full_name || user?.email || 'Profil'
  return (
    <section
      className="relative flex flex-col h-screen bg-[#010101] overflow-hidden text-green-200"
      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
    >
      <div className="pointer-events-none absolute inset-0 fx-stripes opacity-10 mix-blend-overlay" />

      <header
        className="fixed top-0 left-0 right-0 flex justify-between items-center px-6 py-3 bg-black border-b border-zinc-700 z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <h1 className="text-lg font-bold italic text-white" style={{ fontFamily: 'var(--font-logo)' }}>
          Vállalhatatlan
        </h1>
        <div
          className="flex items-center space-x-3 text-sm text-green-200"
          style={{ fontFamily: 'var(--font-mono-tech)' }}
        >
          <span className="inline-block w-2 h-2 bg-green-600 rounded-full" />
          <span>NETWORK: ONLINE</span>
          {avatarUrl ? (
            <Avatar avatarUrl={avatarUrl} label={profileLabel} />
          ) : (
            <button
              type="button"
              onClick={() => {
                const returnTo = window.location.pathname
                clearStoredAuthReturnTarget()
                window.location.href = buildAuthHref(returnTo)
              }}
              aria-label="Bejelentkezés"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors hover:border-lime-400 hover:text-lime-300"
            >
              <Lock className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      <div className="px-6 pt-16">
        <h2
          className="text-6xl leading-tight font-bold uppercase text-zinc-100"
          style={{ fontFamily: 'var(--font-sans-reader)' }}
        >
          THIS IS NOT
          <br />A BOOK.
          <br />THIS IS A
          <br />NETWORK.
        </h2>
      </div>

      {/* Bottom navigation bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-700"
        style={{
          paddingTop: '1rem',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
        }}
      >
        <div className="grid grid-cols-3 text-center divide-x divide-zinc-700 h-full items-center">
          <Link href="/konyv" className="flex flex-col items-center">
            <span
              className="text-sm uppercase text-zinc-400 font-bold"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              [ ARCHIVE ]
            </span>
            <span
              className="text-xs text-green-200"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              24 Stories
            </span>
          </Link>
          <Link href="/halozat" className="flex flex-col items-center bg-zinc-800">
            <span
              className="text-sm uppercase text-zinc-100 font-bold"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              [ NETWORK ]
            </span>
            <span
              className="text-xs text-green-200"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              428 Nodes
            </span>
          </Link>
          <Link href="/nyitott-muhely" className="flex flex-col items-center">
            <span
              className="text-sm uppercase text-zinc-400 font-bold"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              [ LAB ]
            </span>
            <span
              className="text-xs text-green-200"
              style={{ fontFamily: 'var(--font-mono-tech)' }}
            >
              07 Projects
            </span>
          </Link>
        </div>
      </nav>
    </section>
  )
}
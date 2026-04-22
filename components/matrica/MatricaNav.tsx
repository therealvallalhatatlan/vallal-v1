'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import { createClient } from '@/lib/browser'

export default function MatricaNav() {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname?.startsWith('/admin/matrica')
  const { session } = useSessionGuard()
  const user = (session as any)?.user ?? null
  const email: string = user?.email ?? ''
  const avatarUrl: string | null = user?.user_metadata?.avatar_url ?? null
  const initial = email ? email[0].toUpperCase() : '?'

  const [avatarBroken, setAvatarBroken] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [accepted, setAccepted] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch score when session is available
  useEffect(() => {
    if (!session) return
    const token = (session as any).access_token
    if (!token) return
    let cancelled = false
    fetch('/api/matrica/score', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!cancelled && json) {
          setScore(json.score ?? 0)
          setAccepted(json.accepted ?? 0)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session])

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  async function handleSignOut() {
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        background: 'rgba(9,9,11,0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 200,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <Image
          src="/img/logo.png"
          alt="Vállalhatatlan"
          width={120}
          height={32}
          style={{ objectFit: 'contain', height: 32, width: 'auto' }}
          priority
        />
      </Link>

      {/* Right side: links + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link
          href="/matrica"
          style={{
            padding: '6px 13px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: !isAdmin ? '#f4f4f5' : '#a1a1aa',
            background: !isAdmin ? 'rgba(232,121,249,0.15)' : 'transparent',
            border: !isAdmin ? '1px solid rgba(232,121,249,0.3)' : '1px solid transparent',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Térkép
        </Link>
        <Link
          href="/admin/matrica"
          style={{
            padding: '6px 13px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            color: isAdmin ? '#f4f4f5' : '#a1a1aa',
            background: isAdmin ? 'rgba(232,121,249,0.15)' : 'transparent',
            border: isAdmin ? '1px solid rgba(232,121,249,0.3)' : '1px solid transparent',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Admin
        </Link>

        {/* Avatar + dropdown */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative', marginLeft: 4 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Felhasználói menü"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: menuOpen
                  ? '2px solid rgba(232,121,249,0.9)'
                  : '2px solid rgba(232,121,249,0.5)',
                background: (avatarUrl && !avatarBroken) ? 'transparent' : 'rgba(232,121,249,0.18)',
                cursor: 'pointer',
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#f4f4f5',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {avatarUrl && !avatarBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={email}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarBroken(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </button>

            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  minWidth: 220,
                  background: 'rgba(15,15,20,0.97)',
                  border: '1px solid rgba(232,121,249,0.2)',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  overflow: 'hidden',
                  zIndex: 300,
                }}
              >
                {/* Email */}
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#71717a', marginBottom: 3 }}>Bejelentkezve</p>
                  <p style={{
                    margin: 0, fontSize: 13, color: '#f4f4f5', fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 188,
                  }}>
                    {email}
                  </p>
                </div>

                {/* Score */}
                <div style={{
                  padding: '11px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, color: '#a1a1aa' }}>Pontszám</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#e879f9', fontWeight: 700, fontSize: 14 }}>
                    <span style={{ fontSize: 15 }}>★</span>
                    {score !== null ? `${score} pont` : '…'}
                  </span>
                </div>

                {/* Accepted count */}
                {accepted !== null && (
                  <div style={{
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 13, color: '#a1a1aa' }}>Elfogadott matricák</span>
                    <span style={{ fontSize: 13, color: '#86efac', fontWeight: 600 }}>{accepted} db</span>
                  </div>
                )}

                {/* Sign out */}
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontSize: 13, color: '#fca5a5',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span>↩</span> Kijelentkezés
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

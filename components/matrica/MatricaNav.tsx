"use client";
// Fallback for missing constant
// Remove if you have the real import
const MATRICA_START_ROUTE_EVENT = 'matrica:start-route';

import { createClient } from '@/lib/browser'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionGuard } from '@/hooks/useSessionGuard.js'
import { usePresence } from '@/hooks/usePresence'
// If StickerSpot is not imported from types, define a fallback type
// Remove this if you have the correct import
// import { StickerSpot } from '@/types/StickerSpot'
type StickerSpot = { id: string; name: string; lat: number; lng: number; [key: string]: any }
type OnlineUserProfile = {
  id: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
  badge: number;
  score: number;
  accepted: number;
  lat?: number;
  lng?: number;
};

export function OnlineUsersBar() {
  usePresence()

  const { session } = useSessionGuard()
  const currentUserId = (session as any)?.user?.id

  const [users, setUsers] = useState<OnlineUserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchOnlineUsers() {
      setLoading(true)
      try {
        // 1. Get online user IDs
        const res = await fetch('/api/presence/online')
        const json = await res.json()
        if (!res.ok || !Array.isArray(json?.users)) {
          setUsers([])
          setLoading(false)
          return
        }

        const onlineUsers = json.users
          .map((u: { id?: string; user_id?: string; email?: string; lat?: number; lng?: number }) => ({
            id: u.id ?? u.user_id,
            email: u.email,
            lat: u.lat,
            lng: u.lng,
          }))
          .filter((u: { id?: string; email?: string }) => !!u.id && !!u.email)
          .sort((a: { id: string }, b: { id: string }) => {
            if (!currentUserId) return 0
            if (a.id === currentUserId) return -1
            if (b.id === currentUserId) return 1
            return 0
          }) as Array<{ id: string; email: string; lat?: number; lng?: number }>

        if (onlineUsers.length === 0) {
          setUsers([])
          setLoading(false)
          return
        }

        // 2. For each user, fetch profile (nickname, avatar, badge)
        const profiles: OnlineUserProfile[] = await Promise.all(
          onlineUsers.map(async (u: { id: string; email: string; lat?: number; lng?: number }) => {
            try {
              const pres = await fetch(`/api/user/profile?userId=${encodeURIComponent(u.id)}`)
              const pjson = await pres.json()
              if (pres.ok && pjson?.ok && pjson?.profile) {
                return {
                  id: u.id,
                  email: u.email,
                  nickname: pjson.profile.nickname || u.email,
                  avatarUrl: pjson.profile.avatar_url || null,
                  badge: pjson.profile.accepted ?? pjson.profile.badge ?? 0,
                  score: pjson.profile.score ?? 0,
                  accepted: pjson.profile.accepted ?? 0,
                  lat: u.lat,
                  lng: u.lng,
                }
              }
            } catch {}
            return {
              id: u.id,
              email: u.email,
              nickname: u.email,
              avatarUrl: null,
              badge: 0,
              score: 0,
              accepted: 0,
              lat: u.lat,
              lng: u.lng,
            }
          })
        )
        if (!cancelled) setUsers(profiles)
      } catch (error) {
        console.error('Online users fetch failed:', error)
        if (!cancelled) setUsers([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchOnlineUsers()
    const interval = setInterval(fetchOnlineUsers, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [currentUserId])

  if (loading && users.length === 0) return null
  if (users.length === 0) return (
    <div style={{ width: '100%', background: '#18181b', color: '#a1a1aa', fontSize: 13, textAlign: 'center', padding: 6 }}>Nincs online felhasználó</div>
  )
  return (
    <div style={{ width: '100%', background: '#18181b', borderBottom: '1px solid #23232a', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto' }}>
      <div
        style={{
          fontSize: 14,
          color: '#84cc16',
          marginLeft: 16,
          marginRight: 8,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Online felhasználók"
        aria-label="Online felhasználók"
      >
        ⚡
      </div>
      {users.map(u => (
        <div
          key={u.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginRight: 10,
            padding: u.id === currentUserId ? '2px 6px' : 0,
            borderRadius: 999,
            background: u.id === currentUserId ? 'rgba(132,204,22,0.16)' : 'transparent',
            border: u.id === currentUserId ? '1px solid rgba(132,204,22,0.42)' : '1px solid transparent',
          }}
        >
          <div 
            style={{ position: 'relative', width: 32, height: 32, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation()
              
              // If location data exists, use it
              if (u.lat && u.lng && Number.isFinite(u.lat) && Number.isFinite(u.lng)) {
                window.dispatchEvent(new CustomEvent('matrica:focus-online-user', {
                  detail: {
                    lat: u.lat,
                    lng: u.lng,
                    nickname: u.nickname,
                    avatarUrl: u.avatarUrl,
                    score: u.score,
                    accepted: u.accepted,
                  },
                }))
              } else {
                // Fallback: try to get current user location from window or show message
                const userLoc = (window as any).vallalhatatlan_userLocation
                if (userLoc?.lat && userLoc?.lng) {
                  window.dispatchEvent(new CustomEvent('matrica:focus-online-user', {
                    detail: {
                      lat: userLoc.lat,
                      lng: userLoc.lng,
                      nickname: `${u.nickname} (kb. pozicio)`,
                      avatarUrl: u.avatarUrl,
                      score: u.score,
                      accepted: u.accepted,
                    },
                  }))
                } else {
                  alert(`${u.nickname} pozíciója nem elérhető.\n\nBiztos, hogy engedélyezted a helymeghatározást?`)
                }
              }
            }}
            title={`${u.nickname} - ${u.lat && u.lng ? 'Kattints a térképen való megjelenítéshez' : 'Nincs pozíció adat'}`}
          >
            {u.avatarUrl ? (
              <img
                src={u.avatarUrl}
                alt={u.nickname}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: u.id === currentUserId ? '2px solid #84cc16' : '2px solid #f472b6',
                  background: '#23232a',
                }}
              />
            ) : (

              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#23232a', color: u.id === currentUserId ? '#84cc16' : '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, border: u.id === currentUserId ? '2px solid #84cc16' : '2px solid #f472b6' }}>{u.nickname?.[0]?.toUpperCase() || '?'}</div>
            )}
            <span style={{ position: 'absolute', bottom: -2, right: -2, background: u.id === currentUserId ? '#84cc16' : '#f472b6', color: u.id === currentUserId ? '#10220a' : '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #18181b', padding: '0 4px' }}>{u.badge}</span>
          </div>
          <span style={{ fontSize: 13, color: u.id === currentUserId ? '#bef264' : '#f4f4f5', fontWeight: u.id === currentUserId ? 700 : 500, maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nickname}</span>
        </div>
      ))}
    </div>
  )
}

function MatricaNav() {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = pathname?.startsWith('/admin/matrica')
  const { session } = useSessionGuard()
  const user = (session as any)?.user ?? null
  const email: string = user?.email ?? ''

  const [menuOpen, setMenuOpen] = useState(false)
  const [score, setScore] = useState<number | null>(null)
  const [accepted, setAccepted] = useState<number | null>(null)
  const [nickname, setNickname] = useState<string | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState('')
  const [nicknameEditing, setNicknameEditing] = useState(false)
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [spotsSheetOpen, setSpotsSheetOpen] = useState(false)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [spotsLoading, setSpotsLoading] = useState(false)
  const [spotsError, setSpotsError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch score when session is available and after successful claims.
  useEffect(() => {
    if (!session) return
    const token = (session as any).access_token
    if (!token) return

    let cancelled = false

    const loadScore = () => {
      fetch('/api/matrica/score', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          if (!cancelled && json) {
            setScore(json.score ?? 0)
            setAccepted(json.accepted ?? 0)
          }
        })
        .catch(() => {})
    }

    loadScore()

    const onClaimSubmitted = () => {
      loadScore()
    }

    window.addEventListener('matrica:claim-submitted', onClaimSubmitted)

    return () => {
      cancelled = true
      window.removeEventListener('matrica:claim-submitted', onClaimSubmitted)
    }
  }, [session])

  useEffect(() => {
    if (!user?.id) {
      setNickname(null)
      return
    }

    let cancelled = false

    const loadNickname = async () => {
      try {
        const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(user.id)}`)
        const json = await res.json()

        if (cancelled) return

        if (res.ok && json?.ok && typeof json?.profile?.nickname === 'string') {
          const value = json.profile.nickname.trim()
          setNickname(value || null)
          setNicknameDraft(value || '')
          return
        }

        setNickname(null)
        setNicknameDraft('')
      } catch {
        if (!cancelled) {
          setNickname(null)
          setNicknameDraft('')
        }
      }
    }

    void loadNickname()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function handleSaveNickname() {
    const token = (session as any)?.access_token
    if (!token) {
      setNicknameError('Bejelentkezes szukseges a menteshez.')
      return
    }

    const trimmed = nicknameDraft.trim().toLocaleLowerCase('hu-HU')
    if (!trimmed) {
      setNicknameError('Adj meg egy felhasznalonevet.')
      return
    }

    setNicknameSaving(true)
    setNicknameError(null)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nickname: trimmed }),
      })

      const json = await res.json()
      if (!res.ok || !json?.ok) {
        if (json?.error === 'nickname_taken') {
          setNicknameError('Ez a felhasznalonev mar foglalt.')
        } else if (typeof json?.error === 'string') {
          setNicknameError(json.error)
        } else {
          setNicknameError('Nem sikerult menteni a felhasznalonevet.')
        }
        return
      }

      const savedNickname = typeof json?.profile?.nickname === 'string' ? json.profile.nickname.trim() : trimmed
      setNickname(savedNickname)
      setNicknameDraft(savedNickname)
      setNicknameEditing(false)
    } catch {
      setNicknameError('Nem sikerult menteni a felhasznalonevet.')
    } finally {
      setNicknameSaving(false)
    }
  }

  useEffect(() => {
    if (!spotsSheetOpen) return

    let cancelled = false
    const loadSpots = async () => {
      setSpotsLoading(true)
      setSpotsError(null)
      try {
        const res = await fetch('/api/matrica/spots')
        const json = await res.json()

        if (cancelled) return

        if (!res.ok) {
          setSpotsError('Nem sikerult betolteni a szpotokat.')
          setSpots([])
          return
        }

        setSpots(Array.isArray(json?.spots) ? json.spots : [])
      } catch {
        if (!cancelled) {
          setSpotsError('Nem sikerult betolteni a szpotokat.')
          setSpots([])
        }
      } finally {
        if (!cancelled) setSpotsLoading(false)
      }
    }

    void loadSpots()

    return () => {
      cancelled = true
    }
  }, [spotsSheetOpen])

  function startRouteToSpot(spot: StickerSpot) {
    window.dispatchEvent(
      new CustomEvent(MATRICA_START_ROUTE_EVENT, {
        detail: {
          spotId: spot.id,
          lat: spot.lat,
          lng: spot.lng,
          title: spot.title,
        },
      })
    )
    setSpotsSheetOpen(false)
  }

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
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001 }}>
        <OnlineUsersBar />
      </div>
      <nav
        style={{
          position: 'fixed',
          top: 38,
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
      {/* Wordmark */}
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
          textDecoration: 'none',
          color: '#f4f4f5',
          fontSize: 11,
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          fontWeight: 500,
          lineHeight: 1,
        }}
        aria-label="HÁLÓZAT"
      >
        HÁLÓZAT
      </Link>

      {/* Right side: links + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link
          href="/admin/matrica"
          aria-label="Szpot hozzáadása"
          title="Szpot hozzáadása"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            textDecoration: 'none',
            color: isAdmin ? '#f4f4f5' : '#a1a1aa',
            background: isAdmin ? 'rgba(232,121,249,0.15)' : 'transparent',
            border: isAdmin ? '1px solid rgba(232,121,249,0.3)' : '1px solid transparent',
            transition: 'background 0.15s, color 0.15s',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </Link>

        <button
          type="button"
          onClick={() => setSpotsSheetOpen((prev) => !prev)}
          aria-label="Szpotok"
          title="Szpotok"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            color: spotsSheetOpen ? '#f4f4f5' : '#a1a1aa',
            background: spotsSheetOpen ? 'rgba(236,72,153,0.18)' : 'transparent',
            border: spotsSheetOpen ? '1px solid rgba(236,72,153,0.35)' : '1px solid transparent',
            transition: 'background 0.15s, color 0.15s',
            cursor: 'pointer',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
            <path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="4" cy="5" r="1" fill="currentColor" />
            <circle cx="4" cy="10" r="1" fill="currentColor" />
            <circle cx="4" cy="15" r="1" fill="currentColor" />
          </svg>
        </button>

        {/* Profile menu trigger + dropdown */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative', marginLeft: 4 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Felhasználói menü"
              title="Profil beállítások"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: menuOpen
                  ? '1px solid rgba(232,121,249,0.9)'
                  : '1px solid rgba(232,121,249,0.35)',
                background: menuOpen ? 'rgba(232,121,249,0.18)' : 'rgba(232,121,249,0.1)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: menuOpen ? '#f5d0fe' : '#f4f4f5',
              }}
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
                <path d="M10 3.5l1.2 1.2 1.7-.4.7 1.6 1.8.5-.2 1.8 1.2 1.2-1.2 1.2.2 1.8-1.8.5-.7 1.6-1.7-.4L10 16.5l-1.2-1.2-1.7.4-.7-1.6-1.8-.5.2-1.8L3.6 10l1.2-1.2-.2-1.8 1.8-.5.7-1.6 1.7.4L10 3.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.4" />
              </svg>
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
                {/* Identity */}
                <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#71717a', marginBottom: 3 }}>Bejelentkezve</p>
                  {nicknameEditing ? (
                    <>
                      <input
                        type="text"
                        value={nicknameDraft}
                        onChange={(e) => setNicknameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            void handleSaveNickname()
                          }
                          if (e.key === 'Escape') {
                            setNicknameEditing(false)
                            setNicknameDraft(nickname || '')
                            setNicknameError(null)
                          }
                        }}
                        maxLength={20}
                        autoFocus
                        style={{
                          width: '100%',
                          margin: 0,
                          fontSize: 14,
                          color: '#f4f4f5',
                          fontWeight: 700,
                          borderRadius: 8,
                          border: '1px solid rgba(232,121,249,0.3)',
                          background: 'rgba(24,24,27,0.85)',
                          padding: '7px 9px',
                          outline: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => void handleSaveNickname()}
                          disabled={nicknameSaving}
                          style={{
                            border: '1px solid rgba(232,121,249,0.4)',
                            background: 'rgba(232,121,249,0.18)',
                            color: '#f5d0fe',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '5px 8px',
                            cursor: nicknameSaving ? 'default' : 'pointer',
                            opacity: nicknameSaving ? 0.7 : 1,
                          }}
                        >
                          {nicknameSaving ? 'Mentes...' : 'Mentes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNicknameEditing(false)
                            setNicknameDraft(nickname || '')
                            setNicknameError(null)
                          }}
                          disabled={nicknameSaving}
                          style={{
                            border: '1px solid rgba(255,255,255,0.14)',
                            background: 'transparent',
                            color: '#a1a1aa',
                            borderRadius: 8,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '5px 8px',
                            cursor: nicknameSaving ? 'default' : 'pointer',
                          }}
                        >
                          Megse
                        </button>
                      </div>
                      {nicknameError ? (
                        <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#fda4af' }}>{nicknameError}</p>
                      ) : (
                        <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#71717a' }}>3-20 karakter, betu/szam/_/-</p>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 14, color: '#f4f4f5', fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 188,
                      }}>
                        {nickname || 'nevtelen'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNicknameEditing(true)
                          setNicknameDraft(nickname || '')
                          setNicknameError(null)
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#c084fc',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        Szerkesztes
                      </button>
                    </div>
                  )}
                  <p style={{
                    margin: '2px 0 0 0', fontSize: 11, color: '#71717a', fontWeight: 500,
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

      <div
        style={{
          position: 'fixed',
          top: 52,
          left: 0,
          right: 0,
          zIndex: 190,
          transform: spotsSheetOpen ? 'translateY(0)' : 'translateY(-110%)',
          opacity: spotsSheetOpen ? 1 : 0,
          pointerEvents: spotsSheetOpen ? 'auto' : 'none',
          transition: 'transform 240ms ease, opacity 200ms ease',
        }}
        aria-hidden={!spotsSheetOpen}
      >
        <div
          style={{
            margin: '0 auto',
            width: 'min(1200px, calc(100vw - 20px))',
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
            border: '1px solid rgba(236,72,153,0.25)',
            borderTop: 'none',
            background: 'linear-gradient(180deg, rgba(10,10,14,0.97), rgba(17,24,39,0.94))',
            boxShadow: '0 22px 50px rgba(0,0,0,0.45)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <strong style={{ fontSize: 14, color: '#fbcfe8' }}>Aktív szpotok</strong>
              <span style={{ fontSize: 12, color: '#a1a1aa' }}>{spots.length} db</span>
            </div>
            <button
              type="button"
              onClick={() => setSpotsSheetOpen(false)}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'transparent',
                color: '#d4d4d8',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Bezár
            </button>
          </div>

          <div style={{ padding: 12 }}>
            {spotsLoading ? (
              <div style={{ color: '#a1a1aa', fontSize: 13 }}>Szpotok betöltése...</div>
            ) : spotsError ? (
              <div style={{ color: '#fda4af', fontSize: 13 }}>{spotsError}</div>
            ) : spots.length === 0 ? (
              <div style={{ color: '#a1a1aa', fontSize: 13 }}>Jelenleg nincs élő szpot.</div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollSnapType: 'x mandatory',
                }}
              >
                {spots.map((spot) => (
                  <article
                    key={spot.id}
                    style={{
                      minWidth: 'min(310px, 78vw)',
                      maxWidth: 340,
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(2,6,23,0.7)',
                      overflow: 'hidden',
                      scrollSnapAlign: 'start',
                    }}
                  >
                    <div style={{ height: 128, background: 'rgba(148,163,184,0.12)' }}>
                      {spot.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={spot.image_url}
                          alt={spot.title}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8',
                            fontSize: 12,
                          }}
                        >
                          Nincs kep
                        </div>
                      )}
                    </div>

                    <div style={{ padding: 11, display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <strong style={{ color: '#f4f4f5', fontSize: 14, lineHeight: 1.25 }}>{spot.title}</strong>
                        <span style={{ color: '#86efac', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {spot.remaining_quantity} maradt
                        </span>
                      </div>

                      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 12, lineHeight: 1.4, minHeight: 34 }}>
                        {spot.description || 'Nincs leiras ehhez a szpothoz.'}
                      </p>

                      <button
                        type="button"
                        onClick={() => startRouteToSpot(spot)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          borderRadius: 9,
                          border: '1px solid rgba(244,114,182,0.45)',
                          background: 'rgba(244,114,182,0.16)',
                          color: '#fbcfe8',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '7px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Mutasd az utvonalat
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
    </>
  )
}

export default MatricaNav

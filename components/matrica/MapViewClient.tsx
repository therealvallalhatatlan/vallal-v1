'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionGuard } from '@/hooks/useSessionGuard'

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#09090b',
        color: '#94a3b8',
        fontSize: 14,
      }}
    >
      Térkép betöltése…
    </div>
  ),
})

export default function MapViewClient() {
  const router = useRouter()
  const { session, loading } = useSessionGuard()
  const user = (session as any)?.user
  const accessToken = (session as any)?.access_token ?? null
  const [nickname, setNickname] = useState<string | null>(null)
  const [nicknameLoading, setNicknameLoading] = useState(true)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)

  const nicknamePattern = useMemo(() => /^[\p{L}\p{N}_-]+$/u, [])

  useEffect(() => {
    if (!session || !user?.id) return
    let cancelled = false

    const loadNickname = async () => {
      setNicknameLoading(true)
      setNicknameError(null)
      try {
        const res = await fetch(`/api/user/profile?userId=${encodeURIComponent(user.id)}`)
        const json = await res.json()

        if (cancelled) return

        if (res.ok && json?.ok && typeof json?.profile?.nickname === 'string' && json.profile.nickname.trim()) {
          const value = json.profile.nickname.trim()
          setNickname(value)
          setNicknameInput(value)
          return
        }

        if (res.status === 404 || json?.error === 'user_not_found') {
          setNickname(null)
          return
        }

        setNicknameError('Nem sikerult betolteni a felhasznalonevet.')
      } catch {
        if (!cancelled) {
          setNicknameError('Nem sikerult betolteni a felhasznalonevet.')
        }
      } finally {
        if (!cancelled) {
          setNicknameLoading(false)
        }
      }
    }

    void loadNickname()

    return () => {
      cancelled = true
    }
  }, [session, user?.id])

  async function handleSaveNickname() {
    if (!accessToken) return
    const value = nicknameInput.trim().toLocaleLowerCase('hu-HU')

    if (value.length < 3 || value.length > 20) {
      setNicknameError('A felhasznalonev 3-20 karakter legyen.')
      return
    }

    if (!nicknamePattern.test(value)) {
      setNicknameError('Csak betu, szam, _ es - karakter hasznalhato.')
      return
    }

    setSavingNickname(true)
    setNicknameError(null)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ nickname: value }),
      })
      const json = await res.json()

      if (!res.ok || !json?.ok) {
        if (json?.error === 'nickname_taken') {
          setNicknameError('Ez a felhasznalonev mar foglalt.')
        } else {
          setNicknameError(typeof json?.error === 'string' ? json.error : 'Nem sikerult menteni a felhasznalonevet.')
        }
        return
      }

      const saved = typeof json?.profile?.nickname === 'string' ? json.profile.nickname.trim() : value
      setNickname(saved)
      setNicknameInput(saved)
    } catch {
      setNicknameError('Nem sikerult menteni a felhasznalonevet.')
    } finally {
      setSavingNickname(false)
    }
  }

  const chatDisplayName = nickname ?? ''

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/auth?from=/halozat')
    }
  }, [loading, session, router])

  if (loading || !session || nicknameLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#09090b',
          color: '#94a3b8',
          fontSize: 14,
        }}
      >
        {loading || nicknameLoading ? 'Betöltés…' : null}
      </div>
    )
  }

  const needsNickname = !nickname

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <MapView chatDisplayName={chatDisplayName} chatAuthToken={accessToken} />

      {needsNickname && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 500,
            background: 'rgba(5,7,10,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(520px, 100%)',
              borderRadius: 12,
              border: '1px solid rgba(200,169,126,0.3)',
              background: 'linear-gradient(180deg, rgba(14,17,22,0.96), rgba(8,10,13,0.98))',
              boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
              padding: 18,
            }}
          >
            <h2 style={{ margin: 0, color: '#f3f4f6', fontSize: 20, fontWeight: 800 }}>Valassz felhasznalonevet</h2>
            <p style={{ margin: '8px 0 14px 0', color: '#cbd5e1', fontSize: 13, lineHeight: 1.45 }}>
              Ezzel a nevvel fognak latni a kozos chatben es az activity feedben. Az emailed rejtve marad.
            </p>

            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSaveNickname()
                }
              }}
              placeholder="pl. budafox_77"
              maxLength={20}
              autoFocus
              style={{
                width: '100%',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.03)',
                color: '#f4f4f5',
                fontSize: 15,
                padding: '11px 12px',
                outline: 'none',
              }}
            />

            <div style={{ marginTop: 8, color: '#a1a1aa', fontSize: 12 }}>
              3-20 karakter, betu/szam/_/-
            </div>

            {nicknameError ? (
              <div style={{ marginTop: 10, color: '#fda4af', fontSize: 12 }}>{nicknameError}</div>
            ) : null}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#a1a1aa', fontSize: 12 }}>A jatek inditasahoz ez kotelezo.</span>
              <button
                type="button"
                onClick={() => void handleSaveNickname()}
                disabled={savingNickname || !nicknameInput.trim()}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(200,169,126,0.4)',
                  background: 'rgba(200,169,126,0.14)',
                  color: '#f3e9d8',
                  fontWeight: 700,
                  fontSize: 13,
                  padding: '8px 12px',
                  cursor: savingNickname ? 'default' : 'pointer',
                  opacity: savingNickname ? 0.65 : 1,
                }}
              >
                {savingNickname ? 'Mentés...' : 'Kezdodik a jatek'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

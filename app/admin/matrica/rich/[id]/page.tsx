'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { StickerSpot } from '@/lib/matrica'
import MatricaNav from '@/components/matrica/MatricaNav'
import RichContentEditor from '@/components/matrica/RichContentEditor'
import { useSessionGuard } from '@/hooks/useSessionGuard'

export default function RichContentAdminPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { session, loading: authLoading } = useSessionGuard()
  const [spot, setSpot] = useState<StickerSpot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const accessToken = (session as any)?.access_token as string | undefined
  const spotId = typeof params?.id === 'string' ? params.id : ''

  const fetchSpot = useCallback(async (token: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/matrica/spots', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`)
      const found = (json.spots ?? []).find((item: StickerSpot) => item.id === spotId) as StickerSpot | undefined
      if (!found) {
        setError('A spot nem található, vagy nincs hozzá jogosultságod.')
        return
      }
      if (found.type !== 'virtual' || found.content_type !== 'rich') {
        setError('Ez a spot nem Rich Content spot.')
        return
      }
      setSpot(found)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [spotId])

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace(`/auth?from=/admin/matrica/rich/${spotId}`)
    }
  }, [authLoading, session, router, spotId])

  useEffect(() => {
    if (accessToken && spotId) void fetchSpot(accessToken)
  }, [accessToken, spotId, fetchSpot])

  if (authLoading || !session || loading) {
    return <div style={{ minHeight: '100vh', background: '#09090b', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Betöltés…</div>
  }

  if (error || !spot || !accessToken) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5' }}>
        <MatricaNav />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 'calc(var(--matrica-header-offset, 90px) + 24px) 20px 40px' }}>
          <button type="button" onClick={() => router.push('/admin/matrica')} style={buttonStyle}>← Vissza</button>
          <div style={{ marginTop: 20, color: '#fca5a5' }}>{error ?? 'Nem sikerült betölteni a spotot.'}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5' }}>
      <MatricaNav />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'calc(var(--matrica-header-offset, 90px) + 24px) 20px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button type="button" onClick={() => router.push('/admin/matrica')} style={buttonStyle}>← Spotok</button>
          <span style={{ color: '#52525b', fontSize: 12 }}>/</span>
          <span style={{ color: '#c8a97e', fontSize: 11, letterSpacing: '0.08em' }}>RICH CONTENT</span>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#71717a', fontSize: 10, letterSpacing: '0.14em', marginBottom: 6 }}>DIGITÁLIS SZPOT / RICH CONTENT</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1, fontWeight: 800, letterSpacing: '-0.03em' }}>{spot.title}</h1>
          {spot.description ? <p style={{ margin: '12px 0 0', maxWidth: 760, color: '#a1a1aa', fontSize: 13, lineHeight: 1.6 }}>{spot.description}</p> : null}
        </div>

        <RichContentEditor
          spotId={spot.id}
          accessToken={accessToken}
          initialDocument={spot.rich_content}
        />
      </main>
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.03)',
  color: '#d4d4d8',
  padding: '8px 11px',
  borderRadius: 8,
  fontSize: 11,
  cursor: 'pointer',
}

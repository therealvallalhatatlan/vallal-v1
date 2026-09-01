'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StickerSpot } from '@/lib/matrica'
import MatricaNav from '@/components/matrica/MatricaNav'
import MapPicker from '@/components/matrica/MapPicker'
import { useSessionGuard } from '@/hooks/useSessionGuard'

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9,
  color: '#f4f4f5',
  padding: '10px 12px',
  fontSize: 13,
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  border: '1px solid rgba(163,230,53,0.35)',
  background: 'rgba(163,230,53,0.08)',
  color: '#d9f99d',
  padding: '10px 14px',
  borderRadius: 9,
  fontSize: 11,
  fontWeight: 800,
  cursor: 'pointer',
}

export default function NewRichSpotPage() {
  const router = useRouter()
  const { session, loading } = useSessionGuard()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [coordinates, setCoordinates] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accessToken = (session as any)?.access_token as string | undefined

  if (loading || !session) {
    return <div style={{ minHeight: '100vh', background: '#09090b', color: '#71717a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Betöltés…</div>
  }

  function updateCoordinates(value: string) {
    setCoordinates(value)
    const parts = value.trim().split(/[,\s]+/).filter(Boolean)
    if (parts.length !== 2) {
      setLat(null)
      setLng(null)
      return
    }
    const nextLat = Number(parts[0])
    const nextLng = Number(parts[1])
    setLat(Number.isFinite(nextLat) ? nextLat : null)
    setLng(Number.isFinite(nextLng) ? nextLng : null)
  }

  async function createSpot() {
    setError(null)
    if (!accessToken) return
    if (!title.trim()) {
      setError('A cím kötelező.')
      return
    }
    if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Adj meg érvényes koordinátát.')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/matrica/spots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          type: 'virtual',
          content_type: 'rich',
          content_url: null,
          rich_content: { version: 1, blocks: [] },
          spot_type: 'free',
          price_huf: 0,
          image_url: null,
          image_urls: [],
          lat,
          lng,
          radius_visibility: 500,
          radius_claim: 50,
          total_quantity: 1,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? `HTTP ${response.status}`)
      const spot = json.spot as StickerSpot
      router.replace(`/admin/matrica/rich/${spot.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5' }}>
      <MatricaNav />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 'calc(var(--matrica-header-offset, 90px) + 24px) 20px 60px' }}>
        <button type="button" onClick={() => router.push('/admin/matrica')} style={{ ...buttonStyle, borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)', color: '#d4d4d8', marginBottom: 20 }}>
          ← Spotok
        </button>

        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#a3e635', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', marginBottom: 7 }}>NEW / RICH CONTENT</div>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px, 5vw, 52px)', lineHeight: 0.95, letterSpacing: '-0.04em' }}>Új Rich Content szpot</h1>
          <p style={{ margin: '12px 0 0', maxWidth: 700, color: '#71717a', fontSize: 13, lineHeight: 1.6 }}>
            A spot fizikai helyhez kötött virtuális tartalom. A megtaláló 50 méteren belül tudja feloldani, utána a microsite jelenik meg.
          </p>
        </div>

        <section style={{ background: 'linear-gradient(180deg, rgba(6,7,9,0.98), rgba(10,11,14,0.98))', border: '1px solid rgba(200,169,126,0.2)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>CÍM *</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} placeholder="pl. A hely története" />
            </div>
            <div>
              <label style={labelStyle}>LEÍRÁS</label>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} placeholder="Rövid kontextus a szpothoz…" />
            </div>
            <div>
              <label style={labelStyle}>KOORDINÁTÁK *</label>
              <input value={coordinates} onChange={(event) => updateCoordinates(event.target.value)} style={inputStyle} placeholder="47.4979, 19.0402" inputMode="decimal" />
              <p style={{ margin: '6px 0 0', color: '#52525b', fontSize: 10 }}>Google Mapsből bemásolható: szélesség, hosszúság.</p>
            </div>
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(nextLat, nextLng) => {
                setLat(nextLat)
                setLng(nextLng)
                setCoordinates(`${nextLat}, ${nextLng}`)
              }}
            />
            {error ? <div style={{ color: '#fca5a5', fontSize: 12, padding: '9px 11px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8 }}>{error}</div> : null}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 6 }}>
              <span style={{ color: '#52525b', fontSize: 10, letterSpacing: '0.08em' }}>CONTENT TYPE: RICH CONTENT</span>
              <button type="button" onClick={() => void createSpot()} disabled={saving} style={{ ...buttonStyle, opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'LÉTREHOZÁS…' : 'SZPOT LÉTREHOZÁSA →'}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  color: '#a3a3a3',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.10em',
}

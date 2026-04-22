'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { validateAdminKey } from '@/lib/actions'
import type { StickerSpot, SpotStatus } from '@/lib/matrica'
import MatricaNav from '@/components/matrica/MatricaNav'
import { useSessionGuard } from '@/hooks/useSessionGuard'

const MapPicker = dynamic(() => import('@/components/matrica/MapPicker'), { ssr: false })

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    background: '#09090b',
    color: '#f4f4f5',
    padding: '84px 20px 32px',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  card: {
    background: '#111113',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 24,
  } as React.CSSProperties,
  label: {
    display: 'block',
    fontSize: 12,
    color: '#a1a1aa',
    marginBottom: 6,
  } as React.CSSProperties,
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#f4f4f5',
    padding: '8px 10px',
    fontSize: 14,
    boxSizing: 'border-box' as const,
    outline: 'none',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  btn: (color = '#e879f9', disabled = false): React.CSSProperties => ({
    padding: '9px 18px',
    background: disabled ? 'rgba(255,255,255,0.06)' : color,
    border: 'none',
    borderRadius: 8,
    color: disabled ? '#52525b' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontWeight: 600,
  }),
}

const STATUS_LABEL: Record<SpotStatus, string> = {
  active: 'Aktív',
  empty: 'Elfogyott',
  archived: 'Archivált',
}

const STATUS_COLOR: Record<SpotStatus, string> = {
  active: '#86efac',
  empty: '#fbbf24',
  archived: '#71717a',
}

// ── Admin key gate ─────────────────────────────────────────────────────────────
function AdminKeyGate({ onAuth }: { onAuth: (key: string) => void }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(false)
    const valid = await validateAdminKey(key)
    setLoading(false)
    if (valid) {
      onAuth(key)
    } else {
      setError(true)
    }
  }

  return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={submit} style={{ ...s.card, width: 320 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Admin hozzáférés</h2>
        <label style={s.label} htmlFor="admin-key">Admin kulcs</label>
        <input
          id="admin-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ ...s.input, marginBottom: 12 }}
          autoFocus
        />
        {error && (
          <p style={{ color: '#fca5a5', fontSize: 13, margin: '0 0 10px' }}>Érvénytelen kulcs.</p>
        )}
        <button type="submit" disabled={loading || !key} style={s.btn()}>
          {loading ? 'Ellenőrzés…' : 'Belépés'}
        </button>
      </form>
    </div>
  )
}

// ── Create spot form ───────────────────────────────────────────────────────────
interface CreateFormProps {
  adminKey: string
  onCreated: (spot: StickerSpot) => void
}

const MAX_SPOT_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const TARGET_SPOT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_SPOT_IMAGE_DIMENSION = 1800

async function loadImageForCompression(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('A kép nem olvasható.'))
      img.src = objectUrl
    })
    return image
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('A kép tömörítése sikertelen.'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
}

async function optimizeSpotImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Csak képfájl tölthető fel.')
  }

  if (file.type === 'image/gif') {
    return file
  }

  const image = await loadImageForCompression(file)
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longestSide > MAX_SPOT_IMAGE_DIMENSION ? MAX_SPOT_IMAGE_DIMENSION / longestSide : 1
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale))
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('A böngésző nem tudja előkészíteni a képet.')
  }

  context.fillStyle = '#111113'
  context.fillRect(0, 0, targetWidth, targetHeight)
  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const qualities = [0.86, 0.76, 0.66, 0.56]
  let bestBlob = await canvasToBlob(canvas, qualities[0])

  for (const quality of qualities) {
    const blob = await canvasToBlob(canvas, quality)
    bestBlob = blob
    if (blob.size <= TARGET_SPOT_IMAGE_SIZE_BYTES) {
      break
    }
  }

  const outputName = file.name.replace(/\.[^.]+$/, '') || 'spot-cover'

  return new File([bestBlob], `${outputName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

function CreateSpotForm({ adminKey, onCreated }: CreateFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radiusVisibility, setRadiusVisibility] = useState(500)
  const [radiusClaim, setRadiusClaim] = useState(50)
  const [totalQty, setTotalQty] = useState(1)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [preparingImage, setPreparingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setError(null)

    if (!file) {
      setImageFile(null)
      setImagePreview(null)
      return
    }

    setPreparingImage(true)

    try {
      const optimizedFile = await optimizeSpotImage(file)

      if (optimizedFile.size > MAX_SPOT_IMAGE_SIZE_BYTES) {
        setImageFile(null)
        setImagePreview(null)
        setError('A borítókép még tömörítés után is túl nagy. Maximum 8 MB-os képet tölts fel.')
        if (fileRef.current) fileRef.current.value = ''
        return
      }

      setImageFile(optimizedFile)
      setImagePreview(URL.createObjectURL(optimizedFile))
    } catch (err) {
      setImageFile(null)
      setImagePreview(null)
      setError(`Kép előkészítési hiba: ${err instanceof Error ? err.message : String(err)}`)
      if (fileRef.current) fileRef.current.value = ''
    } finally {
      setPreparingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('A cím kötelező.'); return }
    if (lat === null || lng === null) { setError('Kattints a térképre a hely megadásához.'); return }

    setSubmitting(true)

    let imageUrl: string | null = null

    // Upload image if provided
    if (imageFile) {
      setUploadProgress('Kép feltöltése…')
      try {
        if (imageFile.size > MAX_SPOT_IMAGE_SIZE_BYTES) {
          throw new Error('A borítókép túl nagy. Maximum 8 MB-os képet tölts fel.')
        }

        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `spot-covers/${Date.now()}.${ext}`

        const fd = new FormData()
        fd.append('file', imageFile)
        fd.append('path', path)

        const uploadRes = await fetch('/api/matrica/upload', {
          method: 'POST',
          headers: { 'x-admin-key': adminKey },
          body: fd,
        })

        const uploadText = await uploadRes.text()
        let uploadJson: { error?: string; url?: string } | null = null

        if (uploadText) {
          try {
            uploadJson = JSON.parse(uploadText) as { error?: string; url?: string }
          } catch {
            uploadJson = null
          }
        }

        if (!uploadRes.ok) {
          const fallbackMessage = uploadRes.status === 413
            ? 'A feltöltött kép túl nagy. Próbálj kisebb vagy jobban tömörített képet feltölteni.'
            : uploadText.trim() || `HTTP ${uploadRes.status}`
          throw new Error(uploadJson?.error ?? fallbackMessage)
        }

        if (!uploadJson?.url) {
          throw new Error('A képfeltöltés sikerült, de a szerver nem adott vissza képcímet.')
        }

        imageUrl = uploadJson.url
      } catch (err) {
        setError(`Képfeltöltés hiba: ${err instanceof Error ? err.message : String(err)}`)
        setSubmitting(false)
        setUploadProgress(null)
        return
      }
    }

    setUploadProgress('Spot mentése…')
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          lat,
          lng,
          radius_visibility: radiusVisibility,
          radius_claim: radiusClaim,
          total_quantity: totalQty,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setSuccess(true)
      onCreated(json.spot)
      // Reset form
      setTitle(''); setDescription(''); setLat(null); setLng(null)
      setRadiusVisibility(500); setRadiusClaim(50); setTotalQty(1)
      setImageFile(null); setImagePreview(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(`Mentési hiba: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSubmitting(false)
      setUploadProgress(null)
    }
  }

  return (
    <div style={s.card}>
      <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>Új matrica spot</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Title */}
        <div>
          <label style={s.label} htmlFor="sp-title">Cím *</label>
          <input id="sp-title" style={s.input} value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Blaha aluljáró" />
        </div>

        {/* Description */}
        <div>
          <label style={s.label} htmlFor="sp-desc">Leírás</label>
          <textarea
            id="sp-desc"
            style={{ ...s.input, resize: 'vertical', minHeight: 60 }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tipp vagy kontextus a megtalálóknak…"
          />
        </div>

        {/* Image upload */}
        <div>
          <label style={s.label}>Borítókép</label>
          {imagePreview ? (
            <div style={{ position: 'relative', marginBottom: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8 }} />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 24, height: 24, cursor: 'pointer', fontSize: 14 }}>
                ×
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={preparingImage}
              style={{ width: '100%', padding: '10px 0', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 8, color: '#71717a', cursor: 'pointer', fontSize: 13 }}>
              {preparingImage ? 'Kép előkészítése…' : '+ Kép hozzáadása'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {/* Map picker */}
        <div>
          <label style={s.label}>Helyszín *</label>
          <MapPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln) }} />
        </div>

        {/* Radii + quantity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div>
            <label style={s.label} htmlFor="sp-vis">Láthatóság (m)</label>
            <input id="sp-vis" type="number" min={1} style={s.input} value={radiusVisibility}
              onChange={e => setRadiusVisibility(Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <label style={s.label} htmlFor="sp-claim">Claim zóna (m)</label>
            <input id="sp-claim" type="number" min={1} style={s.input} value={radiusClaim}
              onChange={e => setRadiusClaim(Math.max(1, Number(e.target.value)))} />
          </div>
          <div>
            <label style={s.label} htmlFor="sp-qty">Darabszám</label>
            <input id="sp-qty" type="number" min={1} style={s.input} value={totalQty}
              onChange={e => setTotalQty(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ margin: 0, padding: '8px 12px', background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.25)', borderRadius: 8, color: '#86efac', fontSize: 13 }}>
            ✓ Spot létrehozva!
          </p>
        )}

        <button type="submit" disabled={submitting || preparingImage} style={{ ...s.btn('#e879f9', submitting || preparingImage), alignSelf: 'flex-start' }}>
          {uploadProgress ?? (preparingImage ? 'Kép előkészítése…' : submitting ? 'Mentés…' : 'Spot létrehozása')}
        </button>
      </form>
    </div>
  )
}

// ── Spot list ──────────────────────────────────────────────────────────────────
interface SpotListProps {
  spots: StickerSpot[]
  adminKey: string
  onStatusChanged: (id: string, status: SpotStatus) => void
  onDeleted: (id: string) => void
}

function SpotList({ spots, adminKey, onStatusChanged, onDeleted }: SpotListProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({})

  async function changeStatus(id: string, status: SpotStatus) {
    setPending(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) onStatusChanged(id, status)
    } finally {
      setPending(p => ({ ...p, [id]: false }))
    }
  }

  async function deleteSpot(id: string) {
    const confirmed = window.confirm('Biztosan torlod ezt a spotot? Ez nem visszavonhato.')
    if (!confirmed) return

    setPending(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id }),
      })
      if (res.ok) onDeleted(id)
    } finally {
      setPending(p => ({ ...p, [id]: false }))
    }
  }

  if (spots.length === 0) {
    return (
      <div style={s.card}>
        <p style={{ margin: 0, color: '#52525b', fontSize: 14 }}>Még nincs spot.</p>
      </div>
    )
  }

  return (
    <div style={s.card}>
      <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Összes spot</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {spots.map(spot => (
          <div key={spot.id} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}>
            {/* Spot image thumbnail */}
            {spot.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={spot.image_url} alt={spot.title}
                style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{spot.title}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
                  background: `${STATUS_COLOR[spot.status as SpotStatus]}22`,
                  color: STATUS_COLOR[spot.status as SpotStatus],
                  border: `1px solid ${STATUS_COLOR[spot.status as SpotStatus]}44`,
                }}>
                  {STATUS_LABEL[spot.status as SpotStatus] ?? spot.status}
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#71717a' }}>
                {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)} &nbsp;·&nbsp;
                Maradt: <strong style={{ color: '#f4f4f5' }}>{spot.remaining_quantity}</strong>/{spot.total_quantity} &nbsp;·&nbsp;
                Vis: {spot.radius_visibility}m &nbsp;·&nbsp; Claim: {spot.radius_claim}m
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {spot.status !== 'active' && (
                  <button
                    disabled={pending[spot.id]}
                    onClick={() => changeStatus(spot.id, 'active')}
                    style={s.btn('#38bdf8', pending[spot.id])}
                  >
                    Aktiválás
                  </button>
                )}
                {spot.status === 'active' && (
                  <button
                    disabled={pending[spot.id]}
                    onClick={() => changeStatus(spot.id, 'empty')}
                    style={s.btn('#fbbf24', pending[spot.id])}
                  >
                    Megjelölés: elfogyott
                  </button>
                )}
                {spot.status !== 'archived' && (
                  <button
                    disabled={pending[spot.id]}
                    onClick={() => changeStatus(spot.id, 'archived')}
                    style={s.btn('#71717a', pending[spot.id])}
                  >
                    Archiválás
                  </button>
                )}
                <button
                  disabled={pending[spot.id]}
                  onClick={() => deleteSpot(spot.id)}
                  style={s.btn('#ef4444', pending[spot.id])}
                >
                  Spot törlése
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MatricaAdminPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useSessionGuard()
  const [adminKey, setAdminKey] = useState<string | null>(null)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [loadingSpots, setLoadingSpots] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/auth?from=/admin/matrica')
    }
  }, [authLoading, session, router])

  const fetchSpots = useCallback(async (key: string) => {
    setLoadingSpots(true)
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        headers: { 'x-admin-key': key },
      })
      if (res.ok) {
        const json = await res.json()
        setSpots(json.spots ?? [])
      }
    } finally {
      setLoadingSpots(false)
    }
  }, [])

  if (authLoading || !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 14 }}>
        {authLoading ? 'Betöltés…' : null}
      </div>
    )
  }

  function handleAuth(key: string) {
    setAdminKey(key)
    fetchSpots(key)
  }

  function handleCreated(spot: StickerSpot) {
    setSpots(prev => [spot, ...prev])
  }

  function handleStatusChanged(id: string, status: SpotStatus) {
    setSpots(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  function handleDeleted(id: string) {
    setSpots(prev => prev.filter(s => s.id !== id))
  }

  if (!adminKey) {
    return <AdminKeyGate onAuth={handleAuth} />
  }

  return (
    <div style={s.page}>
      <MatricaNav />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Matrica admin</h1>
          <button onClick={() => fetchSpots(adminKey)} disabled={loadingSpots}
            style={{ ...s.btn('rgba(255,255,255,0.08)', loadingSpots), color: '#a1a1aa' }}>
            {loadingSpots ? 'Frissítés…' : '↻ Frissítés'}
          </button>
        </div>

        <CreateSpotForm adminKey={adminKey} onCreated={handleCreated} />

        {loadingSpots ? (
          <div style={{ ...s.card, color: '#71717a', fontSize: 14 }}>Betöltés…</div>
        ) : (
          <SpotList spots={spots} adminKey={adminKey} onStatusChanged={handleStatusChanged} onDeleted={handleDeleted} />
        )}
      </div>
    </div>
  )
}

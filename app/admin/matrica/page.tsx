'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
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

// ── Create spot form ───────────────────────────────────────────────────────────
interface CreateFormProps {
  accessToken: string
  onCreated: (spot: StickerSpot) => void
}

const MAX_SPOT_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
const TARGET_SPOT_IMAGE_SIZE_BYTES = 120 * 1024
const MAX_SPOT_IMAGE_DIMENSION = 640
const MIN_SPOT_IMAGE_DIMENSION = 220
const MAX_SPOT_IMAGE_COUNT = 3

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

  const qualitySteps = [0.5, 0.4, 0.32, 0.26, 0.22, 0.18]
  let bestBlob = await canvasToBlob(canvas, qualitySteps[0])

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, quality)
    bestBlob = blob
    if (blob.size <= TARGET_SPOT_IMAGE_SIZE_BYTES) {
      break
    }
  }

  // If still too large, continue with iterative downscaling until we hit target
  // or reach a reasonable minimum dimension.
  let workingCanvas = canvas
  while (
    bestBlob.size > TARGET_SPOT_IMAGE_SIZE_BYTES &&
    (workingCanvas.width > MIN_SPOT_IMAGE_DIMENSION || workingCanvas.height > MIN_SPOT_IMAGE_DIMENSION)
  ) {
    const nextWidth = Math.max(MIN_SPOT_IMAGE_DIMENSION, Math.round(workingCanvas.width * 0.84))
    const nextHeight = Math.max(MIN_SPOT_IMAGE_DIMENSION, Math.round(workingCanvas.height * 0.84))

    if (nextWidth === workingCanvas.width && nextHeight === workingCanvas.height) {
      break
    }

    const downscaledCanvas = document.createElement('canvas')
    downscaledCanvas.width = nextWidth
    downscaledCanvas.height = nextHeight

    const downscaledCtx = downscaledCanvas.getContext('2d')
    if (!downscaledCtx) {
      break
    }

    downscaledCtx.fillStyle = '#111113'
    downscaledCtx.fillRect(0, 0, nextWidth, nextHeight)
    downscaledCtx.drawImage(workingCanvas, 0, 0, nextWidth, nextHeight)
    workingCanvas = downscaledCanvas

    for (const quality of qualitySteps) {
      const blob = await canvasToBlob(workingCanvas, quality)
      bestBlob = blob
      if (blob.size <= TARGET_SPOT_IMAGE_SIZE_BYTES) {
        break
      }
    }
  }

  const outputName = file.name.replace(/\.[^.]+$/, '') || 'spot-cover'

  return new File([bestBlob], `${outputName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}

function CreateSpotForm({ accessToken, onCreated }: CreateFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [radiusVisibility, setRadiusVisibility] = useState(500)
  const [radiusClaim, setRadiusClaim] = useState(50)
  const [totalQty, setTotalQty] = useState(1)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [preparingImage, setPreparingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setError(null)

    if (files.length === 0) {
      return
    }

    const remainingSlots = MAX_SPOT_IMAGE_COUNT - imageFiles.length
    if (remainingSlots <= 0) {
      setError('Maximum 3 fotot tolthetsz fel egy rejtekhelyhez.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const filesToProcess = files.slice(0, remainingSlots)

    setPreparingImage(true)

    try {
      const optimizedFiles: File[] = []
      const previewUrls: string[] = []

      for (const file of filesToProcess) {
        const optimizedFile = await optimizeSpotImage(file)

        if (optimizedFile.size > MAX_SPOT_IMAGE_SIZE_BYTES) {
          throw new Error('Az egyik kep meg tomorites utan is tul nagy. Maximum 8 MB-os kepet tolts fel.')
        }

        optimizedFiles.push(optimizedFile)
        previewUrls.push(URL.createObjectURL(optimizedFile))
      }

      setImageFiles((prev) => [...prev, ...optimizedFiles])
      setImagePreviews((prev) => [...prev, ...previewUrls])

      if (files.length > filesToProcess.length) {
        setError('Maximum 3 foto toltheto fel. A tobbit kihagytuk.')
      }
    } catch (err) {
      setError(`Kép előkészítési hiba: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
      setPreparingImage(false)
    }
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim()) { setError('A cím kötelező.'); return }
    if (lat === null || lng === null) { setError('Kattints a térképre a hely megadásához.'); return }

    setSubmitting(true)

    let imageUrls: string[] = []

    // Upload images if provided
    if (imageFiles.length > 0) {
      try {
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i]
          setUploadProgress(`Kepek feltoltese (${i + 1}/${imageFiles.length})...`)

          if (imageFile.size > MAX_SPOT_IMAGE_SIZE_BYTES) {
            throw new Error('Az egyik kep tul nagy. Maximum 8 MB-os kepet tolts fel.')
          }

          const path = `spot-covers/${Date.now()}-${i + 1}.jpg`

          const fd = new FormData()
          fd.append('file', imageFile)
          fd.append('path', path)

          const uploadRes = await fetch('/api/matrica/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
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
              ? 'A feltoltott kep tul nagy. Probald meg kisebb vagy jobban tomoritett keppel.'
              : uploadText.trim() || `HTTP ${uploadRes.status}`
            throw new Error(uploadJson?.error ?? fallbackMessage)
          }

          if (!uploadJson?.url) {
            throw new Error('A kepfeltoltes sikerult, de a szerver nem adott vissza kepcimet.')
          }

          imageUrls.push(uploadJson.url)
        }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
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
      imagePreviews.forEach((preview) => URL.revokeObjectURL(preview))
      setImageFiles([]); setImagePreviews([])
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
      <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>Új rejtekhely létrehozása</h2>
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
          <label style={s.label}>Fotók (max 3)</label>
          {imagePreviews.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
              {imagePreviews.map((preview, index) => (
                <div key={preview} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt={`preview-${index + 1}`} style={{ width: '100%', height: 92, objectFit: 'cover', borderRadius: 8 }} />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      color: '#fff',
                      width: 22,
                      height: 22,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                    aria-label="Kép törlése"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={preparingImage || imageFiles.length >= MAX_SPOT_IMAGE_COUNT}
            style={{ width: '100%', padding: '10px 0', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', borderRadius: 8, color: '#71717a', cursor: 'pointer', fontSize: 13 }}
          >
            {preparingImage
              ? 'Képek előkészítése…'
              : imageFiles.length >= MAX_SPOT_IMAGE_COUNT
                ? 'Elérted a maximum 3 képet'
                : '+ Képek hozzáadása'}
          </button>
          <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#71717a', lineHeight: 1.35 }}>
            A rendszer erosen tomorit (cel: ~120 KB/kep), hogy minel kisebb adatforgalommal menjen fel.
          </p>
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
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
            <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#71717a', lineHeight: 1.35 }}>
              Ezen a távolságon belül jelenik meg a rejtekhely a térképen.
            </p>
          </div>
          <div>
            <label style={s.label} htmlFor="sp-claim">Claim zóna (m)</label>
            <input id="sp-claim" type="number" min={1} style={s.input} value={radiusClaim}
              onChange={e => setRadiusClaim(Math.max(1, Number(e.target.value)))} />
            <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#71717a', lineHeight: 1.35 }}>
              Ennyire közel kell menni, hogy a megtaláló rögzíthesse a találatot.
            </p>
          </div>
          <div>
            <label style={s.label} htmlFor="sp-qty">Darabszám</label>
            <input id="sp-qty" type="number" min={1} style={s.input} value={totalQty}
              onChange={e => setTotalQty(Math.max(1, Number(e.target.value)))} />
            <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#71717a', lineHeight: 1.35 }}>
              Hány darab tárgy rejthető itt összesen.
            </p>
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, padding: '8px 12px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', fontSize: 13 }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ margin: 0, padding: '8px 12px', background: 'rgba(134,239,172,0.1)', border: '1px solid rgba(134,239,172,0.25)', borderRadius: 8, color: '#86efac', fontSize: 13 }}>
            ✓ Rejtekhely létrehozva!
          </p>
        )}

        <button type="submit" disabled={submitting || preparingImage} style={{ ...s.btn('#e879f9', submitting || preparingImage), alignSelf: 'flex-start' }}>
          {uploadProgress ?? (preparingImage ? 'Kép előkészítése…' : submitting ? 'Mentés…' : 'Rejtekhely létrehozása')}
        </button>
      </form>
    </div>
  )
}

// ── Spot list ──────────────────────────────────────────────────────────────────
interface SpotListProps {
  spots: StickerSpot[]
  accessToken: string
  onStatusChanged: (id: string, status: SpotStatus) => void
  onDeleted: (id: string) => void
}

function SpotList({ spots, accessToken, onStatusChanged, onDeleted }: SpotListProps) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  async function changeStatus(id: string, status: SpotStatus) {
    setPending(p => ({ ...p, [id]: true }))
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id }),
      })
      if (res.ok) onDeleted(id)
    } finally {
      setPending(p => ({ ...p, [id]: false }))
    }
  }

  function openEdit(spot: StickerSpot) {
    setEditId(spot.id)
    setEditTitle(spot.title)
    setEditDesc(spot.description || '')
    setEditError(null)
  }

  function closeEdit() {
    setEditId(null)
    setEditTitle('')
    setEditDesc('')
    setEditError(null)
    setEditLoading(false)
  }

  async function saveEdit() {
    if (!editId) return
    if (!editTitle.trim()) { setEditError('A cím kötelező.'); return }
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id: editId, title: editTitle.trim(), description: editDesc.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      // Update local state
      setEditId(null)
      setEditTitle('')
      setEditDesc('')
      setEditError(null)
      setEditLoading(false)
      // Update parent
      if (json.spot) {
        onStatusChanged(json.spot.id, json.spot.status)
        // Also update title/desc in parent
        // (parent handler should update all fields, not just status)
        // So we call onStatusChanged and let parent update
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err))
      setEditLoading(false)
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
          (() => {
            const coverImage = spot.image_url || spot.image_urls?.[0] || null
            return (
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
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt={spot.title}
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
                <button
                  onClick={() => openEdit(spot)}
                  style={s.btn('#f472b6', false)}
                >
                  Szerkesztés
                </button>
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
            )
          })()
        ))}
      </div>

      {/* Edit modal */}
      {editId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#18181b', borderRadius: 12, padding: 28, minWidth: 320, maxWidth: 380, boxShadow: '0 8px 32px #000a' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 17, fontWeight: 700 }}>Spot szerkesztése</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Cím *</label>
              <input style={s.input} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Leírás</label>
              <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>
            {editError && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 10 }}>{editError}</div>}
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <button onClick={saveEdit} disabled={editLoading} style={s.btn('#38bdf8', editLoading)}>
                {editLoading ? 'Mentés…' : 'Mentés'}
              </button>
              <button onClick={closeEdit} disabled={editLoading} style={s.btn('#71717a', editLoading)}>
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MatricaAdminPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useSessionGuard()
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [loadingSpots, setLoadingSpots] = useState(false)
  const accessToken = (session as any)?.access_token as string | undefined

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/auth?from=/admin/matrica')
    }
  }, [authLoading, session, router])

  const fetchSpots = useCallback(async (token: string) => {
    setLoadingSpots(true)
    try {
      const res = await fetch('/api/admin/matrica/spots', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setSpots(json.spots ?? [])
      }
    } finally {
      setLoadingSpots(false)
    }
  }, [])

  useEffect(() => {
    if (accessToken) {
      void fetchSpots(accessToken)
    }
  }, [accessToken, fetchSpots])

  if (authLoading || !session) {
    return (
      <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 14 }}>
        {authLoading ? 'Betöltés…' : null}
      </div>
    )
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

  return (
    <div style={s.page}>
      <MatricaNav />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => router.push('/matrica')}
              style={{ ...s.btn('rgba(255,255,255,0.08)', false), color: '#d4d4d8' }}
            >
              ✕ Bezár
            </button>
            <button onClick={() => accessToken && fetchSpots(accessToken)} disabled={loadingSpots || !accessToken}
              style={{ ...s.btn('rgba(255,255,255,0.08)', loadingSpots), color: '#a1a1aa' }}>
              {loadingSpots ? 'Frissítés…' : '↻ Frissítés'}
            </button>
          </div>
        </div>

        {accessToken ? <CreateSpotForm accessToken={accessToken} onCreated={handleCreated} /> : null}

        {loadingSpots ? (
          <div style={{ ...s.card, color: '#71717a', fontSize: 14 }}>Betöltés…</div>
        ) : (
          <SpotList spots={spots} accessToken={accessToken ?? ''} onStatusChanged={handleStatusChanged} onDeleted={handleDeleted} />
        )}
      </div>
    </div>
  )
}

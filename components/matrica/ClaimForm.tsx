'use client'

/**
 * ClaimForm
 * Second step of the spot interaction flow.
 * Handles image upload to Supabase Storage and submits to /api/matrica/claim.
 */

import { useRef, useState } from 'react'
import type { StickerSpot } from '@/lib/matrica'
import type { ShowToast } from './useToast'

type ClaimState = 'idle' | 'uploading' | 'submitting' | 'success' | 'error'

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Nem vagy bejelentkezve.',
  unauthenticated: 'Érvénytelen munkamenet. Kérlek jelentkezz be újra.',
  missing_spot_id: 'Hibás spot azonosító.',
  invalid_coordinates: 'Érvénytelen koordináták.',
  spot_not_found: 'Ez a matrica pont nem létezik.',
  spot_unavailable: 'Ez a matrica pont már nem aktív.',
  spot_empty: 'Elfogytak a matricák ennél a pontnál.',
  too_far: 'Túl messze vagy a matrica ponttól.',
  already_claimed: 'Ezt a matricát már korábban igényelted.',
  server_error: 'Szerverhiba. Próbáld újra később.',
}

export interface ClaimSubmitSpotUpdate {
  id: string
  remaining_quantity: number
  status: StickerSpot['status']
}

interface Props {
  spot: StickerSpot
  userLat: number
  userLng: number
  /** Session access token from useSessionGuard */
  accessToken: string
  onSuccess: (spotUpdate?: ClaimSubmitSpotUpdate) => void
  onCancel: () => void
  showToast?: ShowToast
}

export default function ClaimForm({
  spot,
  userLat,
  userLng,
  accessToken,
  onSuccess,
  onCancel,
  showToast,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)      // debounce: prevent double-submit
  const [comment, setComment] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [state, setState] = useState<ClaimState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setSelectedFile(file)
    if (file) {
      setPreview(URL.createObjectURL(file))
    } else {
      setPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return   // debounce guard
    submittingRef.current = true
    setErrorMsg(null)

    let uploadedUrl: string | null = null

    // ── Upload image if provided ─────────────────────────────────────────────
    if (selectedFile) {
      setState('uploading')
      try {
        const ext = selectedFile.name.split('.').pop() ?? 'jpg'
        const fileName = `${spot.id}/${Date.now()}.${ext}`

        const fd = new FormData()
        fd.append('file', selectedFile)
        fd.append('path', fileName)

        const uploadRes = await fetch('/api/matrica/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: fd,
        })

        const uploadJson = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadJson.error ?? `HTTP ${uploadRes.status}`)

        uploadedUrl = uploadJson.url
      } catch (err) {
        setState('error')
        const msg = `Képfeltöltés sikertelen: ${err instanceof Error ? err.message : String(err)}`
        setErrorMsg(msg)
        showToast?.(msg, 'error')
        submittingRef.current = false
        return
      }
    }

    // ── Submit claim ─────────────────────────────────────────────────────────
    setState('submitting')
    try {
      const res = await fetch('/api/matrica/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          spot_id: spot.id,
          user_lat: userLat,
          user_lng: userLng,
          user_image_url: uploadedUrl,
          comment: comment.trim() || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        const key = json?.error as string | undefined
        const msg = key ? (ERROR_MESSAGES[key] ?? json.error) : 'Ismeretlen hiba.'
        setState('error')
        setErrorMsg(msg)
        showToast?.(msg, 'error')
        submittingRef.current = false
        return
      }

      setState('success')
      showToast?.('Igénylés beküldve! Hamarosan átnézzük.', 'success')
      window.dispatchEvent(new CustomEvent('matrica:claim-submitted'))
      onSuccess(json?.spot)
    } catch {
      const msg = 'Hálózati hiba. Ellenőrizd az internetkapcsolatodat.'
      setState('error')
      setErrorMsg(msg)
      showToast?.(msg, 'error')
      submittingRef.current = false
    }
  }

  const busy = state === 'uploading' || state === 'submitting'

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Image upload */}
      <div>
        <label
          style={{ display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 6 }}
          htmlFor="claim-image"
        >
          Fotó (opcionális)
        </label>

        {preview ? (
          <div style={{ position: 'relative', marginBottom: 6 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Előnézet"
              style={{
                width: '100%',
                maxHeight: 180,
                objectFit: 'cover',
                borderRadius: 8,
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                setSelectedFile(null)
                if (fileRef.current) fileRef.current.value = ''
              }}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                borderRadius: '50%',
                color: '#fff',
                width: 24,
                height: 24,
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: '24px',
                textAlign: 'center',
                padding: 0,
              }}
              aria-label="Kép eltávolítása"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'rgba(255,255,255,0.05)',
              border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#71717a',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            + Kép hozzáadása
          </button>
        )}

        <input
          ref={fileRef}
          id="claim-image"
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Comment */}
      <div>
        <label
          style={{ display: 'block', fontSize: 12, color: '#a1a1aa', marginBottom: 6 }}
          htmlFor="claim-comment"
        >
          Megjegyzés (opcionális)
        </label>
        <textarea
          id="claim-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="Pl. hol találtad meg…"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#f4f4f5',
            padding: '8px 10px',
            fontSize: 13,
            resize: 'none',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#52525b' }}>
          {comment.length}/500
        </div>
      </div>

      {/* Error message */}
      {state === 'error' && errorMsg && (
        <p
          style={{
            margin: 0,
            padding: '8px 12px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 8,
            color: '#fca5a5',
            fontSize: 13,
          }}
        >
          {errorMsg}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          style={{
            flex: 1,
            padding: '10px 0',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#a1a1aa',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          Mégsem
        </button>
        <button
          type="submit"
          disabled={busy}
          style={{
            flex: 2,
            padding: '10px 0',
            background: busy ? 'rgba(232,121,249,0.4)' : '#e879f9',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            cursor: busy ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {state === 'uploading'
            ? 'Feltöltés…'
            : state === 'submitting'
              ? 'Küldés…'
              : 'Beküldés'}
        </button>
      </div>
    </form>
  )
}

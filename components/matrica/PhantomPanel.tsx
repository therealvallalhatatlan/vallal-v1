'use client'

import { useEffect, useMemo, useState } from 'react'
import MapPicker from './MapPicker'

interface PhantomProfile {
  session_id: string
  sponsor_id: string | null
  insider_enabled: boolean
  drop_credits: number
  banned_at: string | null
  burn_reason?: string | null
}

interface PhantomDrop {
  id: string
  title?: string | null
  description?: string | null
  code_name: string
  image_url?: string | null
  image_urls?: string[] | null
  location_hint?: string | null
  lat: number
  lng: number
  geofence_meters: number
  is_claimed: boolean
  claimed_at: string | null
  claimed_by_session_id: string | null
  burn_after: string | null
  created_at: string
  distance_meters?: number | null
  can_claim?: boolean
  is_mine?: boolean
}

interface Props {
  isOpen: boolean
  variant?: 'floating' | 'offcanvas'
  showCloseButton?: boolean
  canPublishDrops?: boolean
  authToken: string | null
  shadowSessionId: string | null
  profile: PhantomProfile | null
  drops: PhantomDrop[]
  userLocation: { lat: number; lng: number } | null
  loading: boolean
  onClose: () => void
  onAuthenticate: (payload: { sessionId: string; voucherCode: string }) => Promise<void>
  onStartCreditPurchase: (credits: number) => Promise<string>
  onClaimDrop: (dropId: string) => Promise<void>
  onPublishDrop: (payload: {
    title: string
    description: string
    code_name: string
    image_url: string | null
    image_urls: string[]
    location_hint: string
    lat: number
    lng: number
    geofence_meters: number
  }) => Promise<void>
}

function formatCountdown(iso: string | null): string {
  if (!iso) return '--'
  const diff = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) return '0:00'
  const totalSec = Math.floor(diff / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export default function PhantomPanel({
  isOpen,
  variant = 'floating',
  showCloseButton = true,
  canPublishDrops = false,
  authToken,
  shadowSessionId,
  profile,
  drops,
  userLocation,
  loading,
  onClose,
  onAuthenticate,
  onStartCreditPurchase,
  onClaimDrop,
  onPublishDrop,
}: Props) {
  const [publishTitle, setPublishTitle] = useState('')
  const [publishDescription, setPublishDescription] = useState('')
  const [publishCodeName, setPublishCodeName] = useState('')
  const [publishLocationHint, setPublishLocationHint] = useState('')
  const [publishRadius, setPublishRadius] = useState('120')
  const [publishLat, setPublishLat] = useState<number | null>(null)
  const [publishLng, setPublishLng] = useState<number | null>(null)
  const [publishImageUrls, setPublishImageUrls] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sessionInput, setSessionInput] = useState(shadowSessionId ?? '')
  const [voucherCode, setVoucherCode] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [creditAmount, setCreditAmount] = useState(300)
  const [creditCheckoutLoading, setCreditCheckoutLoading] = useState(false)

  useEffect(() => {
    setSessionInput(shadowSessionId ?? '')
  }, [shadowSessionId])

  useEffect(() => {
    if (publishLat !== null && publishLng !== null) return
    if (!userLocation) return
    setPublishLat(userLocation.lat)
    setPublishLng(userLocation.lng)
  }, [publishLat, publishLng, userLocation])

  const ownDrops = useMemo(() => {
    const rows = drops.filter((drop) => !!drop.is_mine)
    rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return rows
  }, [drops])

  if (!isOpen) return null

  const canUsePhantom = !!authToken && !!shadowSessionId && !profile?.banned_at
  const canPublish = canPublishDrops && canUsePhantom && Number(profile?.drop_credits ?? 0) > 0
  const isOffcanvas = variant === 'offcanvas'
  const panelBlack = '#050505'
  const panelBlackSoft = '#0a0a0a'
  const panelLime = '#a3e635'
  const panelTitle = '#d4d4d8'
  const panelLimeSoft = 'rgba(163,230,53,0.16)'
  const panelLimeBorder = 'rgba(163,230,53,0.45)'
  const panelLimeMuted = 'rgba(163,230,53,0.72)'
  const panelText = '#e4e4e7'

  const normalizedCredits = Number.isFinite(creditAmount) ? Math.max(1, Math.floor(creditAmount)) : 1
  const sliderCredits = Math.min(50000, Math.max(1000, Math.round(normalizedCredits / 1000) * 1000))

  function resetPublishForm() {
    setPublishTitle('')
    setPublishDescription('')
    setPublishCodeName('')
    setPublishLocationHint('')
    setPublishRadius('120')
    setPublishImageUrls([])
    setUploadError(null)
    if (userLocation) {
      setPublishLat(userLocation.lat)
      setPublishLng(userLocation.lng)
    }
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || files.length === 0 || !authToken || !shadowSessionId) return

    setUploadingImages(true)
    setUploadError(null)

    try {
      const uploadedUrls: string[] = []

      for (const file of Array.from(files).slice(0, Math.max(0, 6 - publishImageUrls.length))) {
        const formData = new FormData()
        const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
        formData.append('file', file)
        formData.append('path', `phantom/${shadowSessionId}/${safeName}`)

        const response = await fetch('/api/matrica/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        })

        const json = await response.json().catch(() => ({} as Record<string, unknown>))
        if (!response.ok || typeof json?.url !== 'string') {
          throw new Error(typeof json?.error === 'string' ? json.error : 'upload_failed')
        }

        uploadedUrls.push(json.url)
      }

      setPublishImageUrls((prev) => [...prev, ...uploadedUrls].slice(0, 6))
    } catch {
      setUploadError('Nem sikerult feltolteni a kepet.')
    } finally {
      setUploadingImages(false)
    }
  }

  return (
    <section
      aria-label="Phantom panel"
      style={{
        position: isOffcanvas ? 'relative' : 'absolute',
        top: isOffcanvas ? 0 : 'calc(var(--matrica-header-offset, 90px) + 8px)',
        right: isOffcanvas ? undefined : 10,
        width: isOffcanvas ? '100%' : 'min(390px, calc(100vw - 20px))',
        maxHeight: isOffcanvas ? 'none' : 'calc(100vh - 180px)',
        overflowY: 'auto',
        borderRadius: isOffcanvas ? '0' : 0,
        border: `1px solid ${panelLimeBorder}`,
        background: panelBlack,
        boxShadow: '0 20px 46px rgba(0,0,0,0.6)',
        color: panelLime,
        zIndex: isOffcanvas ? 1 : 120,
      }}
    >
      <div style={{ padding: '12px', display: 'grid', gap: 10 }}>
        {showCloseButton ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelBlackSoft,
                color: panelLime,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        ) : null}

        <div
          style={{
            border: `1px solid ${panelLimeBorder}`,
            borderRadius: 0,
            padding: 10,
            background: panelBlackSoft,
            display: 'grid',
            gap: 6,
            fontSize: 12,
            color: panelLime,
          }}
        >
          <div><strong>Session:</strong> <span style={{ color: panelText }}>{shadowSessionId || 'nincs megadva'}</span></div>
          <div><strong>Jog:</strong> <span style={{ color: panelText }}>{profile?.insider_enabled ? 'insider' : 'normal user'}</span></div>
          <div><strong>Drop credit:</strong> <span style={{ color: panelText }}>{profile?.drop_credits ?? 0}</span></div>
          <div><strong>Allapot:</strong> <span style={{ color: panelText }}>{profile?.banned_at ? 'tiltott' : 'aktiv'}</span></div>
          {profile?.burn_reason ? <div>Ok: {profile.burn_reason}</div> : null}
        </div>

        <div
          style={{
            border: `1px solid ${panelLimeBorder}`,
            borderRadius: 0,
            padding: 10,
            background: panelBlackSoft,
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: panelTitle, fontWeight: 700 }}>AZONOSITAS</div>
          <div style={{ fontSize: 12, color: panelLimeMuted }}>Session ID es Titkos Jelszo megadasa.</div>
          <input
            value={sessionInput}
            onChange={(event) => setSessionInput(event.target.value)}
            placeholder="Session ID"
            style={{
              border: `1px solid ${panelLimeBorder}`,
              borderRadius: 0,
              background: panelBlack,
              color: panelLime,
              padding: '8px 9px',
              fontSize: 12,
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="Titkos Jelszo"
              style={{
                flex: 1,
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelBlack,
                color: panelLime,
                padding: '8px 9px',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              disabled={!authToken || loading || authSubmitting || !sessionInput.trim() || !voucherCode.trim()}
              onClick={async () => {
                setAuthSubmitting(true)
                try {
                  await onAuthenticate({
                    sessionId: sessionInput.trim(),
                    voucherCode: voucherCode.trim(),
                  })
                  setVoucherCode('')
                } finally {
                  setAuthSubmitting(false)
                }
              }}
              style={{
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelLimeSoft,
                color: panelLime,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                opacity: !authToken || loading || authSubmitting || !sessionInput.trim() || !voucherCode.trim() ? 0.5 : 1,
              }}
            >
              {loading || authSubmitting ? '...' : 'Kuldes'}
            </button>
          </div>
          {!authToken ? <div style={{ fontSize: 11, color: panelLimeMuted }}>Bejelentkezes szukseges.</div> : null}
        </div>

        <div
          style={{
            border: `1px solid ${panelLimeBorder}`,
            borderRadius: 0,
            padding: 10,
            background: panelBlackSoft,
            display: 'grid',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: panelTitle, fontWeight: 700 }}>KREDIT VASARLASA</div>
          <div style={{ fontSize: 12, color: panelLimeMuted }}>1 ft = 1 kredit</div>

          <input
            className="phantom-credit-range"
            type="range"
            min={1000}
            max={50000}
            step={1000}
            value={sliderCredits}
            onChange={(event) => setCreditAmount(Number(event.target.value) || 1)}
            style={{ width: '100%' }}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              min={1}
              step={1}
              value={normalizedCredits}
              onChange={(event) => {
                const next = Number(event.target.value)
                setCreditAmount(Number.isFinite(next) ? next : 1)
              }}
              style={{
                flex: 1,
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelBlack,
                color: panelLime,
                padding: '8px 9px',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              disabled={!authToken || creditCheckoutLoading || !shadowSessionId || normalizedCredits < 1}
              onClick={async () => {
                if (typeof window === 'undefined') return

                const popup = window.open('', 'phantom-credit-checkout', 'popup=yes,width=520,height=760')

                if (popup) {
                  popup.document.write('<title>Fizetes inditasa...</title><body style="margin:0;background:#050505;color:#a3e635;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh">Fizetes inditasa...</body>')
                  popup.document.close()
                }

                setCreditCheckoutLoading(true)
                try {
                  const checkoutUrl = await onStartCreditPurchase(normalizedCredits)
                  if (popup) {
                    popup.location.href = checkoutUrl
                  } else {
                    window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
                  }
                } catch {
                  if (popup && !popup.closed) popup.close()
                } finally {
                  setCreditCheckoutLoading(false)
                }
              }}
              style={{
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelLimeSoft,
                color: panelLime,
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                opacity: !authToken || creditCheckoutLoading || !shadowSessionId || normalizedCredits < 1 ? 0.5 : 1,
              }}
            >
              {creditCheckoutLoading ? '...' : 'Fizetes'}
            </button>
          </div>
        </div>

        {canPublishDrops ? (
          <div style={{ borderTop: `1px solid ${panelLimeBorder}`, paddingTop: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: panelTitle, fontWeight: 700 }}>EDITOR - FANTOM SZPOT LETREHOZASA</div>
            <div style={{ marginTop: 6, fontSize: 12, color: panelLimeMuted }}>
              Uj fantom szpot letrehozasa keppel, leirassal es valasztott helyponttal.
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <input
                value={publishTitle}
                onChange={(event) => setPublishTitle(event.target.value)}
                placeholder="Cim"
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelBlack,
                  color: panelText,
                  padding: '8px 9px',
                  fontSize: 12,
                }}
              />
              <textarea
                value={publishDescription}
                onChange={(event) => setPublishDescription(event.target.value)}
                placeholder="Leiras"
                rows={4}
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelBlack,
                  color: panelText,
                  padding: '8px 9px',
                  fontSize: 12,
                  resize: 'vertical',
                }}
              />
              <input
                value={publishCodeName}
                onChange={(event) => setPublishCodeName(event.target.value)}
                placeholder="Kodnev (pl. ghost-01)"
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelBlack,
                  color: panelText,
                  padding: '8px 9px',
                  fontSize: 12,
                }}
              />
              <input
                value={publishLocationHint}
                onChange={(event) => setPublishLocationHint(event.target.value)}
                placeholder="Helyleiras / hint"
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelBlack,
                  color: panelText,
                  padding: '8px 9px',
                  fontSize: 12,
                }}
              />
              <input
                value={publishRadius}
                onChange={(event) => setPublishRadius(event.target.value)}
                placeholder="Geofence meter (pl. 120)"
                inputMode="numeric"
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelBlack,
                  color: panelText,
                  padding: '8px 9px',
                  fontSize: 12,
                }}
              />
              <div style={{ display: 'grid', gap: 8, border: `1px solid ${panelLimeBorder}`, padding: 10, background: panelBlack }}>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', color: panelLimeMuted, fontWeight: 700 }}>HELYPONT</div>
                <MapPicker
                  lat={publishLat}
                  lng={publishLng}
                  onChange={(lat, lng) => {
                    setPublishLat(lat)
                    setPublishLng(lng)
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 8, border: `1px solid ${panelLimeBorder}`, padding: 10, background: panelBlack }}>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', color: panelLimeMuted, fontWeight: 700 }}>KEPEK</div>
                <label
                  style={{
                    border: `1px solid ${panelLimeBorder}`,
                    background: panelLimeSoft,
                    color: panelLime,
                    padding: '8px 10px',
                    fontSize: 12,
                    cursor: uploadingImages ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    width: 'fit-content',
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handleImageUpload(event.target.files)
                      event.currentTarget.value = ''
                    }}
                    style={{ display: 'none' }}
                  />
                  {uploadingImages ? 'Feltoltes...' : 'Kepek feltoltese'}
                </label>
                {uploadError ? <div style={{ fontSize: 11, color: '#fca5a5' }}>{uploadError}</div> : null}
                {publishImageUrls.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: 8 }}>
                    {publishImageUrls.map((url, index) => (
                      <div key={url} style={{ display: 'grid', gap: 6 }}>
                        <img
                          src={url}
                          alt={`Phantom kep ${index + 1}`}
                          style={{ width: '100%', height: 76, objectFit: 'cover', border: `1px solid ${panelLimeBorder}` }}
                        />
                        <button
                          type="button"
                          onClick={() => setPublishImageUrls((prev) => prev.filter((item) => item !== url))}
                          style={{
                            border: `1px solid ${panelLimeBorder}`,
                            background: panelBlackSoft,
                            color: panelLimeMuted,
                            padding: '4px 6px',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          Torles
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!canPublish || publishing || !publishTitle.trim() || !publishCodeName.trim() || publishLat === null || publishLng === null}
                onClick={async () => {
                  setPublishing(true)
                  try {
                    const geofence = Number(publishRadius)
                    await onPublishDrop({
                      title: publishTitle.trim(),
                      description: publishDescription.trim(),
                      code_name: publishCodeName.trim(),
                      image_url: publishImageUrls[0] ?? null,
                      image_urls: publishImageUrls,
                      location_hint: publishLocationHint.trim(),
                      lat: publishLat ?? 0,
                      lng: publishLng ?? 0,
                      geofence_meters: Number.isFinite(geofence) ? geofence : 120,
                    })
                    resetPublishForm()
                  } finally {
                    setPublishing(false)
                  }
                }}
                style={{
                  border: `1px solid ${panelLimeBorder}`,
                  borderRadius: 0,
                  background: panelLimeSoft,
                  color: panelLime,
                  padding: '8px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: !canPublish || publishing || !publishTitle.trim() || !publishCodeName.trim() || publishLat === null || publishLng === null ? 0.5 : 1,
                }}
              >
                {publishing ? 'Publikalas...' : 'Fantom szpot publikasa'}
              </button>
            </div>

            {!canUsePhantom ? (
              <div style={{ marginTop: 6, fontSize: 11, color: panelLimeMuted }}>
                A Phantom jelenleg nem hasznalhato ezzel a sessionnel.
              </div>
            ) : Number(profile?.drop_credits ?? 0) <= 0 ? (
              <div style={{ marginTop: 6, fontSize: 11, color: panelLimeMuted }}>
                Nincs eleg drop credited az uj szpot publikalasahoz.
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ borderTop: `1px solid ${panelLimeBorder}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: panelTitle, fontWeight: 700, marginBottom: 8 }}>
            SAJAT DROPOK
          </div>

          {ownDrops.length === 0 ? (
            <div style={{ fontSize: 12, color: panelLimeMuted }}>Meg nincs sajat dropod.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {ownDrops.map((drop) => {
                return (
                  <article
                    key={drop.id}
                    style={{
                      border: `1px solid ${panelLimeBorder}`,
                      borderRadius: 0,
                      background: panelBlackSoft,
                      padding: 9,
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    {drop.image_url ? (
                      <img
                        src={drop.image_url}
                        alt={drop.title || drop.code_name}
                        style={{ width: '100%', height: 120, objectFit: 'cover', border: `1px solid ${panelLimeBorder}` }}
                      />
                    ) : null}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: 12, color: panelText }}>{drop.title || drop.code_name}</strong>
                      <span style={{ fontSize: 11, color: panelLimeMuted }}>{drop.is_claimed ? 'claimed' : 'active'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: panelLimeMuted }}>{drop.code_name}</div>
                    {drop.description ? <div style={{ fontSize: 12, color: panelText, lineHeight: 1.45 }}>{drop.description}</div> : null}
                    {drop.location_hint ? <div style={{ fontSize: 11, color: panelLimeMuted }}>Hint: {drop.location_hint}</div> : null}
                    <div style={{ fontSize: 11, color: panelLimeMuted }}>
                      Geo: {drop.geofence_meters} m | {drop.lat.toFixed(5)}, {drop.lng.toFixed(5)}
                    </div>
                    {drop.is_claimed ? (
                      <div style={{ fontSize: 11, color: panelLimeMuted }}>Burn: {formatCountdown(drop.burn_after)}</div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .phantom-credit-range {
          -webkit-appearance: none;
          appearance: none;
          height: 22px;
          background: transparent;
          cursor: pointer;
        }

        .phantom-credit-range::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 0;
          background: linear-gradient(90deg, rgba(163,230,53,0.95), rgba(163,230,53,0.55));
          border: 1px solid rgba(163,230,53,0.65);
          box-shadow: 0 0 10px rgba(163,230,53,0.28);
        }

        .phantom-credit-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 0;
          background: #a3e635;
          border: 1px solid rgba(212,212,216,0.9);
          margin-top: -7px;
          box-shadow: 0 0 0 2px rgba(163,230,53,0.3), 0 0 14px rgba(163,230,53,0.95);
        }

        .phantom-credit-range::-moz-range-track {
          height: 6px;
          border-radius: 0;
          background: linear-gradient(90deg, rgba(163,230,53,0.95), rgba(163,230,53,0.55));
          border: 1px solid rgba(163,230,53,0.65);
          box-shadow: 0 0 10px rgba(163,230,53,0.28);
        }

        .phantom-credit-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 0;
          background: #a3e635;
          border: 1px solid rgba(212,212,216,0.9);
          box-shadow: 0 0 0 2px rgba(163,230,53,0.3), 0 0 14px rgba(163,230,53,0.95);
        }
      `}</style>
    </section>
  )
}

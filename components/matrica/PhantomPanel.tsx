'use client'

import { useEffect, useState } from 'react'
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
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    setSessionInput(shadowSessionId ?? '')
  }, [shadowSessionId])

  useEffect(() => {
    if (publishLat !== null && publishLng !== null) return
    if (!userLocation) return
    setPublishLat(userLocation.lat)
    setPublishLng(userLocation.lng)
  }, [publishLat, publishLng, userLocation])

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
        maxWidth: isOffcanvas ? '940px' : undefined,
        margin: isOffcanvas ? '0 auto' : undefined,
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
          <div
            style={{
              marginTop: 2,
              border: `1px solid ${panelLimeBorder}`,
              background: panelBlack,
              padding: '8px 9px',
              fontSize: 22,
              color: panelLimeMuted,
              lineHeight: 1.5,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ color: panelText, fontWeight: 700 }}>Elmondom, hogy működik.</div>
            <div>Az egész város a játékterünk.</div>
            <div>
              De a játéknak van egy szupertitkos, felnőttesebb rétege is, amihez csak egy nagyon ügyes trükkel lehet csatlakozni.
            </div>

            <div style={{ color: panelText, fontWeight: 700 }}>1. A BOLT</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 6 }}>
              <li>
                Mit csinálsz? Elmész egy sima, mezei weboldalra, és veszel egy tök cool pólót, vagy egy sorszámozott matricát. Egy túlárazott Támogatói Csomagot. Ez teljesen legális. Kifizeted pénzzel.
              </li>
              <li>
                Mi történik utána? Az eladó küld neked emailben egy Titkos Jelszót (egy hosszú kódot). Itt még senki sem tudja, hogy te a kincsvadászat titkos részén is játszol. Ez a vásárlás teljesen olyan, mint bárki másé.
              </li>
            </ul>

            <div style={{ color: panelText, fontWeight: 700 }}>2. A JÁTÉK</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 6 }}>
              <li>
                Megnyitod a térképes oldalt a telefonodon. De ez a sima térkép még unalmas. Ha hosszan nyomod a középső gombot - hoppá, megjelenik egy rejtett doboz.
              </li>
              <li>
                Beírod a saját titkos becenevedet (a Session ID-dat), hogy a rendszer felismerje: „Jé, hát te egy belsős vagy!” Miért Session? Szükségem van egy azonosítóra ami nem köthető a személyedhez. Nem emailcím, nem név, nem telefonszám de mégis permanens, és hozzád kötődik. A Session erre tökéletes.
              </li>
            </ul>

            <div style={{ color: panelText, fontWeight: 700 }}>3. A VARÁZSLAT</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 6 }}>
              <li>
                Beírod a Titkos Jelszót, amit az emailben kaptál a Támogatói Csomagodért cserébe.
              </li>
              <li>
                Mi történik a háttérben? A gép ellenőrzi: „Aha, ezt a kódot tényleg kifizették.” De a gép <strong>soha</strong> nem köti össze a te nevedet vagy a bankkártyádat a titkos beceneveddel (ami a Session ID-d). A két dolog teljesen külön fut. Olyan, mintha az egyik zsebedbe tennéd a blokkot, a másikba meg a kincsesláda kulcsát, és a kettő soha nem találkozhatna.
              </li>
            </ul>

            <div style={{ color: panelText, fontWeight: 700 }}>4. A VADÁSZAT</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 6 }}>
              <li>
                Mi történik most? A gép jóváír neked egy Drop Kredit pontot. A térkép megmutat egy zónát a városban. Odasétálsz a zónába a telefonoddal. Amikor odaérsz, a GPS-ed jelez, és a térkép megmutatja a pontos helyet: „Ott van a pad alatt egy kis csomag!” Ez egy újabb védvonal (Geofencing) ami a védelmünket szolgálja.
              </li>
              <li>
                És a végén a tűzijáték: Odamész, elhozod a csomagot (amiben benne van a könyv, póló, meg a meglepi cucc) és ráklikkelsz a telefonon, hogy megvan. Ekkor a gép egy belső órával elszámol: 10 perc múlva az egész helyszín nyom nélkül eltűnik a térképről, mintha ott sem lett volna.
              </li>
            </ul>

            <div>
              Senki sem tudja, ki vette el, ki tette oda, és hogy ki fizetett érte. Csak annyit látnak, hogy volt egy merch-vásárlás, meg egy titkos játékos a térképen, de a kettő között elvágták a drótot.
            </div>
          </div>
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
            <button
              type="button"
              onClick={() => setEditorOpen((prev) => !prev)}
              style={{
                width: '100%',
                border: `1px solid ${panelLimeBorder}`,
                borderRadius: 0,
                background: panelBlackSoft,
                color: panelTitle,
                padding: '8px 10px',
                fontSize: 11,
                letterSpacing: '0.08em',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
              aria-expanded={editorOpen}
              aria-controls="phantom-editor-panel"
            >
              <span>EDITOR - FANTOM SZPOT LETREHOZASA</span>
              <span aria-hidden="true" style={{ color: panelLime }}>{editorOpen ? '−' : '+'}</span>
            </button>

            {editorOpen ? (
              <>
                <div style={{ marginTop: 8, fontSize: 12, color: panelLimeMuted }}>
                  Uj fantom szpot letrehozasa keppel, leirassal es valasztott helyponttal.
                </div>

                <div id="phantom-editor-panel" style={{ display: 'grid', gap: 8, marginTop: 8 }}>
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
              </>
            ) : null}
          </div>
        ) : null}
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

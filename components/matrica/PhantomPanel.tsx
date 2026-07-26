'use client'

import { useMemo, useState } from 'react'
import { getDistanceMeters } from '@/lib/matrica'

interface UserLocation {
  lat: number
  lng: number
}

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
  code_name: string
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
  userLocation: UserLocation | null
  loading: boolean
  onClose: () => void
  onRefresh: () => void
  onClaimDrop: (dropId: string) => Promise<void>
  onPublishDrop: (payload: { code_name: string; geofence_meters: number }) => Promise<void>
  onRedeemVoucher: (voucherCode: string) => Promise<void>
}

function formatDistance(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '--'
  if (value < 1000) return `${Math.round(value)} m`
  return `${(value / 1000).toFixed(1)} km`
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
  onRefresh,
  onClaimDrop,
  onPublishDrop,
  onRedeemVoucher,
}: Props) {
  const [publishCodeName, setPublishCodeName] = useState('')
  const [publishRadius, setPublishRadius] = useState('120')
  const [publishing, setPublishing] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [claimingDropId, setClaimingDropId] = useState<string | null>(null)

  const sortedDrops = useMemo(() => {
    const rows = [...drops]
    rows.sort((a, b) => {
      const da = typeof a.distance_meters === 'number' ? a.distance_meters : Number.POSITIVE_INFINITY
      const db = typeof b.distance_meters === 'number' ? b.distance_meters : Number.POSITIVE_INFINITY
      return da - db
    })
    return rows
  }, [drops])

  const visibleDrops = useMemo(() => sortedDrops.slice(0, 8), [sortedDrops])

  if (!isOpen) return null

  const canUsePhantom = !!authToken && !!shadowSessionId && !profile?.banned_at
  const canPublish = canPublishDrops && canUsePhantom && Number(profile?.drop_credits ?? 0) > 0
  const sessionShort = shadowSessionId ? `${shadowSessionId.slice(0, 8)}...` : 'nincs'
  const isOffcanvas = variant === 'offcanvas'

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
        border: '1px solid rgba(148,163,184,0.24)',
        background: 'linear-gradient(180deg, rgba(8,10,12,0.98), rgba(3,6,8,0.98))',
        boxShadow: '0 20px 46px rgba(0,0,0,0.5)',
        color: '#e2e8f0',
        zIndex: isOffcanvas ? 1 : 120,
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 8px' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 800, color: '#86efac' }}>PHANTOM LAYER</div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3 }}>Titkos jatekmod</div>
        </div>
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: '1px solid rgba(148,163,184,0.35)',
              borderRadius: 0,
              background: 'rgba(15,23,42,0.72)',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            x
          </button>
        ) : (
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 5,
              borderRadius: 0,
              background: 'rgba(148,163,184,0.42)',
            }}
          />
        )}
      </header>

      <div style={{ padding: '0 12px 12px', display: 'grid', gap: 10 }}>
        <div
          style={{
            border: '1px solid rgba(148,163,184,0.24)',
            borderRadius: 0,
            padding: 10,
            background: 'rgba(2,6,23,0.75)',
            display: 'grid',
            gap: 6,
            fontSize: 12,
            color: '#cbd5e1',
          }}
        >
          <div><strong style={{ color: '#86efac' }}>Sess:</strong> {sessionShort}</div>
          <div><strong style={{ color: '#86efac' }}>Jog:</strong> {profile?.insider_enabled ? 'insider' : 'normal user'}</div>
          <div><strong style={{ color: '#86efac' }}>Drop credit:</strong> {profile?.drop_credits ?? 0}</div>
          <div><strong style={{ color: '#86efac' }}>Allapot:</strong> {profile?.banned_at ? 'tiltott' : 'aktiv'}</div>
          {profile?.burn_reason ? <div>Ok: {profile.burn_reason}</div> : null}
        </div>

        <div
          style={{
            border: '1px solid rgba(148,163,184,0.24)',
            borderRadius: 0,
            padding: 10,
            background: 'rgba(2,6,23,0.58)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#86efac', fontWeight: 700 }}>HOGYAN MUKODIK</div>
          <div
            style={{
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 0,
              background: 'rgba(15,23,42,0.55)',
              padding: 10,
              maxHeight: 260,
              overflowY: 'auto',
              display: 'grid',
              gap: 10,
              fontSize: 17,
              lineHeight: 1.55,
              color: '#e2e8f0',
            }}
          >
            <p style={{ margin: 0 }}>
              A jateknak van egy szupertitkos, felnottesebb retege is, amihez csak egy nagyon ugyes trukkel
              lehet csatlakozni.
            </p>

            <p style={{ margin: 0, color: '#86efac', fontWeight: 700 }}>1. A BOLT</p>
            <p style={{ margin: 0 }}>
              - Mit csinalsz? Elmesz egy sima, mezei weboldalra, es veszel egy tok cool polot, vagy egy
              sorszamozott matricat. Egy tularazott Tamogatoi Csomagot. Ez teljesen legalis. Kifizeted penzzel.
            </p>
            <p style={{ margin: 0 }}>
              - Mi tortenik utana? Az elado kuld neked emailben egy Titkos Jelszot (egy hosszu kodot). Itt meg
              senki sem tudja, hogy te a kincsvadaszat titkos reszen is jatszol. Ez a vasarlas teljesen olyan,
              mint barki mase.
            </p>

            <p style={{ margin: 0, color: '#86efac', fontWeight: 700 }}>2. A JATEK</p>
            <p style={{ margin: 0 }}>
              - Megnyitod a terkepes oldalt a telefonodon. De ez a sima terkep meg unalmas. Ha hosszan nyomod a
              kozepso gombot, hoppa, megjelenik egy rejtett doboz.
            </p>
            <p style={{ margin: 0 }}>
              - Beirod a sajat titkos becenevedet (a Session ID-dat), hogy a rendszer felismerje: "Je, hat te egy
              belsos vagy!" Miert Session ID? Szuksegem van egy azonositora, ami nem kotheto a szemelyedhez. Nem
              emailcim, nem nev, nem telefonszam, de megis permanens, es hozzad kotodik. A Session erre tokeletes.
            </p>

            <p style={{ margin: 0, color: '#86efac', fontWeight: 700 }}>3. A VARAZSLAT</p>
            <p style={{ margin: 0 }}>
              - Beirod a Titkos Jelszot, amit az emailben kaptal a Tamogatoi Csomagodert cserebe.
            </p>
            <p style={{ margin: 0 }}>
              - Mi tortenik a hatterben? A gep ellenorzi: "Aha, ezt a kodot tenyleg kifizettek." De a gep soha nem
              koti ossze a te nevedet vagy a bankkartyadat a titkos beceneveddel (ami a Session ID-d). A ket dolog
              teljesen kulon fut. Olyan, mintha az egyik zsebedbe tenned a blokkot, a masikba meg a kincseslada
              kulcsat, es a ketto soha nem talalkozhatna.
            </p>

            <p style={{ margin: 0, color: '#86efac', fontWeight: 700 }}>4. A VADASZAT</p>
            <p style={{ margin: 0 }}>
              - Mi tortenik most? A gep jovair neked egy Drop Kredit pontot. A terkep megmutat egy zonat a
              varosban. Odasetalsz a zonaba a telefonoddal. Amikor odaersz, a GPS-ed jelez, es a terkep megmutatja
              a pontos helyet: "Ott van a pad alatt egy kis csomag!" Ez egy ujabb vedvonal (Geofencing), ami a
              vedelmunket szolgalja.
            </p>
            <p style={{ margin: 0 }}>
              - Es a vegen a tuzijatek: Odamesz, elhozod a csomagot (amiben benne van a konyv, polo, meg a
              meglepi cucc), es raklikkelsz a telefonon, hogy megvan. Ekkor a gep egy belso oraval elszamol: 10
              perc mulva az egesz helyszin nyom nelkul eltunik a terkeprol, mintha ott sem lett volna.
            </p>
            <p style={{ margin: 0 }}>
              Senki sem tudja, ki vette el, ki tette oda, es hogy ki fizetett erte. Csak annyit latnak, hogy volt
              egy merch-vasarlas, meg egy titkos jatekos a terkepen, de a ketto kozott elvagtak a drotot.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            style={{
              flex: 1,
              border: '1px solid rgba(148,163,184,0.35)',
              borderRadius: 0,
              background: 'rgba(15,23,42,0.8)',
              color: '#e2e8f0',
              padding: '8px 10px',
              fontSize: 12,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Frissites...' : 'Frissites'}
          </button>
        </div>

        <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#86efac', fontWeight: 700 }}>1) TITKOS JELSZO MEGADASA</div>
          <div style={{ marginTop: 6, fontSize: 12, color: '#fef3c7' }}>
            Add meg a kodot amit emailben kuldtem.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={voucherCode}
              onChange={(event) => setVoucherCode(event.target.value)}
              placeholder="PH-XXXX"
              style={{
                flex: 1,
                border: '1px solid rgba(148,163,184,0.3)',
                borderRadius: 0,
                background: 'rgba(2,6,23,0.82)',
                color: '#e2e8f0',
                padding: '8px 9px',
                fontSize: 12,
              }}
            />
            <button
              type="button"
              disabled={!canUsePhantom || redeeming || !voucherCode.trim()}
              onClick={async () => {
                setRedeeming(true)
                try {
                  await onRedeemVoucher(voucherCode.trim())
                  setVoucherCode('')
                } finally {
                  setRedeeming(false)
                }
              }}
              style={{
                border: '1px solid rgba(34,197,94,0.35)',
                borderRadius: 0,
                background: 'rgba(8,29,17,0.9)',
                color: '#bbf7d0',
                padding: '8px 10px',
                fontSize: 12,
                cursor: 'pointer',
                opacity: !canUsePhantom || redeeming || !voucherCode.trim() ? 0.5 : 1,
              }}
            >
              {redeeming ? '...' : 'Kuldes'}
            </button>
          </div>
          {!canUsePhantom ? (
            <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5' }}>
              A Phantom jelenleg nem hasznalhato ezzel a sessionnel.
            </div>
          ) : null}
        </div>

        {canPublishDrops ? (
          <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#86efac', fontWeight: 700 }}>2) EDITOR - FANTOM SZPOT LETREHOZASA</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1' }}>
              Uj fantom szpot letrehozasa a sajat aktualis poziciodon.
            </div>

            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
              <input
                value={publishCodeName}
                onChange={(event) => setPublishCodeName(event.target.value)}
                placeholder="Kodnev (pl. ghost-01)"
                style={{
                  border: '1px solid rgba(148,163,184,0.3)',
                  borderRadius: 0,
                  background: 'rgba(2,6,23,0.82)',
                  color: '#e2e8f0',
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
                  border: '1px solid rgba(148,163,184,0.3)',
                  borderRadius: 0,
                  background: 'rgba(2,6,23,0.82)',
                  color: '#e2e8f0',
                  padding: '8px 9px',
                  fontSize: 12,
                }}
              />
              <button
                type="button"
                disabled={!canPublish || publishing || !publishCodeName.trim()}
                onClick={async () => {
                  setPublishing(true)
                  try {
                    const geofence = Number(publishRadius)
                    await onPublishDrop({
                      code_name: publishCodeName.trim(),
                      geofence_meters: Number.isFinite(geofence) ? geofence : 120,
                    })
                    setPublishCodeName('')
                  } finally {
                    setPublishing(false)
                  }
                }}
                style={{
                  border: '1px solid rgba(34,197,94,0.35)',
                  borderRadius: 0,
                  background: 'rgba(8,29,17,0.9)',
                  color: '#bbf7d0',
                  padding: '8px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  opacity: !canPublish || publishing || !publishCodeName.trim() ? 0.5 : 1,
                }}
              >
                {publishing ? 'Publikalas...' : 'Fantom szpot publikasa'}
              </button>
            </div>

            {!canUsePhantom ? (
              <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5' }}>
                A Phantom jelenleg nem hasznalhato ezzel a sessionnel.
              </div>
            ) : Number(profile?.drop_credits ?? 0) <= 0 ? (
              <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5' }}>
                Nincs eleg drop credited az uj szpot publikalasahoz.
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ borderTop: '1px solid rgba(148,163,184,0.2)', paddingTop: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.08em', color: '#86efac', fontWeight: 700, marginBottom: 8 }}>
            {canPublishDrops ? '3) KOZELI DROPOK' : '2) KOZELI DROPOK'}
          </div>
          <div style={{ marginBottom: 8, fontSize: 12, color: '#fef3c7' }}>
            Claimhez a tavolsagnak a geofence-en belul kell lennie.
          </div>

          {visibleDrops.length === 0 ? (
            <div style={{ fontSize: 12, color: '#a16207' }}>Nincs aktiv drop. Publish utan itt fog megjelenni.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {visibleDrops.map((drop) => {
                const computedDistance =
                  typeof drop.distance_meters === 'number'
                    ? drop.distance_meters
                    : (userLocation ? getDistanceMeters(userLocation.lat, userLocation.lng, drop.lat, drop.lng) : null)

                const canClaim = !!canUsePhantom && !drop.is_claimed && computedDistance !== null && computedDistance <= drop.geofence_meters

                return (
                  <article
                    key={drop.id}
                    style={{
                      border: '1px solid rgba(148,163,184,0.26)',
                      borderRadius: 0,
                      background: 'rgba(2,6,23,0.7)',
                      padding: 9,
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: 12, color: '#e2e8f0' }}>{drop.code_name}</strong>
                      <span style={{ fontSize: 11, color: '#86efac' }}>{drop.is_claimed ? 'claimed' : 'active'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1' }}>
                      Tav: {formatDistance(computedDistance)} | Geofence: {drop.geofence_meters} m
                    </div>
                    {drop.is_claimed ? (
                      <div style={{ fontSize: 11, color: '#86efac' }}>Burn: {formatCountdown(drop.burn_after)}</div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!canClaim || claimingDropId === drop.id}
                      onClick={async () => {
                        setClaimingDropId(drop.id)
                        try {
                          await onClaimDrop(drop.id)
                        } finally {
                          setClaimingDropId(null)
                        }
                      }}
                      style={{
                        border: '1px solid rgba(34,197,94,0.35)',
                        borderRadius: 0,
                        background: canClaim ? 'rgba(8,29,17,0.9)' : 'rgba(15,23,42,0.5)',
                        color: canClaim ? '#bbf7d0' : '#94a3b8',
                        padding: '7px 9px',
                        fontSize: 12,
                        cursor: canClaim ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {claimingDropId === drop.id ? 'Claim...' : canClaim ? 'Claim drop' : 'Tavol vagy / lockolt'}
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

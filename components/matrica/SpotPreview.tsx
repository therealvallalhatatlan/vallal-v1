'use client'

import type { StickerSpot } from '@/lib/matrica'

interface SpotPreviewAnchor {
  x: number
  y: number
}

interface Props {
  spot: StickerSpot | null
  approxDistance: string
  isMobile: boolean
  isPaid: boolean
  isLocked: boolean
  priceHuf: number
  unlocking: boolean
  anchor: SpotPreviewAnchor | null
  onClose: () => void
  onStartRoute?: (spot: StickerSpot) => void
  onUnlock?: (spot: StickerSpot) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export default function SpotPreview({
  spot,
  approxDistance,
  isMobile,
  isPaid,
  isLocked,
  priceHuf,
  unlocking,
  anchor,
  onClose,
  onStartRoute,
  onUnlock,
}: Props) {
  if (!spot) return null

  const canShowDetails = !isPaid || !isLocked
  const coverImage = spot.image_url ?? spot.image_urls?.[0] ?? null

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.32)',
            zIndex: 42,
          }}
        />

        <section
          role="dialog"
          aria-modal="true"
          aria-label={`${spot.title} szpot`}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 43,
            background: 'linear-gradient(180deg, rgba(12,10,20,0.98), rgba(5,8,18,0.98))',
            borderTop: '1px solid rgba(232,121,249,0.28)',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -22px 48px rgba(0,0,0,0.38)',
            padding: '12px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.2)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#f9a8d4', fontWeight: 700, letterSpacing: '0.08em' }}>
                {isPaid ? 'FIZETOS SZPOT' : 'AKTIV SZPOT'}
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: 18, lineHeight: 1.2, color: '#f4f4f5' }}>{spot.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: '#e4e4e7',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {canShowDetails && coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt={spot.title}
              style={{
                width: '100%',
                marginTop: 12,
                maxHeight: 160,
                objectFit: 'cover',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
          ) : null}

          {canShowDetails && spot.description ? (
            <p style={{ margin: '10px 0 0', color: '#d4d4d8', fontSize: 13, lineHeight: 1.45 }}>
              {spot.description}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 12,
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(148,163,184,0.12)',
              padding: '9px 11px',
            }}
          >
            <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>KOZELITO TAVOLSAG</div>
            <div style={{ marginTop: 4, color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>{approxDistance}</div>
          </div>

          {isPaid ? (
            <div style={{ marginTop: 9, fontSize: 12, color: isLocked ? '#f5d0fe' : '#86efac' }}>
              {isLocked ? `Feloldas ara: ${priceHuf} HUF / 24 ora` : 'Feloldva: teljes adatok elerhetok'}
            </div>
          ) : null}

          {isPaid && isLocked && onUnlock ? (
            <button
              type="button"
              onClick={() => onUnlock(spot)}
              disabled={unlocking}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 10,
                border: '1px solid rgba(232,121,249,0.45)',
                background: 'rgba(232,121,249,0.22)',
                color: '#fdf2f8',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 12px',
                cursor: unlocking ? 'not-allowed' : 'pointer',
                opacity: unlocking ? 0.7 : 1,
              }}
            >
              {unlocking ? 'Atiranyitas fizeteshez...' : 'Fizetessel feloldom'}
            </button>
          ) : null}

          {onStartRoute && (!isPaid || !isLocked) ? (
            <button
              type="button"
              onClick={() => onStartRoute(spot)}
              style={{
                width: '100%',
                marginTop: 12,
                borderRadius: 10,
                border: '1px solid rgba(232,121,249,0.4)',
                background: 'rgba(232,121,249,0.18)',
                color: '#fdf2f8',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
              Utvonal inditasa
            </button>
          ) : null}
        </section>
      </>
    )
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 720
  const cardWidth = 280
  const margin = 16
  const anchorX = anchor?.x ?? viewportWidth / 2
  const anchorY = anchor?.y ?? viewportHeight / 2
  const left = clamp(anchorX, margin + cardWidth / 2, viewportWidth - margin - cardWidth / 2)
  const top = clamp(anchorY, 110, viewportHeight - 120)

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 41,
        width: cardWidth,
        maxWidth: 'calc(100vw - 24px)',
        transform: 'translate(-50%, calc(-100% - 14px))',
        borderRadius: 12,
        border: '1px solid rgba(232,121,249,0.35)',
        background: 'linear-gradient(180deg, rgba(18,12,30,0.96), rgba(9,9,14,0.95))',
        color: '#f4f4f5',
        boxShadow: '0 20px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.03) inset',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ padding: '11px 12px 12px' }}>
        <div style={{ fontSize: 10, color: '#f9a8d4', letterSpacing: '0.08em', fontWeight: 700 }}>
          {isPaid ? 'FIZETOS SZPOT' : 'AKTIV SZPOT'}
        </div>
        <div style={{ marginTop: 4, fontSize: 16, lineHeight: 1.2, fontWeight: 700 }}>{spot.title}</div>
        <div
          style={{
            marginTop: 10,
            borderRadius: 9,
            border: '1px solid rgba(148,163,184,0.3)',
            background: 'rgba(148,163,184,0.12)',
            padding: '7px 9px',
          }}
        >
          <div style={{ fontSize: 11, color: '#cbd5e1', letterSpacing: '0.05em', fontWeight: 700 }}>KOZELITO TAVOLSAG</div>
          <div style={{ marginTop: 3, fontSize: 13, color: '#f8fafc', fontWeight: 700 }}>{approxDistance}</div>
        </div>

        {canShowDetails && spot.description ? (
          <div style={{ marginTop: 8, fontSize: 12, color: '#d4d4d8', lineHeight: 1.35 }}>
            {spot.description}
          </div>
        ) : null}

        {isPaid ? (
          <div style={{ marginTop: 8, fontSize: 12, color: isLocked ? '#f5d0fe' : '#86efac' }}>
            {isLocked ? `Feloldas ara: ${priceHuf} HUF / 24 ora` : 'Feloldva: teljes adatok'}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

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
  onClaimFound?: (spot: StickerSpot) => void
  claimDisabled?: boolean
  claimLabel?: string
  claiming?: boolean
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
  onClaimFound,
  claimDisabled = false,
  claimLabel = 'Megtalaltam',
  claiming = false,
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
            bottom: 'var(--matrica-action-rail-offset, 0px)',
            zIndex: 43,
            background: 'linear-gradient(180deg, rgba(6,7,9,0.99), rgba(8,11,15,0.99))',
            borderTop: '1px solid rgba(200,169,126,0.32)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 -26px 60px rgba(0,0,0,0.46)',
            padding: '12px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <div
              style={{
                width: 36,
                height: 4,
                background: 'rgba(200,169,126,0.42)',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, color: '#c8a97e', fontWeight: 700, letterSpacing: '0.08em' }}>
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
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.03)',
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
                border: '1px solid rgba(255,255,255,0.12)',
                filter: 'grayscale(0.18) contrast(1.04)',
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
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              padding: '10px 11px',
            }}
          >
            <div style={{ color: '#c8a97e', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>KOZELITO TAVOLSAG</div>
            <div style={{ marginTop: 4, color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>{approxDistance}</div>
          </div>

          {isPaid ? (
            <div style={{ marginTop: 9, fontSize: 12, color: '#cbd5e1' }}>
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
                border: '1px solid rgba(200,169,126,0.4)',
                background: 'rgba(200,169,126,0.14)',
                color: '#f3e9d8',
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
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f5f5f5',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
              Utvonal inditasa
            </button>
          ) : null}

          {onClaimFound && (!isPaid || !isLocked) ? (
            <button
              type="button"
              onClick={() => onClaimFound(spot)}
              disabled={claimDisabled || claiming}
              style={{
                width: '100%',
                marginTop: 10,
                border: '1px solid rgba(200,169,126,0.4)',
                background: claimDisabled || claiming ? 'rgba(255,255,255,0.05)' : 'rgba(200,169,126,0.16)',
                color: claimDisabled || claiming ? '#71717a' : '#f3e9d8',
                fontSize: 13,
                fontWeight: 700,
                padding: '10px 12px',
                cursor: claimDisabled || claiming ? 'not-allowed' : 'pointer',
                opacity: claiming ? 0.72 : 1,
              }}
            >
              {claiming ? 'Rogzites...' : claimLabel}
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
        border: '1px solid rgba(200,169,126,0.28)',
        background: 'linear-gradient(180deg, rgba(8,10,12,0.98), rgba(4,6,8,0.98))',
        color: '#f4f4f5',
        boxShadow: '0 20px 48px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.03)',
        pointerEvents: 'auto',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ padding: '11px 12px 12px' }}>
        <div style={{ fontSize: 10, color: '#c8a97e', letterSpacing: '0.08em', fontWeight: 700 }}>
          {isPaid ? 'FIZETOS SZPOT' : 'AKTIV SZPOT'}
        </div>
        <div style={{ marginTop: 4, fontSize: 16, lineHeight: 1.2, fontWeight: 700 }}>{spot.title}</div>
        <div
          style={{
            marginTop: 10,
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.04)',
            padding: '7px 9px',
          }}
        >
          <div style={{ fontSize: 11, color: '#c8a97e', letterSpacing: '0.08em', fontWeight: 700 }}>KOZELITO TAVOLSAG</div>
          <div style={{ marginTop: 3, fontSize: 13, color: '#f8fafc', fontWeight: 700 }}>{approxDistance}</div>
        </div>

        {canShowDetails && spot.description ? (
          <div style={{ marginTop: 8, fontSize: 12, color: '#d4d4d8', lineHeight: 1.35 }}>
            {spot.description}
          </div>
        ) : null}

        {isPaid ? (
          <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>
            {isLocked ? `Feloldas ara: ${priceHuf} HUF / 24 ora` : 'Feloldva: teljes adatok'}
          </div>
        ) : null}

        {isPaid && isLocked && onUnlock ? (
          <button
            type="button"
            onClick={() => onUnlock(spot)}
            disabled={unlocking}
            style={{
              width: '100%',
              marginTop: 10,
              border: '1px solid rgba(200,169,126,0.4)',
              background: 'rgba(200,169,126,0.14)',
              color: '#f3e9d8',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 10px',
              cursor: unlocking ? 'not-allowed' : 'pointer',
              opacity: unlocking ? 0.7 : 1,
            }}
          >
            {unlocking ? 'Atiranyitas fizeteshez...' : 'Szpot feloldasa'}
          </button>
        ) : null}

        {onStartRoute && (!isPaid || !isLocked) ? (
          <button
            type="button"
            onClick={() => onStartRoute(spot)}
            style={{
              width: '100%',
              marginTop: 10,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.04)',
              color: '#f5f5f5',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 10px',
              cursor: 'pointer',
            }}
          >
            Utvonal tervezese
          </button>
        ) : null}

        {onClaimFound && (!isPaid || !isLocked) ? (
          <button
            type="button"
            onClick={() => onClaimFound(spot)}
            disabled={claimDisabled || claiming}
            style={{
              width: '100%',
              marginTop: 10,
              border: '1px solid rgba(200,169,126,0.4)',
              background: claimDisabled || claiming ? 'rgba(255,255,255,0.05)' : 'rgba(200,169,126,0.16)',
              color: claimDisabled || claiming ? '#71717a' : '#f3e9d8',
              fontSize: 12,
              fontWeight: 700,
              padding: '8px 10px',
              cursor: claimDisabled || claiming ? 'not-allowed' : 'pointer',
              opacity: claiming ? 0.72 : 1,
            }}
          >
            {claiming ? 'Rogzites...' : claimLabel}
          </button>
        ) : null}
      </div>
    </aside>
  )
}

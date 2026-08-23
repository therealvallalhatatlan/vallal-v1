'use client'

import { useEffect, useMemo, useState } from 'react'
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
  onVirtualOpen?: (spot: StickerSpot) => void
  isVirtual?: boolean
  distanceMeters?: number | null
  isWithinClaimRadius?: boolean
  isClaimed?: boolean
  claimDisabled?: boolean
  claimLabel?: string
  claiming?: boolean
}

export default function SpotPreview({
  spot,
  approxDistance,
  isMobile,
  isPaid,
  isLocked,
  priceHuf,
  unlocking,
  anchor: _anchor,
  onClose,
  onStartRoute,
  onUnlock,
  onClaimFound,
  onVirtualOpen,
  isVirtual = false,
  isWithinClaimRadius = false,
  isClaimed = false,
  claimDisabled = false,
  claimLabel = 'MEGTALÁLTAM',
  claiming = false,
}: Props) {
  if (!spot) return null

  const canShowDetails = !isPaid || !isLocked
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const galleryImages = useMemo(() => {
    const urls = [...(spot.image_urls ?? []), spot.image_url]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim())

    return Array.from(new Set(urls))
  }, [spot.image_urls, spot.image_url])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [spot.id])

  const coverImage = galleryImages[activeImageIndex] ?? null
  const hasMultipleImages = galleryImages.length > 1

  const moveImage = (direction: 1 | -1) => {
    if (!hasMultipleImages) return
    setActiveImageIndex((current) => {
      const next = current + direction
      if (next < 0) return galleryImages.length - 1
      if (next >= galleryImages.length) return 0
      return next
    })
  }

  const shellStyle: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: isMobile ? '50%' : '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 4200,
    width: isMobile ? 'min(620px, calc(100vw - 16px))' : 'min(430px, calc(100vw - 24px))',
    maxHeight: 'min(86dvh, 780px)',
    overflowY: 'auto',
    background: 'rgba(6, 8, 10, 0.98)',
    color: '#f4f4f5',
    border: '1px solid rgba(190,242,100,0.28)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.56)',
    pointerEvents: 'auto',
    fontFamily: 'Anton, var(--font-mono-tech), sans-serif',
  }

  const buttonBase: React.CSSProperties = {
    width: '100%',
    marginTop: 12,
    minHeight: 50,
    border: '1px solid rgba(190,242,100,0.30)',
    background: 'rgba(163,230,53,0.08)',
    color: '#ecfccb',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '0.025em',
    padding: '12px 16px',
    cursor: 'pointer',
  }

  const metaLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#bef264',
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  }

  const titleStyle: React.CSSProperties = {
    margin: '6px 0 0',
    fontSize: isMobile ? 23 : 21,
    lineHeight: 1.1,
    fontWeight: 800,
    color: '#f4f4f5',
    letterSpacing: '-0.01em',
  }

  const imageBlock = canShowDetails && coverImage ? (
    <div style={{ position: 'relative', marginTop: 16 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImage}
        alt={`${spot.title} - kép ${activeImageIndex + 1}`}
        style={{
          display: 'block',
          width: '100%',
          maxHeight: 240,
          objectFit: 'cover',
          filter: 'grayscale(0.12) contrast(1.02)',
        }}
      />

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            onClick={() => moveImage(-1)}
            aria-label="Előző kép"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 40,
              height: 40,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(3,4,6,0.72)',
              color: '#f4f4f5',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => moveImage(1)}
            aria-label="Következő kép"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 40,
              height: 40,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(3,4,6,0.72)',
              color: '#f4f4f5',
              fontSize: 24,
              cursor: 'pointer',
            }}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  ) : null

  const virtualAction = isVirtual ? (
    isClaimed ? (
      onVirtualOpen ? (
        <button
          type="button"
          onClick={() => onVirtualOpen(spot)}
          style={buttonBase}
        >
          MEGNYITOM
        </button>
      ) : null
    ) : isWithinClaimRadius ? (
      onClaimFound ? (
        <button
          type="button"
          onClick={() => onClaimFound(spot)}
          disabled={claiming}
          style={{
            ...buttonBase,
            opacity: claiming ? 0.7 : 1,
            cursor: claiming ? 'not-allowed' : 'pointer',
          }}
        >
          {claiming ? 'FELOLDÁS...' : 'FELFEDEZTEM'}
        </button>
      ) : null
    ) : (
      <div
        style={{
          marginTop: 14,
          padding: '13px 0 0',
          color: '#a1a1aa',
          fontSize: 15,
          lineHeight: 1.4,
          textAlign: 'center',
        }}
      >
        Menj közelebb a szpothoz.
      </div>
    )
  ) : null

  const physicalActions = !isVirtual ? (
    <>
      {isPaid && isLocked && onUnlock ? (
        <button
          type="button"
          onClick={() => onUnlock(spot)}
          disabled={unlocking}
          style={{
            ...buttonBase,
            background: 'rgba(163,230,53,0.14)',
            opacity: unlocking ? 0.7 : 1,
            cursor: unlocking ? 'not-allowed' : 'pointer',
          }}
        >
          {unlocking ? 'FELDOLGOZÁS...' : 'SZPOT FELOLDÁSA'}
        </button>
      ) : null}

      {onStartRoute && (!isPaid || !isLocked) ? (
        <button
          type="button"
          onClick={() => onStartRoute(spot)}
          style={{
            ...buttonBase,
            borderColor: 'rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.04)',
            color: '#f4f4f5',
          }}
        >
          ÚTVONAL INDÍTÁSA
        </button>
      ) : null}

      {onClaimFound && (!isPaid || !isLocked) ? (
        <button
          type="button"
          onClick={() => onClaimFound(spot)}
          disabled={claimDisabled || claiming}
          style={{
            ...buttonBase,
            opacity: claimDisabled || claiming ? 0.55 : 1,
            cursor: claimDisabled || claiming ? 'not-allowed' : 'pointer',
          }}
        >
          {claiming ? 'RÖGZÍTÉS...' : claimLabel}
        </button>
      ) : null}
    </>
  ) : null

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.58)',
          zIndex: 4190,
        }}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${spot.title} szpot`}
        style={shellStyle}
      >
        <div style={{ padding: isMobile ? '18px 20px 22px' : '18px 20px 20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={metaLabelStyle}>
                {isVirtual ? 'DIGITÁLIS SZPOT' : isPaid ? 'FIZETŐS SZPOT' : 'AKTÍV SZPOT'}
              </div>
              <h3 style={titleStyle}>{spot.title}</h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              style={{
                flex: '0 0 auto',
                width: 42,
                height: 42,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.03)',
                color: '#f4f4f5',
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              padding: '12px 14px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div style={metaLabelStyle}>KÖZELÍTŐ TÁVOLSÁG</div>
            <div
              style={{
                marginTop: 5,
                fontSize: isMobile ? 18 : 17,
                color: '#f4f4f5',
                fontWeight: 800,
              }}
            >
              {approxDistance}
            </div>
          </div>

          {imageBlock}

          {canShowDetails && spot.description ? (
            <div
              style={{
                marginTop: 16,
                color: '#d4d4d8',
                fontSize: isMobile ? 16 : 15,
                lineHeight: 1.55,
                fontFamily: 'var(--font-mono-tech), sans-serif',
              }}
            >
              {spot.description}
            </div>
          ) : null}

          {isVirtual ? (
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isClaimed
                  ? '#bef264'
                  : isWithinClaimRadius
                    ? '#bef264'
                    : '#a1a1aa',
              }}
            >
              {isClaimed
                ? '✓ FELFEDEZVE'
                : isWithinClaimRadius
                  ? 'ZÓNA AKTÍV'
                  : `ZÁRVA • ${spot.radius_claim} M`}
            </div>
          ) : isPaid ? (
            <div
              style={{
                marginTop: 14,
                color: '#d4d4d8',
                fontSize: 14,
                fontFamily: 'var(--font-mono-tech), sans-serif',
              }}
            >
              {isLocked ? `Feloldás ára: ${priceHuf} HUF / 24 óra` : 'Feloldva: teljes adatok elérhetők'}
            </div>
          ) : null}

          {virtualAction}
          {physicalActions}
        </div>
      </aside>
    </>
  )
}
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
  /** UI-only: virtual spot indicator */
  isVirtual?: boolean
  /** UI-only: distance in meters to user */
  distanceMeters?: number | null
  /** UI-only: within claim radius */
  isWithinClaimRadius?: boolean
  /** UI-only: whether user already claimed */
  isClaimed?: boolean
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
  anchor: _anchor,
  onClose,
  onStartRoute,
  onUnlock,
  onClaimFound,
  isVirtual = false,
  distanceMeters = null,
  isWithinClaimRadius = false,
  isClaimed = false,
  claimDisabled = false,
  claimLabel = 'Megtalaltam',
  claiming = false,
}: Props) {
  if (!spot) return null

  const canShowDetails = !isPaid || !isLocked
  const galleryImages = useMemo(() => {
    const candidateUrls = [...(spot.image_urls ?? []), spot.image_url]
    const sanitized = candidateUrls
      .filter((url): url is string => typeof url === 'string' && !!url.trim())
      .map((url) => url.trim())

    return Array.from(new Set(sanitized))
  }, [spot.image_url, spot.image_urls])
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  useEffect(() => {
    setActiveImageIndex(0)
  }, [spot.id])

  const coverImage = galleryImages[activeImageIndex] ?? null
  const hasMultipleImages = galleryImages.length > 1
  void _anchor

  const moveImage = (direction: 1 | -1) => {
    if (!hasMultipleImages) return
    setActiveImageIndex((prev) => {
      const next = prev + direction
      if (next < 0) return galleryImages.length - 1
      if (next >= galleryImages.length) return 0
      return next
    })
  }

  const imageBlock = canShowDetails && coverImage ? (
    <div style={{ position: 'relative', marginTop: 12 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImage}
        alt={`${spot.title} - kep ${activeImageIndex + 1}`}
        style={{
          width: '100%',
          maxHeight: 180,
          objectFit: 'cover',
          border: '1px solid rgba(255,255,255,0.12)',
          filter: 'grayscale(0.18) contrast(1.04)',
        }}
      />

      {hasMultipleImages ? (
        <>
          <button
            type="button"
            onClick={() => moveImage(-1)}
            aria-label="Elozo kep"
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.26)',
              background: 'rgba(6,8,10,0.78)',
              color: '#f4f4f5',
              cursor: 'pointer',
              lineHeight: 1,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => moveImage(1)}
            aria-label="Kovetkezo kep"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.26)',
              background: 'rgba(6,8,10,0.78)',
              color: '#f4f4f5',
              cursor: 'pointer',
              lineHeight: 1,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>

          <div
            style={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              padding: '2px 7px',
              borderRadius: 999,
              background: 'rgba(5,7,9,0.82)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: '#e2e8f0',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {activeImageIndex + 1}/{galleryImages.length}
          </div>
        </>
      ) : null}
    </div>
  ) : null

  if (isMobile) {
    return (
      <>
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            zIndex: 4190,
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
            bottom: 'calc(var(--matrica-bottom-bar-height, 84px) + 4px)',
            width: '100%',
            maxHeight: 'min(72dvh, 720px)',
            overflowY: 'auto',
            zIndex: 4200,
            background: 'rgba(5,7,9,0.985)',
            borderTop: '1px solid rgba(190,242,100,0.28)',
            boxShadow: '0 -20px 50px rgba(0,0,0,0.52)',
            padding: '16px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
            fontFamily: "'Anton', 'Arial Narrow', sans-serif",
            color: '#f4f4f5',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <div style={{ width: 42, height: 3, background: '#bef264' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  color: '#bef264',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {isVirtual ? 'DIGITÁLIS SZPOT' : isPaid ? 'FIZETŐS SZPOT' : 'AKTÍV SZPOT'}
              </div>
              <h3
                style={{
                  margin: '6px 0 0',
                  fontSize: 'clamp(22px, 6vw, 28px)',
                  lineHeight: 1.05,
                  color: '#f4f4f5',
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                }}
              >
                {spot.title}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Bezárás"
              style={{
                width: 42,
                height: 42,
                flex: '0 0 auto',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
                color: '#f4f4f5',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>

          {imageBlock}

          {canShowDetails && spot.description ? (
            <p style={{ margin: '14px 0 0', color: '#d4d4d8', fontSize: 15, lineHeight: 1.45, fontFamily: 'inherit' }}>
              {spot.description}
            </p>
          ) : null}

          <div
            style={{
              marginTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.10)',
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              padding: '12px 0',
            }}
          >
            <div style={{ color: '#bef264', fontSize: 11, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              KÖZELÍTŐ TÁVOLSÁG
            </div>
            <div style={{ marginTop: 5, color: '#f8fafc', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>
              {approxDistance}
            </div>
          </div>

          {isVirtual ? (
            distanceMeters !== null ? (
              isClaimed ? (
                <div style={{ marginTop: 12, color: '#bef264', fontSize: 14, fontWeight: 800 }}>
                  ✓ FELFEDEZVE
                </div>
              ) : isWithinClaimRadius ? (
                <div style={{ marginTop: 12, color: '#bef264', fontSize: 14, fontWeight: 800 }}>
                  ZÓNA AKTÍV
                </div>
              ) : (
                <div style={{ marginTop: 12, color: '#d4d4d8', fontSize: 14, fontWeight: 800 }}>
                  ZÁRVA • {spot.radius_claim} m
                </div>
              )
            ) : (
              <div style={{ marginTop: 12, color: '#d4d4d8', fontSize: 14, fontWeight: 800 }}>
                HELYMEGHATÁROZÁS SZÜKSÉGES
              </div>
            )
          ) : isPaid ? (
            <div style={{ marginTop: 12, color: '#d4d4d8', fontSize: 14, lineHeight: 1.4 }}>
              {isLocked ? `Feloldás ára: ${priceHuf} HUF / 24 óra` : 'Feloldva: teljes adatok elérhetők'}
            </div>
          ) : null}

          {isVirtual ? (
            isClaimed ? (
              <button
                type="button"
                onClick={() => onClaimFound?.(spot)}
                style={{
                  width: '100%',
                  marginTop: 14,
                  border: '1px solid rgba(190,242,100,0.34)',
                  background: 'rgba(163,230,53,0.10)',
                  color: '#ecfccb',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '13px 14px',
                  minHeight: 50,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                MEGNYITOM
              </button>
            ) : isWithinClaimRadius ? (
              <button
                type="button"
                onClick={() => onClaimFound?.(spot)}
                style={{
                  width: '100%',
                  marginTop: 14,
                  border: '1px solid rgba(190,242,100,0.34)',
                  background: 'rgba(163,230,53,0.10)',
                  color: '#ecfccb',
                  fontSize: 15,
                  fontWeight: 800,
                  padding: '13px 14px',
                  minHeight: 50,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                FELFEDEZTEM
              </button>
            ) : null
          ) : (
            <>
              {isPaid && isLocked && onUnlock ? (
                <button
                  type="button"
                  onClick={() => onUnlock(spot)}
                  disabled={unlocking}
                  style={{
                    width: '100%',
                    marginTop: 14,
                    border: '1px solid rgba(190,242,100,0.34)',
                    background: 'rgba(163,230,53,0.10)',
                    color: '#ecfccb',
                    fontSize: 15,
                    fontWeight: 800,
                    padding: '13px 14px',
                    minHeight: 50,
                    cursor: unlocking ? 'not-allowed' : 'pointer',
                    opacity: unlocking ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {unlocking ? 'ÁTIRÁNYÍTÁS FIZETÉSHEZ...' : 'SZPOT FELOLDÁSA'}
                </button>
              ) : null}

              {onStartRoute && (!isPaid || !isLocked) ? (
                <button
                  type="button"
                  onClick={() => onStartRoute(spot)}
                  style={{
                    width: '100%',
                    marginTop: 12,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.045)',
                    color: '#f5f5f5',
                    fontSize: 15,
                    fontWeight: 800,
                    padding: '13px 14px',
                    minHeight: 50,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
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
                    width: '100%',
                    marginTop: 12,
                    border: '1px solid rgba(190,242,100,0.34)',
                    background: claimDisabled || claiming ? 'rgba(255,255,255,0.04)' : 'rgba(163,230,53,0.10)',
                    color: claimDisabled || claiming ? '#71717a' : '#ecfccb',
                    fontSize: 15,
                    fontWeight: 800,
                    padding: '13px 14px',
                    minHeight: 50,
                    cursor: claimDisabled || claiming ? 'not-allowed' : 'pointer',
                    opacity: claiming ? 0.72 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {claiming ? 'RÖGZÍTÉS...' : claimLabel}
                </button>
              ) : null}
            </>
          )}
        </section>
      </>
    )
  }

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
  const cardWidth = 280
  const margin = 16
  const centeredLeft = clamp(viewportWidth / 2, margin + cardWidth / 2, viewportWidth - margin - cardWidth / 2)

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: centeredLeft,
        top: '50%',
        zIndex: 4200,
        width: 'min(380px, calc(100vw - 24px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'min(82dvh, 760px)',
        overflowY: 'auto',
        transform: 'translate(-50%, -50%)',
        border: '1px solid rgba(190,242,100,0.26)',
        background: 'rgba(5,7,9,0.985)',
        color: '#f4f4f5',
        boxShadow: '0 20px 48px rgba(0,0,0,0.52), inset 0 0 0 1px rgba(255,255,255,0.03)',
        pointerEvents: 'auto',
        backdropFilter: 'blur(10px)',
        fontFamily: "'Anton', 'Arial Narrow', sans-serif",
      }}
    >
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ fontSize: 11, color: '#bef264', letterSpacing: '0.12em', fontWeight: 800 }}>
          {isPaid ? 'FIZETOS SZPOT' : 'AKTIV SZPOT'}
        </div>
        <div style={{ marginTop: 6, fontSize: 23, lineHeight: 1.08, fontWeight: 800 }}>{spot.title}</div>
        <div
          style={{
            marginTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.10)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            background: 'transparent',
            padding: '12px 0',
          }}
        >
          <div style={{ fontSize: 11, color: '#bef264', letterSpacing: '0.08em', fontWeight: 700 }}>KOZELITO TAVOLSAG</div>
          <div style={{ marginTop: 5, fontSize: 17, color: '#f8fafc', fontWeight: 800 }}>{approxDistance}</div>
        </div>

        {imageBlock}

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
              border: '1px solid rgba(190,242,100,0.45)',
              background: 'rgba(163,230,53,0.14)',
              color: '#ecfccb',
              fontSize: 14,
              fontWeight: 800,
              padding: '12px 14px',
              minHeight: 48,
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
              fontSize: 14,
              fontWeight: 800,
              padding: '12px 14px',
              minHeight: 48,
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
              border: '1px solid rgba(190,242,100,0.45)',
              background: claimDisabled || claiming ? 'rgba(255,255,255,0.05)' : 'rgba(163,230,53,0.16)',
              color: claimDisabled || claiming ? '#71717a' : '#ecfccb',
              fontSize: 14,
              fontWeight: 800,
              padding: '12px 14px',
              minHeight: 48,
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
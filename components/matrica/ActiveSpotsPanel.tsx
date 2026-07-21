'use client'

import { useCallback, useMemo, useRef } from 'react'
import type { StickerSpot } from '@/lib/matrica'
import { getDistanceMeters } from '@/lib/matrica'

interface UserLocation {
  lat: number
  lng: number
}

interface Props {
  isOpen: boolean
  spots: StickerSpot[]
  userLocation: UserLocation | null
  isMobile: boolean
  bottomOffset: number
  unlockingSpotId: string | null
  onClose: () => void
  onSelectSpot: (spot: StickerSpot) => void
  onStartRoute: (spot: StickerSpot) => void
}

function isPaidLockedSpot(spot: StickerSpot): boolean {
  return spot.spot_type === 'paid' && !!spot.is_locked
}

function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters === null) return '--'
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export default function ActiveSpotsPanel({
  isOpen,
  spots,
  userLocation,
  isMobile,
  bottomOffset,
  unlockingSpotId,
  onClose,
  onSelectSpot,
  onStartRoute,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const sortedSpots = useMemo(() => {
    const withDistance = spots
      .filter((spot) => typeof spot.lat === 'number' && typeof spot.lng === 'number')
      .map((spot) => ({
        spot,
        distance: userLocation
          ? getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
          : null,
      }))

    withDistance.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0
      if (a.distance === null) return 1
      if (b.distance === null) return -1
      return a.distance - b.distance
    })

    return withDistance
  }, [spots, userLocation])

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const container = scrollRef.current
    if (!container) return
    const cardWidth = container.clientWidth * 0.82
    container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' })
  }, [])

  if (!isOpen) return null

  const hasSpots = sortedSpots.length > 0

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div>
        <div style={{ fontSize: 10, color: '#c8a97e', letterSpacing: '0.08em', fontWeight: 700 }}>
          AKTIV SZPOTOK
        </div>
        <div style={{ marginTop: 2, fontSize: 12, color: '#a1a1aa' }}>
          {hasSpots ? `${sortedSpots.length} db a kornyeken` : 'Nincs aktiv szpot'}
        </div>
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )

  const cardsRow = (
    <div style={{ position: 'relative' }}>
      {!isMobile && hasSpots ? (
        <>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Előző szpotok"
            style={{
              position: 'absolute',
              left: -6,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(200,169,126,0.4)',
              background: 'rgba(8,10,12,0.92)',
              color: '#f3e9d8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Következő szpotok"
            style={{
              position: 'absolute',
              right: -6,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '1px solid rgba(200,169,126,0.4)',
              background: 'rgba(8,10,12,0.92)',
              color: '#f3e9d8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ›
          </button>
        </>
      ) : null}

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          padding: '2px 2px 8px',
          scrollbarWidth: 'thin',
        }}
      >
        {!hasSpots ? (
          <div style={{ padding: '18px 4px', color: '#71717a', fontSize: 13 }}>
            Meg nincs aktiv szpot a kornyeken.
          </div>
        ) : (
          sortedSpots.map(({ spot, distance }) => {
            const locked = isPaidLockedSpot(spot)
            const coverImage = spot.image_url ?? spot.image_urls?.[0] ?? null

            return (
              <article
                key={spot.id}
                onClick={() => onSelectSpot(spot)}
                style={{
                  flex: '0 0 auto',
                  scrollSnapAlign: 'start',
                  width: isMobile ? 'min(78vw, 260px)' : 220,
                  border: '1px solid rgba(200,169,126,0.24)',
                  borderRadius: 12,
                  background: 'linear-gradient(180deg, rgba(9,12,16,0.96), rgba(11,14,19,0.96))',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={spot.title}
                    style={{
                      width: '100%',
                      height: 96,
                      objectFit: 'cover',
                      filter: 'grayscale(0.15) contrast(1.04)',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 96,
                      background: 'rgba(255,255,255,0.04)',
                    }}
                  />
                )}

                <div style={{ padding: '9px 10px 11px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#c8a97e', letterSpacing: '0.06em', fontWeight: 700 }}>
                    {spot.spot_type === 'paid' ? 'FIZETOS' : 'AKTIV'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: '#f4f4f5',
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {spot.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {formatDistance(distance)}
                    {locked ? ' · zart' : ''}
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectSpot(spot)
                      }}
                      style={{
                        flex: 1,
                        border: '1px solid rgba(200,169,126,0.35)',
                        background: 'rgba(200,169,126,0.12)',
                        color: '#f3e9d8',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '6px 4px',
                        borderRadius: 8,
                        cursor: 'pointer',
                      }}
                    >
                      Reszletek
                    </button>
                    {!locked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartRoute(spot)
                        }}
                        style={{
                          flex: 1,
                          border: '1px solid rgba(255,255,255,0.16)',
                          background: 'rgba(255,255,255,0.04)',
                          color: '#e4e4e7',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '6px 4px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Utvonal
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })
        )}
      </div>
    </div>
  )

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
            zIndex: 44,
          }}
        />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Aktiv szpotok listaja"
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: bottomOffset,
            zIndex: 45,
            background: 'linear-gradient(180deg, rgba(6,7,9,0.99), rgba(8,11,15,0.99))',
            borderTop: '1px solid rgba(200,169,126,0.32)',
            boxShadow: '0 -26px 60px rgba(0,0,0,0.46)',
            padding: '12px 14px 16px',
            maxHeight: '52vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
            <div style={{ width: 36, height: 4, background: 'rgba(200,169,126,0.42)', borderRadius: 4 }} />
          </div>
          {header}
          {cardsRow}
        </section>
      </>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: bottomOffset,
        zIndex: 36,
        width: 'min(760px, calc(100vw - 24px))',
        borderRadius: 16,
        border: '1px solid rgba(200,169,126,0.28)',
        background: 'linear-gradient(180deg, rgba(9,12,16,0.97), rgba(6,8,10,0.97))',
        boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
        padding: '14px 16px 12px',
        backdropFilter: 'blur(10px)',
      }}
    >
      {header}
      {cardsRow}
    </div>
  )
}

'use client'

/**
 * SpotModal
 * Full interaction modal for a sticker spot.
 *
 * States:
 *  - 'info'    → shows image, title, description, quantity, "I found it" CTA
 *  - 'claim'   → shows ClaimForm (upload + comment)
 *  - 'success' → confirmation screen
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/browser'
import { getDistanceMeters } from '@/lib/matrica'
import type { StickerSpot } from '@/lib/matrica'
import ClaimForm from './ClaimForm'
import type { ShowToast } from './useToast'

type ModalView = 'info' | 'claim' | 'success'

interface UserLocation {
  lat: number
  lng: number
}

interface Props {
  spot: StickerSpot
  userLocation: UserLocation | null
  onClose: () => void
  showToast?: ShowToast
}

// ── Backdrop ──────────────────────────────────────────────────────────────────
function Backdrop({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 40,
      }}
    />
  )
}

export default function SpotModal({ spot, userLocation, onClose, showToast }: Props) {
  const [view, setView] = useState<ModalView>('info')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState(false)

  // Compute live distance
  const distance =
    userLocation
      ? Math.round(getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng))
      : null
  const withinClaimRadius = distance !== null && distance <= spot.radius_claim

  // Fetch session token on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data?.session?.access_token ?? null)
    })
  }, [])

  const handleFoundIt = useCallback(() => {
    if (!accessToken) {
      setAuthError(true)
      return
    }
    setAuthError(false)
    setView('claim')
  }, [accessToken])

  const handleClaimSuccess = useCallback(() => {
    setView('success')
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <Backdrop onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={spot.title}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: '#0f0f14',
          borderTop: '1px solid rgba(232,121,249,0.25)',
          borderRadius: '16px 16px 0 0',
          padding: '12px 20px 40px',
          maxHeight: '88dvh',
          overflowY: 'auto',
          color: '#f4f4f5',
          animation: 'slideUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'rgba(255,255,255,0.18)',
          }} />
        </div>
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Bezárás"
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 30,
            height: 30,
            cursor: 'pointer',
            color: '#a1a1aa',
            fontSize: 18,
            lineHeight: '30px',
            textAlign: 'center',
            padding: 0,
          }}
        >
          ×
        </button>

        {/* ── INFO VIEW ─────────────────────────────────────────────────────── */}
        {view === 'info' && (
          <>
            {/* Spot image */}
            {spot.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={spot.image_url}
                alt={spot.title}
                style={{
                  width: '100%',
                  maxHeight: 200,
                  objectFit: 'cover',
                  borderRadius: 10,
                  marginBottom: 16,
                  display: 'block',
                }}
              />
            )}

            {/* Title */}
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{spot.title}</h2>

            {/* Description */}
            {spot.description && (
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>
                {spot.description}
              </p>
            )}

            {/* Quantity */}
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#71717a' }}>
              Maradt:{' '}
              <span style={{ color: spot.remaining_quantity > 0 ? '#86efac' : '#f87171', fontWeight: 600 }}>
                {spot.remaining_quantity}
              </span>{' '}
              / {spot.total_quantity}
            </p>

            {/* Distance badge */}
            {distance !== null && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: withinClaimRadius
                    ? 'rgba(134,239,172,0.1)'
                    : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${withinClaimRadius ? 'rgba(134,239,172,0.3)' : 'rgba(251,191,36,0.25)'}`,
                  fontSize: 13,
                  color: withinClaimRadius ? '#86efac' : '#fbbf24',
                }}
              >
                {withinClaimRadius
                  ? `✓ Elég közel vagy (${distance} m)`
                  : `${distance} m távolságra vagy — közelebb kell menned (max ${spot.radius_claim} m)`}
              </div>
            )}

            {/* Auth error */}
            {authError && (
              <p
                style={{
                  margin: '0 0 12px',
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  color: '#fca5a5',
                  fontSize: 13,
                }}
              >
                Bejelentkezés szükséges a matrica igényléséhez.
              </p>
            )}

            {/* CTA */}
            {(() => {
              const isEmpty = spot.remaining_quantity <= 0
              const tooFar = distance !== null && !withinClaimRadius
              const disabled = isEmpty || tooFar

              let label = 'Megtaláltam!'
              if (isEmpty) label = 'Elfogyott'
              else if (tooFar) label = `Túl messze (${distance} m)`

              return (
                <button
                  onClick={handleFoundIt}
                  disabled={disabled}
                  title={tooFar ? `Legalább ${spot.radius_claim} m-en belül kell lenned` : undefined}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    background: disabled ? 'rgba(255,255,255,0.05)' : '#e879f9',
                    border: disabled ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    borderRadius: 12,
                    color: disabled ? '#52525b' : '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.02em',
                    transition: 'background 0.2s ease, transform 0.1s ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onMouseDown={e => !disabled && ((e.currentTarget.style.transform = 'scale(0.98)'))}
                  onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                  onTouchStart={e => !disabled && ((e.currentTarget.style.transform = 'scale(0.97)'))}
                  onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {label}
                </button>
              )
            })()}
          </>
        )}

        {/* ── CLAIM VIEW ────────────────────────────────────────────────────── */}
        {view === 'claim' && accessToken && userLocation && (
          <>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
              Matrica igénylése
            </h2>

            {/* Front-end distance gate */}
            {!withinClaimRadius && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: 'rgba(251,191,36,0.08)',
                  border: '1px solid rgba(251,191,36,0.25)',
                  borderRadius: 8,
                  color: '#fbbf24',
                  fontSize: 13,
                }}
              >
                Figyelem: {distance} m-re vagy a ponttól. Közelebb kell menned ({spot.radius_claim} m-en belül).
                A beküldés sikertelen lesz.
              </div>
            )}

            <ClaimForm
              spot={spot}
              userLat={userLocation.lat}
              userLng={userLocation.lng}
              accessToken={accessToken}
              onSuccess={handleClaimSuccess}
              onCancel={() => setView('info')}
              showToast={showToast}
            />
          </>
        )}

        {/* ── SUCCESS VIEW ──────────────────────────────────────────────────── */}
        {view === 'success' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700 }}>
              Igénylés beküldve!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: '#a1a1aa', lineHeight: 1.6 }}>
              A kérvényedet megkaptuk. Az elfogadás után értesítünk.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 32px',
                background: '#e879f9',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Bezárás
            </button>
          </div>
        )}

        {/* Slide-up keyframe */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(60px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>
      </div>
    </>
  )
}

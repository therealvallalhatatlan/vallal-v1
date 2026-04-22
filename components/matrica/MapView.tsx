'use client'

/**
 * MapView
 * Full-screen Mapbox GL map for the sticker hunt.
 *
 * Responsibilities:
 * - Initialize Mapbox map (dark theme, fullscreen)
 * - Request & track user geolocation
 * - Fetch active spots from /api/matrica/spots
 * - Classify each spot: visible (inside radius_visibility) vs. vague (outside)
 * - Render SpotMarker for visible spots, SpotCircle for vague ones
 * - Show selected spot info panel
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getDistanceMeters } from '@/lib/matrica'
import type { StickerSpot } from '@/lib/matrica'
import SpotCircle from './SpotCircle'
import SpotMarker from './SpotMarker'
import SpotModal from './SpotModal'
import ToastContainer from './ToastContainer'
import ScoreBadge from './ScoreBadge'
import { useToast } from './useToast'

// Token comes from env; set it once at module level
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface UserLocation {
  lat: number
  lng: number
}


export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const firstFixRef = useRef(false)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoRetry, setGeoRetry] = useState(0)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<StickerSpot | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const { toasts, show: showToast, dismiss: dismissToast } = useToast()

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      console.error('[MapView] NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      setGeoError('Térkép konfiguráció hiba. Kérjük, jelezd az üzemeltetőnek.')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [19.04, 47.49],
        zoom: 13,
        attributionControl: false,
        // needed for Next.js / Turbopack bundling
        localFontFamily: false as unknown as string,
      })
    } catch (e) {
      console.error('[MapView] mapboxgl.Map init error', e)
      setMapError('Térkép inicializálása sikertelen. Frissítsd az oldalt.')
      return
    }

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.resize()
      setMapLoaded(true)
    })

    map.on('error', (e) => {
      console.error('[MapView] map error', e)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Geolocation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('A böngésző nem támogatja a helymeghatározást.')
      return
    }
    setGeoError(null)

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setGeoError(null)

        // Fly to user on first fix
        if (mapRef.current && !firstFixRef.current) {
          firstFixRef.current = true
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 1400, essential: true })
        }

        // Update / create user marker
        if (mapRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([loc.lng, loc.lat])
          } else {
            const el = document.createElement('div')
            el.className = 'matrica-user-dot'
            el.style.cssText = `
              width: 18px; height: 18px; border-radius: 50%;
              background: #38bdf8;
              border: 3px solid #fff;
              box-shadow: 0 0 0 6px rgba(56,189,248,0.25);
              animation: userPulse 2.4s ease-in-out infinite;
            `
            userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([loc.lng, loc.lat])
              .addTo(mapRef.current)
          }
        }
      },
      (err) => {
        if (err.code === 1) {
          setGeoError('A helymeghatározás le van tiltva. Kattints a lakat ikonra a cím sávban, majd engedélyezd a helymeghatározást.')
        } else if (err.code === 2) {
          setGeoError('Nem sikerült meghatározni a helyzeted. Ellenőrizd, hogy be van-e kapcsolva a GPS.')
        } else {
          setGeoError('Helymeghatározás időtúllépés. Próbáld meg újra.')
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  // geoRetry changes when the user clicks Retry → re-runs the effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoRetry])

  // ── Fetch spots ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSpots() {
      try {
        const res = await fetch('/api/matrica/spots')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setSpots(json.spots ?? [])
      } catch (err) {
        console.error('[MapView] spot fetch failed', err)
        setFetchError('Nem sikerült betölteni a matrica pontokat.')
      }
    }
    loadSpots()
  }, [])

  // ── Classify spots ──────────────────────────────────────────────────────────
  const clickableSpots: StickerSpot[] = []
  const hintSpots: StickerSpot[] = []

  for (const spot of spots) {
    clickableSpots.push(spot)

    if (!userLocation) {
      hintSpots.push(spot)
      continue
    }

    const d = getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
    if (d > spot.radius_visibility) {
      hintSpots.push(spot)
    }
  }

  const handleSelect = useCallback((spot: StickerSpot) => {
    setSelectedSpot(spot)
  }, [])

  const handleClaimSubmitted = useCallback((spotUpdate?: { id: string; remaining_quantity: number; status: StickerSpot['status'] }) => {
    if (!spotUpdate) return

    setSpots((prev) => {
      const next = prev
        .map((spot) => {
          if (spot.id !== spotUpdate.id) return spot
          return {
            ...spot,
            remaining_quantity: spotUpdate.remaining_quantity,
            status: spotUpdate.status,
          }
        })
        .filter((spot) => spot.status === 'active' && spot.remaining_quantity > 0)

      return next
    })

    setSelectedSpot((prev) => {
      if (!prev || prev.id !== spotUpdate.id) return prev
      if (spotUpdate.status !== 'active' || spotUpdate.remaining_quantity <= 0) return null
      return {
        ...prev,
        remaining_quantity: spotUpdate.remaining_quantity,
        status: spotUpdate.status,
      }
    })
  }, [])

  const handleClosePanel = useCallback(() => setSelectedSpot(null), [])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Global CSS for marker animations */}
      <style>{`
        @keyframes userPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(56,189,248,0.3); }
          50%       { box-shadow: 0 0 0 10px rgba(56,189,248,0.08); }
        }
      `}</style>

      {/* Map container */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Score badge */}
      <ScoreBadge />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 14, pointerEvents: 'none' }}>
          Térkép betöltése…
        </div>
      )}

      {/* Map init error */}
      {mapError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
          <span style={{ color: '#fca5a5', fontSize: 14 }}>{mapError}</span>
          <button onClick={() => window.location.reload()} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Oldal frissítése</button>
        </div>
      )}

      {/* Overlay layers (rendered after map is fully loaded) */}
      {mapLoaded && mapRef.current && (
        <>
          {hintSpots.map((spot) => (
            <SpotCircle
              key={spot.id}
              map={mapRef.current!}
              spot={spot}
              radiusMeters={Math.max(40, Math.min(spot.radius_claim, 120))}
            />
          ))}
          {clickableSpots.map((spot) => (
            <SpotMarker key={spot.id} map={mapRef.current!} spot={spot} onSelect={handleSelect} />
          ))}
        </>
      )}

      {/* Geolocation error */}
      {geoError && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(24,24,27,0.95)',
            border: '1px solid rgba(239,68,68,0.6)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            zIndex: 20,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span>{geoError}</span>
          <button
            onClick={() => setGeoRetry(r => r + 1)}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Újra próbálom
          </button>
        </div>
      )}

      {/* Fetch error */}
      {fetchError && (
        <div
          style={{
            position: 'absolute',
            top: geoError ? 56 : 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(234,179,8,0.9)',
            color: '#000',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 20,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
          }}
        >
          {fetchError}
        </div>
      )}

      {/* Spot modal */}
      {selectedSpot && (
        <SpotModal
          spot={selectedSpot}
          userLocation={userLocation}
          onClose={handleClosePanel}
          onClaimSubmitted={handleClaimSubmitted}
          showToast={showToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

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

  const [mapLoaded, setMapLoaded] = useState(false)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<StickerSpot | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      console.error('[MapView] NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [19.04, 47.49], // Budapest default
      zoom: 13,
      attributionControl: false,
    })

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => setMapLoaded(true))

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

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setGeoError(null)

        // Fly to user on first fix
        if (mapRef.current && !userMarkerRef.current) {
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 1200 })
        }

        // Update / create user marker
        if (mapRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([loc.lng, loc.lat])
          } else {
            const el = document.createElement('div')
            el.style.cssText = `
              width: 16px; height: 16px; border-radius: 50%;
              background: #38bdf8;
              border: 3px solid #fff;
              box-shadow: 0 0 0 6px rgba(56,189,248,0.25);
            `
            userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([loc.lng, loc.lat])
              .addTo(mapRef.current)
          }
        }
      },
      (err) => {
        setGeoError(`Helymeghatározási hiba: ${err.message}`)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [])

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
  const visibleSpots: StickerSpot[] = []
  const vagueSpots: StickerSpot[] = []

  for (const spot of spots) {
    if (!userLocation) {
      // No location yet — show all as vague
      vagueSpots.push(spot)
    } else {
      const d = getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
      if (d <= spot.radius_visibility) {
        visibleSpots.push(spot)
      } else {
        vagueSpots.push(spot)
      }
    }
  }

  const handleSelect = useCallback((spot: StickerSpot) => {
    setSelectedSpot(spot)
  }, [])

  const handleClosePanel = useCallback(() => setSelectedSpot(null), [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map container */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay layers (rendered after map is fully loaded) */}
      {mapLoaded && mapRef.current && (
        <>
          {vagueSpots.map((spot) => (
            <SpotCircle key={spot.id} map={mapRef.current!} spot={spot} />
          ))}
          {visibleSpots.map((spot) => (
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
            background: 'rgba(239,68,68,0.9)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            zIndex: 20,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
          }}
        >
          {geoError}
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
        />
      )}
    </div>
  )
}

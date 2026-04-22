'use client'

/**
 * MapPicker
 * Lightweight Mapbox map used inside the admin form.
 * Click anywhere on the map to set lat/lng coordinates.
 */

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  function setPoint(nextLat: number, nextLng: number, shouldFly = false) {
    onChange(nextLat, nextLng)

    if (!mapRef.current) return

    if (markerRef.current) {
      markerRef.current.setLngLat([nextLng, nextLat])
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#e879f9' })
        .setLngLat([nextLng, nextLat])
        .addTo(mapRef.current)
    }

    if (shouldFly) {
      mapRef.current.flyTo({
        center: [nextLng, nextLat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
        duration: 900,
        essential: true,
      })
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setLocateError('A böngésző nem támogatja a helymeghatározást.')
      return
    }

    setLocating(true)
    setLocateError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLat = pos.coords.latitude
        const nextLng = pos.coords.longitude
        setPoint(nextLat, nextLng, true)
        setLocating(false)
      },
      (err) => {
        if (err.code === 1) {
          setLocateError('A helymeghatározás tiltva van a böngészőben.')
        } else if (err.code === 2) {
          setLocateError('Nem sikerült meghatározni a pozíciót.')
        } else {
          setLocateError('Időtúllépés történt helymeghatározás közben.')
        }
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    )
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng ?? 19.04, lat ?? 47.49],
      zoom: 13,
      attributionControl: false,
    })

    map.on('load', () => setReady(true))

    map.on('click', (e) => {
      const { lng: clickLng, lat: clickLat } = e.lngLat
      setLocateError(null)
      setPoint(clickLat, clickLng)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If initial coords provided, place a marker once map is ready
  useEffect(() => {
    if (!ready || !mapRef.current || lat === null || lng === null) return
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#e879f9' })
        .setLngLat([lng, lat])
        .addTo(mapRef.current)
    }
  }, [ready, lat, lng])

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: 260, borderRadius: 8, overflow: 'hidden' }}
      />
      <button
        type="button"
        onClick={handleUseCurrentLocation}
        disabled={!ready || locating}
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          border: '1px solid rgba(255,255,255,0.18)',
          background: locating ? 'rgba(39,39,42,0.9)' : 'rgba(9,9,11,0.85)',
          color: '#f4f4f5',
          borderRadius: 8,
          padding: '7px 10px',
          fontSize: 12,
          fontWeight: 600,
          cursor: !ready || locating ? 'not-allowed' : 'pointer',
          backdropFilter: 'blur(4px)',
        }}
      >
        {locating ? 'Pozíció keresése…' : 'Saját helyem'}
      </button>
      {!MAPBOX_TOKEN && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            color: '#fca5a5',
            fontSize: 13,
            borderRadius: 8,
          }}
        >
          NEXT_PUBLIC_MAPBOX_TOKEN hiányzik
        </div>
      )}
      <p style={{ margin: '6px 0 0', fontSize: 12, color: '#71717a' }}>
        {lat !== null && lng !== null
          ? `📍 ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          : 'Kattints a térképre a koordináták beállításához'}
      </p>
      {locateError && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#fca5a5' }}>
          {locateError}
        </p>
      )}
    </div>
  )
}

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
      onChange(clickLat, clickLng)

      if (markerRef.current) {
        markerRef.current.setLngLat([clickLng, clickLat])
      } else {
        markerRef.current = new mapboxgl.Marker({ color: '#e879f9' })
          .setLngLat([clickLng, clickLat])
          .addTo(map)
      }
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
    </div>
  )
}

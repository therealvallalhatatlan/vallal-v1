'use client'

/**
 * SpotCircle
 * Renders a translucent visibility-radius circle on a Mapbox map.
 * Mounted only when the spot is NOT yet visible to the user (outside radius_visibility).
 * Uses a GeoJSON Polygon fill + line layer so the radius is geographically accurate.
 */

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { geoCirclePolygon } from '@/lib/matrica'
import type { StickerSpot } from '@/lib/matrica'

interface Props {
  map: mapboxgl.Map
  spot: StickerSpot
  radiusMeters?: number
  onSelect?: (spot: StickerSpot) => void
}

export default function SpotCircle({ map, spot, radiusMeters, onSelect }: Props) {
  const sourceId = `spot-circle-src-${spot.id}`
  const fillId = `spot-circle-fill-${spot.id}`
  const outlineId = `spot-circle-outline-${spot.id}`

  const markerRef = useRef<mapboxgl.Marker | null>(null)
  useEffect(() => {
    if (!map) return

    const geojson = geoCirclePolygon(spot.lng, spot.lat, radiusMeters ?? spot.radius_visibility)

    // Add GeoJSON source
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: geojson })
    }

    // Fill layer
    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': spot.type === 'virtual' ? 'rgba(99,102,241,0.14)' : '#a3e635',
          'fill-opacity': 0.1,
        },
      })
    }

    // Outline layer
    if (!map.getLayer(outlineId)) {
      map.addLayer({
        id: outlineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': spot.type === 'virtual' ? 'rgba(129,140,248,0.78)' : '#bef264',
          'line-width': 1.5,
          'line-opacity': 0.62,
          'line-dasharray': [4, 4],
        },
      })
    }

    const onCircleClick = () => {
      onSelect?.(spot)
    }

    const onCircleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer'
    }

    const onCircleMouseLeave = () => {
      map.getCanvas().style.cursor = ''
    }

    if (onSelect) {
      map.on('click', fillId, onCircleClick)
      map.on('mouseenter', fillId, onCircleMouseEnter)
      map.on('mouseleave', fillId, onCircleMouseLeave)
    }

    // pulsing radio signal effect
    const styleId = 'spot-marker-pulse-style'
    if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.innerHTML = `
          .spot-marker-physical.spot-marker-pulse::before,
          .spot-marker-physical.spot-marker-pulse::after,
          .spot-marker-virtual.spot-marker-pulse::before,
          .spot-marker-virtual.spot-marker-pulse::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: spotPulse 1.4s infinite cubic-bezier(0.66, 0, 0, 1);
            pointer-events: none;
            z-index: 0;
          }

          .spot-marker-physical.spot-marker-pulse::before,
          .spot-marker-physical.spot-marker-pulse::after {
            background: rgba(163, 230, 53, 0.24);
          }

          .spot-marker-virtual.spot-marker-pulse::before,
          .spot-marker-virtual.spot-marker-pulse::after {
            background: rgba(99, 102, 241, 0.30);
          }

          .spot-marker-pulse::after {
            animation-delay: 0.7s;
          }
          @media (prefers-reduced-motion: reduce) {
            .spot-marker-pulse::before,
            .spot-marker-pulse::after { animation: none; }
          }
          @keyframes spotPulse {
            0% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.8); }
            70%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
          }
      `
      document.head.appendChild(style)
    }

    const el = document.createElement('div')
    el.className = 'spot-marker-pulse ' + (spot.type === 'virtual' ? 'spot-marker-virtual' : 'spot-marker-physical')
    el.style.cssText = 'width:0;height:0;position:absolute;pointer-events:none;'
    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map)

    return () => {
      if (map) {
        if (onSelect) {
          map.off('click', fillId, onCircleClick)
          map.off('mouseenter', fillId, onCircleMouseEnter)
          map.off('mouseleave', fillId, onCircleMouseLeave)
        }
        try {
          if (map.getLayer(outlineId)) map.removeLayer(outlineId)
          if (map.getLayer(fillId)) map.removeLayer(fillId)
          if (map.getSource(sourceId)) map.removeSource(sourceId)
        } catch {}
      }
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map, spot, sourceId, fillId, outlineId, radiusMeters, onSelect])

  return null
}

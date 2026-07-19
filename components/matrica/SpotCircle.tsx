'use client'

/**
 * SpotCircle
 * Renders a translucent visibility-radius circle on a Mapbox map.
 * Mounted only when the spot is NOT yet visible to the user (outside radius_visibility).
 * Uses a GeoJSON Polygon fill + line layer so the radius is geographically accurate.
 */

import { useEffect } from 'react'
import type mapboxgl from 'mapbox-gl'
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
          'fill-color': '#c8a97e',
          'fill-opacity': 0.08,
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
          'line-color': '#c8a97e',
          'line-width': 1.5,
          'line-opacity': 0.5,
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
        } catch (e) {
          // ignore errors if map is in teardown
        }
      }
    }
  }, [map, spot, sourceId, fillId, outlineId, radiusMeters, onSelect])

  return null
}

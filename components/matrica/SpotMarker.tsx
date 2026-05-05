'use client'

/**
 * SpotMarker
 * Renders an exact pin marker on a Mapbox map for a spot that is within the
 * user's radius_visibility range (i.e. the user is close enough to see it precisely).
 */

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { StickerSpot } from '@/lib/matrica'

interface Props {
  map: mapboxgl.Map
  spot: StickerSpot
  /** Called when the user clicks the marker */
  onSelect?: (spot: StickerSpot) => void
}

export default function SpotMarker({ map, spot, onSelect }: Props) {
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!map) return

    // Custom marker element
    const el = document.createElement('div')
    el.className = 'spot-marker spot-marker-pulse'
    el.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e879f9;
      border: 3px solid #fff;
      box-shadow: 0 0 12px rgba(232,121,249,0.8);
      cursor: pointer;
      transition: transform 0.15s ease;
      position: relative;
    `
    // Pulsing animation for spot marker
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const styleId = 'spot-marker-pulse-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .spot-marker-pulse::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            width: 38px;
            height: 38px;
            background: rgba(232,121,249,0.25);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: spotPulse 1.4s infinite cubic-bezier(0.66, 0, 0, 1);
            z-index: 0;
          }
          @keyframes spotPulse {
            0% {
              opacity: 0.7;
              transform: translate(-50%, -50%) scale(0.8);
            }
            70% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(2.2);
            }
            100% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(2.2);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
    el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)' })
    el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })

    if (onSelect) {
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelect(spot)
      })
    }

    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map)

    markerRef.current = marker

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map, spot, onSelect])

  return null
}

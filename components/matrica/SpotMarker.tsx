'use client'

/**
 * SpotMarker
 * Renders an exact pin marker on a Mapbox map for a spot that is within the
 * user's radius_visibility range (i.e. the user is close enough to see it precisely).
 */

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import type { StickerSpot } from '@/lib/matrica'

interface SpotMarkerAnchor {
  x: number
  y: number
}

interface Props {
  map: mapboxgl.Map
  spot: StickerSpot
  /** Called when the user clicks the marker */
  onSelect?: (spot: StickerSpot) => void
  onHoverStart?: (spot: StickerSpot, anchor: SpotMarkerAnchor) => void
  onHoverEnd?: (spotId: string) => void
  onPress?: (spot: StickerSpot, anchor: SpotMarkerAnchor) => void
}

export default function SpotMarker({ map, spot, onSelect, onHoverStart, onHoverEnd, onPress }: Props) {
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  useEffect(() => {
    if (!map) return

    // Custom marker element
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'spot-marker-root spot-marker-pulse'
    el.setAttribute('aria-label', `${spot.title} szpot`)
    el.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 0;
      padding: 0;
      margin: 0;
      background: transparent;
      cursor: pointer;
      transition: filter 0.15s ease;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      outline: none;
    `

    const pulse = document.createElement('span')
    pulse.className = 'spot-marker-pulse-ring'
    pulse.style.cssText = `
      position: absolute;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(200,169,126,0.22);
      transform: translateZ(0);
      pointer-events: none;
    `

    const dot = document.createElement('span')
    dot.className = 'spot-marker-dot'
    dot.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #c8a97e;
      border: 3px solid #fff;
      box-shadow: 0 0 12px rgba(200,169,126,0.65);
      transition: transform 0.15s ease;
      transform: translateZ(0) scale(1);
      position: relative;
      z-index: 1;
      pointer-events: none;
    `

    el.appendChild(pulse)
    el.appendChild(dot)

    const computeAnchor = (): SpotMarkerAnchor => {
      const rect = el.getBoundingClientRect()
      return {
        x: rect.left + rect.width / 2,
        y: rect.top,
      }
    }

    // Pulsing animation for spot marker
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const styleId = 'spot-marker-pulse-style'
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style')
        style.id = styleId
        style.innerHTML = `
          .spot-marker-pulse::after {
            content: '';
            position: absolute;
            left: 50%;
            top: 50%;
            width: 38px;
            height: 38px;
            background: rgba(200,169,126,0.24);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            animation: spotPulse 1.4s infinite cubic-bezier(0.66, 0, 0, 1);
            z-index: 0;
            pointer-events: none;
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
          .spot-marker-root:hover,
          .spot-marker-root:focus-visible {
            filter: brightness(1.08);
          }
        `;
        document.head.appendChild(style)
      }
    }

    const handleEnter = () => {
      dot.style.transform = 'translateZ(0) scale(1.2)'
      onHoverStart?.(spot, computeAnchor())
    }

    const handleLeave = () => {
      dot.style.transform = 'translateZ(0) scale(1)'
      onHoverEnd?.(spot.id)
    }

    const handleClick = (e: MouseEvent) => {
      e.stopPropagation()
      const anchor = computeAnchor()
      onPress?.(spot, anchor)
      onSelect?.(spot)
    }

    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mouseleave', handleLeave)
    el.addEventListener('focus', handleEnter)
    el.addEventListener('blur', handleLeave)
    el.addEventListener('click', handleClick)

    const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([spot.lng, spot.lat])
      .addTo(map)

    markerRef.current = marker

    return () => {
      el.removeEventListener('mouseenter', handleEnter)
      el.removeEventListener('mouseleave', handleLeave)
      el.removeEventListener('focus', handleEnter)
      el.removeEventListener('blur', handleLeave)
      el.removeEventListener('click', handleClick)
      markerRef.current?.remove()
      markerRef.current = null
    }
  }, [map, spot, onHoverEnd, onHoverStart, onPress, onSelect])

  return null
}

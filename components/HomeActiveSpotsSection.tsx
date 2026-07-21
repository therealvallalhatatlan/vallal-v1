'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ActiveSpotsPanel from '@/components/matrica/ActiveSpotsPanel'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import type { StickerSpot } from '@/lib/matrica'
import { getDistanceMeters } from '@/lib/matrica'

interface UserLocation {
  lat: number
  lng: number
}

export default function HomeActiveSpotsSection() {
  const router = useRouter()
  const { session } = useSessionGuard() as { session: { access_token?: string } | null }
  const accessToken = session?.access_token ?? null

  const [isOpen, setIsOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mqMobile = window.matchMedia('(max-width: 900px)')
    const mqTouch = window.matchMedia('(pointer: coarse)')
    const apply = () => {
      setIsMobile(mqMobile.matches || mqTouch.matches)
    }

    apply()
    mqMobile.addEventListener('change', apply)
    mqTouch.addEventListener('change', apply)
    window.addEventListener('resize', apply)

    return () => {
      mqMobile.removeEventListener('change', apply)
      mqTouch.removeEventListener('change', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
      },
      () => {
        // Keep null location when permission is denied or unavailable.
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 12000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSpots = async () => {
      setLoading(true)
      setFetchError(null)

      try {
        const headers: Record<string, string> = {}
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }

        const res = await fetch('/api/matrica/spots', {
          headers,
          cache: 'no-store',
        })

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const json = await res.json()
        if (!cancelled) {
          setSpots(Array.isArray(json?.spots) ? json.spots : [])
        }
      } catch (error) {
        if (!cancelled) {
          console.error('[HomeActiveSpotsSection] spot fetch failed', error)
          setFetchError('Nem sikerült betölteni az aktív szpotokat.')
          setSpots([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSpots()

    return () => {
      cancelled = true
    }
  }, [accessToken])

  const panelSpots = useMemo(() => {
    const activeSpots = spots.filter((spot) => spot.status === 'active')
    if (!userLocation) return activeSpots

    const nearby = activeSpots.filter((spot) => {
      const distance = getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
      return distance <= spot.radius_visibility
    })

    return nearby.length > 0 ? nearby : activeSpots
  }, [spots, userLocation])

  const openSpot = useCallback((spot: StickerSpot, action: 'focus' | 'route') => {
    const params = new URLSearchParams({
      spotId: spot.id,
      action,
    })
    router.push(`/halozat?${params.toString()}`)
  }, [router])

  return (
    <section className="relative z-20 mx-4 mb-8 md:mx-8">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center border border-[#c8a97e66] bg-[#11161d] px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-[#f3e9d8]"
        >
          Aktiv szpotok megnyitasa
        </button>
      ) : null}

      {fetchError ? (
        <p className="mt-2 text-xs text-red-300/90">{fetchError}</p>
      ) : null}

      {loading ? (
        <p className="mt-2 text-xs text-zinc-400">Aktiv szpotok betoltese...</p>
      ) : null}

      <ActiveSpotsPanel
        isOpen={isOpen}
        spots={panelSpots}
        userLocation={userLocation}
        isMobile={isMobile}
        bottomOffset={0}
        unlockingSpotId={null}
        onClose={() => setIsOpen(false)}
        onSelectSpot={(spot) => openSpot(spot, 'focus')}
        onStartRoute={(spot) => openSpot(spot, 'route')}
        layout="inline"
      />
    </section>
  )
}

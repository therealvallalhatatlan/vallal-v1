import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/browser'

export function usePresence() {
  const [activeCount, setActiveCount] = useState(0)
  const supabaseRef = useRef(createClient())

  const HEARTBEAT_INTERVAL_MS = 25_000
  const ACTIVE_COUNT_POLL_MS = 30_000

  // Helper to get current location if available
  const getCurrentPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          resolve(null)
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 5000 }
      )
    })
  }

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession()
      return session?.access_token ?? null
    } catch {
      return null
    }
  }

  // Helper to send heartbeat with optional location
  const sendHeartbeat = async () => {
    try {
      const accessToken = await getAccessToken()
      if (!accessToken) return

      // Try to get location from multiple sources
      let location: { lat: number; lng: number } | null = null

      // First, check if MapView has shared the user location
      const sharedLocation = (window as any).vallalhatatlan_userLocation
      if (sharedLocation?.lat && sharedLocation?.lng && Number.isFinite(sharedLocation.lat) && Number.isFinite(sharedLocation.lng)) {
        location = sharedLocation
      } else {
        // Fall back to geolocation API
        location = await getCurrentPosition()
      }

      const body: Record<string, unknown> = {}
      if (location?.lat && location?.lng) {
        body.lat = location.lat
        body.lng = location.lng
      }

      await fetch('/api/presence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(5000),
      })
    } catch (error) {
      console.error('[usePresence] Heartbeat failed:', error)
    }
  }

  useEffect(() => {
    let mounted = true
    let heartbeatInterval: NodeJS.Timeout
    let pollInterval: NodeJS.Timeout
    let visibilityHandler: (() => void) | null = null
    let focusHandler: (() => void) | null = null

    const setupPresence = async () => {
      const {
        data: { session },
      } = await supabaseRef.current.auth.getSession()

      if (!session?.access_token || !mounted) {
        return
      }

      // Send heartbeat frequently for near real-time presence
      heartbeatInterval = setInterval(async () => {
        if (!mounted) return
        await sendHeartbeat()
      }, HEARTBEAT_INTERVAL_MS)

      // Poll active count as a lightweight indicator
      pollInterval = setInterval(async () => {
        if (!mounted) return
        try {
          const response = await fetch('/api/presence', {
            signal: AbortSignal.timeout(5000),
          })
          const data = await response.json()
          if (mounted) {
            setActiveCount(data.count || 0)
          }
        } catch (error) {
          // Silent fail - reduces console spam
        }
      }, ACTIVE_COUNT_POLL_MS)

      // Send initial heartbeat immediately
      await sendHeartbeat()

      // Send heartbeat when tab/app becomes active again
      visibilityHandler = () => {
        if (!mounted) return
        if (document.visibilityState === 'visible') {
          void sendHeartbeat()
        }
      }
      focusHandler = () => {
        if (!mounted) return
        void sendHeartbeat()
      }
      document.addEventListener('visibilitychange', visibilityHandler)
      window.addEventListener('focus', focusHandler)

      // Poll active count immediately
      try {
        const response = await fetch('/api/presence', {
          signal: AbortSignal.timeout(5000),
        })
        const data = await response.json()
        if (mounted) {
          setActiveCount(data.count || 0)
        }
      } catch (error) {
        // Silent fail
      }
    }

    setupPresence()

    return () => {
      mounted = false
      if (heartbeatInterval) clearInterval(heartbeatInterval)
      if (pollInterval) clearInterval(pollInterval)
      if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler)
      if (focusHandler) window.removeEventListener('focus', focusHandler)
    }
  }, [])

  return { activeCount }
}

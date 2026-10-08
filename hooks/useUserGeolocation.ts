"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type UserLocation = {
  lat: number
  lng: number
  accuracy: number | null
}

type GeoStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error"

const LOCATION_PREFERENCE_KEY = "vallalhatatlan:location-enabled"
const LOCATION_EVENT = "vallalhatatlan:location-preference"

function readPreference() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(LOCATION_PREFERENCE_KEY) === "true"
}

export default function useUserGeolocation() {
  const [enabled, setEnabled] = useState(readPreference)
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<GeoStatus>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "unavailable"
    return "idle"
  })
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const setPreference = useCallback((value: boolean) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCATION_PREFERENCE_KEY, value ? "true" : "false")
      window.dispatchEvent(new CustomEvent(LOCATION_EVENT, { detail: { enabled: value } }))
    }
    setEnabled(value)
  }, [])

  const startWatching = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable")
      setError("A böngésző nem támogatja a helymeghatározást.")
      return false
    }

    stopWatching()
    setStatus("requesting")
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        })
        setStatus("granted")
        setError(null)
      },
      (geoError) => {
        if (geoError.code === 1) {
          setStatus("denied")
          setError("A helymeghatározást a böngésző nem engedélyezi.")
        } else if (geoError.code === 2) {
          setStatus("error")
          setError("Nem sikerült meghatározni a pozíciódat.")
        } else {
          setStatus("error")
          setError("A helymeghatározás időtúllépett.")
        }
      },
      {
        enableHighAccuracy: false,
        maximumAge: 30_000,
        timeout: 15_000,
      },
    )

    return true
  }, [stopWatching])

  const requestPermission = useCallback(() => {
    setPreference(true)
    const started = startWatching()
    if (!started) setPreference(false)
    return started
  }, [setPreference, startWatching])

  const disable = useCallback(() => {
    stopWatching()
    setPreference(false)
    setLocation(null)
    setStatus(typeof navigator !== "undefined" && navigator.geolocation ? "idle" : "unavailable")
    setError(null)
  }, [setPreference, stopWatching])

  useEffect(() => {
    const sync = (event?: Event) => {
      const next = event instanceof CustomEvent
        ? Boolean(event.detail?.enabled)
        : readPreference()

      setEnabled(next)

      if (next) {
        startWatching()
      } else {
        stopWatching()
        setLocation(null)
        setStatus(typeof navigator !== "undefined" && navigator.geolocation ? "idle" : "unavailable")
      }
    }

    const onStorage = () => sync()
    const onPreference = (event: Event) => sync(event)

    window.addEventListener("storage", onStorage)
    window.addEventListener(LOCATION_EVENT, onPreference)

    if (readPreference()) startWatching()

    return () => {
      stopWatching()
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(LOCATION_EVENT, onPreference)
    }
  }, [startWatching, stopWatching])

  return { enabled, location, status, error, requestPermission, disable }
}

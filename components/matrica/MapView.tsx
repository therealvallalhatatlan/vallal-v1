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
import ToastContainer from './ToastContainer'
import { useToast } from './useToast'
import MatricaLivePanel from './MatricaLivePanel'

// Token comes from env; set it once at module level
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
const MATRICA_FOCUS_SPOT_EVENT = 'matrica:focus-spot'
const MATRICA_START_ROUTE_EVENT = 'matrica:start-route'
const ROUTE_SOURCE_ID = 'matrica-route-source'
const ROUTE_LAYER_ID = 'matrica-route-layer'
const AUTO_REROUTE_MIN_DISTANCE_METERS = 35
const AUTO_REROUTE_COOLDOWN_MS = 15000

interface UserLocation {
  lat: number
  lng: number
}

interface MapViewProps {
  chatDisplayName: string
  chatAuthToken: string | null
}

interface FocusSpotDetail {
  spotId?: string
  lat?: number
  lng?: number
  title?: string
}

interface RouteState {
  spot: StickerSpot | null
  origin: UserLocation | null
  distanceMeters: number | null
  durationSeconds: number | null
}

function isFiniteCoordinate(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function formatRouteDistance(distanceMeters: number | null): string {
  if (distanceMeters === null) return '--'
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}

function formatRouteDuration(durationSeconds: number | null): string {
  if (durationSeconds === null) return '--'
  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60))
  if (totalMinutes < 60) return `${totalMinutes} perc`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} ora ${minutes} perc` : `${hours} ora`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}


export default function MapView({ chatDisplayName, chatAuthToken }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const firstFixRef = useRef(false)
  const lastAutoRerouteAtRef = useRef(0)
  const pendingAutoRerouteStatusRef = useRef(false)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoRetry, setGeoRetry] = useState(0)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [selectedSpot, setSelectedSpot] = useState<StickerSpot | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [routeState, setRouteState] = useState<RouteState>({
    spot: null,
    origin: null,
    distanceMeters: null,
    durationSeconds: null,
  })
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [routeStatus, setRouteStatus] = useState<string | null>(null)

  const { toasts, show: showToast, dismiss: dismissToast } = useToast()

  useEffect(() => {
    if (!routeStatus) return

    const timeoutId = window.setTimeout(() => {
      setRouteStatus((current) => (current === routeStatus ? null : current))
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [routeStatus])

  const clearRouteFromMap = useCallback(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.removeLayer(ROUTE_LAYER_ID)
    }
    if (map.getSource(ROUTE_SOURCE_ID)) {
      map.removeSource(ROUTE_SOURCE_ID)
    }
  }, [])

  const startRouteForSpot = useCallback((spot: StickerSpot, originOverride?: UserLocation | null) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [spot.lng, spot.lat],
        zoom: 15.8,
        offset: [0, -120],
        duration: 900,
        essential: true,
      })
    }

    const nextOrigin = originOverride ?? userLocation
    if (!nextOrigin) {
      setRouteError('Kapcsold be a helymeghatarozast az utvonaltervezeshez.')
      setRouteLoading(false)
      setRouteState({
        spot,
        origin: null,
        distanceMeters: null,
        durationSeconds: null,
      })
      return
    }

    setRouteError(null)
    setRouteState({
      spot,
      origin: nextOrigin,
      distanceMeters: null,
      durationSeconds: null,
    })
  }, [userLocation])

  // ── Initialize map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      console.error('[MapView] NEXT_PUBLIC_MAPBOX_TOKEN is not set')
      setGeoError('Térkép konfiguráció hiba. Kérjük, jelezd az üzemeltetőnek.')
      return
    }

    mapboxgl.accessToken = MAPBOX_TOKEN

    let map: mapboxgl.Map
    try {
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [19.04, 47.49],
        zoom: 13,
        attributionControl: false,
        // needed for Next.js / Turbopack bundling
        localFontFamily: false as unknown as string,
      })
    } catch (e) {
      console.error('[MapView] mapboxgl.Map init error', e)
      setMapError('Térkép inicializálása sikertelen. Frissítsd az oldalt.')
      return
    }

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right')
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      map.resize()
      setMapLoaded(true)
    })

    map.on('error', (e) => {
      console.error('[MapView] map error', e)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Geolocation ─────────────────────────────────────────────────────────────
  // Helper: find nearest spot to user
  function getNearestSpot(userLoc: UserLocation | null, spots: StickerSpot[]): StickerSpot | null {
    if (!userLoc || !spots.length) return null;
    let minDist = Infinity;
    let nearest: StickerSpot | null = null;
    for (const spot of spots) {
      if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number') continue;
      const dist = getDistanceMeters(userLoc.lat, userLoc.lng, spot.lat, spot.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = spot;
      }
    }
    return nearest;
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('A böngésző nem támogatja a helymeghatározást.');
      return;
    }
    setGeoError(null);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        // Share location with presence hook
        (window as any).vallalhatatlan_userLocation = loc;
        setGeoError(null);

        // Fly to nearest spot on first fix
        if (mapRef.current && !firstFixRef.current) {
          firstFixRef.current = true;
          const nearest = getNearestSpot(loc, spots);
          if (nearest && typeof nearest.lat === 'number' && typeof nearest.lng === 'number') {
            mapRef.current.flyTo({ center: [nearest.lng, nearest.lat], zoom: 15, duration: 1400, essential: true });
          } else {
            mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 15, duration: 1400, essential: true });
          }
        }

        // Update / create user marker
        if (mapRef.current) {
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat([loc.lng, loc.lat]);
          } else {
            const el = document.createElement('div');
            el.className = 'matrica-user-marker';

            const label = document.createElement('div');
            label.className = 'matrica-user-tooltip';
            label.textContent = 'sajat poziciod';

            const dot = document.createElement('div');
            dot.className = 'matrica-user-dot';
            dot.style.cssText = `
              width: 18px; height: 18px; border-radius: 50%;
              background: #38bdf8;
              border: 3px solid #fff;
              box-shadow: 0 0 0 6px rgba(56,189,248,0.25);
              animation: userPulse 2.4s ease-in-out infinite;
            `;

            el.appendChild(label);
            el.appendChild(dot);

            userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
              .setLngLat([loc.lng, loc.lat])
              .addTo(mapRef.current);
          }
        }
      },
      (err) => {
        if (err.code === 1) {
          setGeoError('A helymeghatározás le van tiltva. Kattints a lakat ikonra a cím sávban, majd engedélyezd a helymeghatározást.');
        } else if (err.code === 2) {
          setGeoError('Nem sikerült meghatározni a helyzeted. Ellenőrizd, hogy be van-e kapcsolva a GPS.');
        } else {
          setGeoError('Helymeghatározás időtúllépés. Próbáld meg újra.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
    };
    // geoRetry and spots changes when the user clicks Retry or spots update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoRetry, spots]);

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

  // ── Handle online user focus events ─────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const handleFocusOnlineUser = (event: Event) => {
      const customEvent = event as CustomEvent<{
        lat: number
        lng: number
        nickname: string
        avatarUrl?: string | null
        score?: number
        accepted?: number
      }>
      const { lat, lng, nickname, avatarUrl, score = 0, accepted = 0 } = customEvent.detail

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const map = mapRef.current
      if (!map) return

      // Fly to the user's location
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        duration: 1000,
        essential: true,
      })

      // Show a temporary marker at that location
      const el = document.createElement('div')
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #06b6d4;
        border: 3px solid #fff;
        box-shadow: 0 0 12px rgba(6, 182, 212, 0.6), inset 0 0 6px rgba(6, 182, 212, 0.3);
      `

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false }))
        .addTo(map)

      const safeNickname = escapeHtml(nickname)
      const safeAvatar = avatarUrl ? escapeHtml(avatarUrl) : null
      const initial = safeNickname.charAt(0).toUpperCase() || '?'

      marker.getPopup().setHTML(`
        <div style="min-width:220px;padding:10px 12px;background:#0f0f13;color:#f4f4f5;border:1px solid #27272a;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            ${safeAvatar
              ? `<img src="${safeAvatar}" alt="${safeNickname}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #f472b6;" />`
              : `<div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#23232a;color:#f472b6;font-weight:700;border:2px solid #f472b6;">${initial}</div>`}
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${safeNickname}</div>
              <div style="font-size:12px;color:#a1a1aa;">Online most</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;">
            <div style="display:flex;flex-direction:column;">
              <span style="color:#a1a1aa;">Pontszam</span>
              <span style="color:#e879f9;font-weight:700;">${Number.isFinite(score) ? score : 0}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;">
              <span style="color:#a1a1aa;">Elfogadott</span>
              <span style="color:#34d399;font-weight:700;">${Number.isFinite(accepted) ? accepted : 0} db</span>
            </div>
          </div>
        </div>
      `)
      marker.togglePopup()

      // Remove marker after 5 seconds
      const timeoutId = setTimeout(() => {
        marker.remove()
      }, 5000)

      return () => {
        clearTimeout(timeoutId)
        marker.remove()
      }
    }

    window.addEventListener('matrica:focus-online-user', handleFocusOnlineUser)

    return () => {
      window.removeEventListener('matrica:focus-online-user', handleFocusOnlineUser)
    }
  }, [mapLoaded])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !routeState.spot || !routeState.origin) {
      clearRouteFromMap()
      return
    }

    let cancelled = false

    const loadRoute = async () => {
      const origin = routeState.origin
      const target = routeState.spot

      setRouteLoading(true)
      setRouteError(null)

      try {
        const url = new URL(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${origin.lng},${origin.lat};${target.lng},${target.lat}`
        )
        url.searchParams.set('alternatives', 'false')
        url.searchParams.set('geometries', 'geojson')
        url.searchParams.set('overview', 'full')
        url.searchParams.set('steps', 'false')
        url.searchParams.set('access_token', MAPBOX_TOKEN)

        const res = await fetch(url.toString())
        const json = await res.json()

        if (cancelled) return

        const route = Array.isArray(json?.routes) ? json.routes[0] : null
        const geometry = route?.geometry
        if (!res.ok || !route || !geometry || geometry.type !== 'LineString') {
          throw new Error('route_unavailable')
        }

        const feature: GeoJSON.Feature<GeoJSON.LineString> = {
          type: 'Feature',
          geometry,
          properties: {},
        }

        const map = mapRef.current
        if (!map) return

        if (map.getSource(ROUTE_SOURCE_ID)) {
          ;(map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(feature)
        } else {
          map.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: feature,
          })
        }

        if (!map.getLayer(ROUTE_LAYER_ID)) {
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
            paint: {
              'line-color': '#f472b6',
              'line-width': 5,
              'line-opacity': 0.9,
            },
          })
        }

        const bounds = new mapboxgl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat])
        bounds.extend([target.lng, target.lat])
        map.fitBounds(bounds, {
          padding: { top: 96, right: 32, bottom: 250, left: 32 },
          duration: 1200,
          essential: true,
        })

        setRouteState((prev) => ({
          ...prev,
          distanceMeters: typeof route.distance === 'number' ? route.distance : null,
          durationSeconds: typeof route.duration === 'number' ? route.duration : null,
        }))
        if (pendingAutoRerouteStatusRef.current) {
          setRouteStatus('Utvonal frissitve')
          pendingAutoRerouteStatusRef.current = false
        }
      } catch (error) {
        console.error('[MapView] route load failed', error)
        clearRouteFromMap()
        setRouteError('Nem sikerult utvonalat tervezni ehhez a szpothoz.')
        setRouteStatus(null)
        pendingAutoRerouteStatusRef.current = false
        setRouteState((prev) => ({
          ...prev,
          distanceMeters: null,
          durationSeconds: null,
        }))
      } finally {
        if (!cancelled) {
          setRouteLoading(false)
        }
      }
    }

    void loadRoute()

    return () => {
      cancelled = true
    }
  }, [clearRouteFromMap, mapLoaded, routeState.origin, routeState.spot])

  useEffect(() => {
    function handleFocusSpot(event: Event) {
      const customEvent = event as CustomEvent<FocusSpotDetail>
      const detail = customEvent.detail
      if (!detail) return

      const targetSpot = typeof detail.spotId === 'string'
        ? spots.find((spot) => spot.id === detail.spotId)
        : undefined

      const lat = typeof detail.lat === 'number' ? detail.lat : targetSpot?.lat
      const lng = typeof detail.lng === 'number' ? detail.lng : targetSpot?.lng

      if (!mapRef.current || !Number.isFinite(lat) || !Number.isFinite(lng)) return

      mapRef.current.flyTo({
        center: [lng, lat],
        zoom: 16.4,
        duration: 1200,
        essential: true,
      })

      if (targetSpot) {
        setSelectedSpot(targetSpot)
      }
    }

    window.addEventListener(MATRICA_FOCUS_SPOT_EVENT, handleFocusSpot as EventListener)
    return () => {
      window.removeEventListener(MATRICA_FOCUS_SPOT_EVENT, handleFocusSpot as EventListener)
    }
  }, [spots])

  useEffect(() => {
    function handleStartRoute(event: Event) {
      const customEvent = event as CustomEvent<FocusSpotDetail>
      const detail = customEvent.detail
      if (!detail) return

      const targetSpot = typeof detail.spotId === 'string'
        ? spots.find((spot) => spot.id === detail.spotId) ?? null
        : null

      const fallbackSpot = targetSpot ?? (isFiniteCoordinate(detail.lat) && isFiniteCoordinate(detail.lng)
        ? {
            id: detail.spotId ?? 'route-target',
            title: detail.title ?? 'Szpot',
            description: null,
            image_url: null,
            lat: detail.lat as number,
            lng: detail.lng as number,
            radius_visibility: 0,
            radius_claim: 0,
            total_quantity: 0,
            remaining_quantity: 0,
            status: 'active' as const,
            created_at: new Date(0).toISOString(),
          }
        : null)

      if (!fallbackSpot) return

      startRouteForSpot(fallbackSpot)
    }

    window.addEventListener(MATRICA_START_ROUTE_EVENT, handleStartRoute as EventListener)
    return () => {
      window.removeEventListener(MATRICA_START_ROUTE_EVENT, handleStartRoute as EventListener)
    }
  }, [spots, startRouteForSpot])

  useEffect(() => {
    if (!routeState.spot || !routeState.origin || !userLocation || routeLoading) {
      return
    }

    const movedDistance = getDistanceMeters(
      routeState.origin.lat,
      routeState.origin.lng,
      userLocation.lat,
      userLocation.lng,
    )

    if (movedDistance < AUTO_REROUTE_MIN_DISTANCE_METERS) {
      return
    }

    const now = Date.now()
    if (now - lastAutoRerouteAtRef.current < AUTO_REROUTE_COOLDOWN_MS) {
      return
    }

    lastAutoRerouteAtRef.current = now
    pendingAutoRerouteStatusRef.current = true
    startRouteForSpot(routeState.spot, userLocation)
  }, [routeLoading, routeState.origin, routeState.spot, startRouteForSpot, userLocation])

  // ── Classify spots ──────────────────────────────────────────────────────────
  const clickableSpots: StickerSpot[] = []
  const hintSpots: StickerSpot[] = []

  for (const spot of spots) {
    if (!userLocation) {
      hintSpots.push(spot)
      continue
    }

    const d = getDistanceMeters(userLocation.lat, userLocation.lng, spot.lat, spot.lng)
    if (d <= spot.radius_visibility) {
      clickableSpots.push(spot)
    } else {
      hintSpots.push(spot)
    }
  }

  const handleSelect = useCallback((spot: StickerSpot) => {
    setSelectedSpot(spot)
  }, [])

  const handleClaimSubmitted = useCallback((spotUpdate?: { id: string; remaining_quantity: number; status: StickerSpot['status'] }) => {
    if (!spotUpdate) return

    setSpots((prev) => {
      const next = prev
        .map((spot) => {
          if (spot.id !== spotUpdate.id) return spot
          return {
            ...spot,
            remaining_quantity: spotUpdate.remaining_quantity,
            status: spotUpdate.status,
          }
        })
        .filter((spot) => spot.status === 'active' && spot.remaining_quantity > 0)

      return next
    })

    setSelectedSpot((prev) => {
      if (!prev || prev.id !== spotUpdate.id) return prev
      if (spotUpdate.status !== 'active' || spotUpdate.remaining_quantity <= 0) return null
      return {
        ...prev,
        remaining_quantity: spotUpdate.remaining_quantity,
        status: spotUpdate.status,
      }
    })
  }, [])

  const handleClosePanel = useCallback(() => setSelectedSpot(null), [])

  const handleStartRouteFromModal = useCallback((spot: StickerSpot) => {
    setSelectedSpot(null)
    startRouteForSpot(spot)
  }, [startRouteForSpot])

  const handleCloseRoute = useCallback(() => {
    clearRouteFromMap()
    lastAutoRerouteAtRef.current = 0
    pendingAutoRerouteStatusRef.current = false
    setRouteLoading(false)
    setRouteError(null)
    setRouteStatus(null)
    setRouteState({
      spot: null,
      origin: null,
      distanceMeters: null,
      durationSeconds: null,
    })
  }, [clearRouteFromMap])

  const handleRefreshRoute = useCallback(() => {
    if (!routeState.spot) return
    startRouteForSpot(routeState.spot, userLocation)
  }, [routeState.spot, startRouteForSpot, userLocation])

  const handleOpenExternalNavigation = useCallback(() => {
    const spot = routeState.spot
    if (!spot) return

    const googleMapsUrl = new URL('https://www.google.com/maps/dir/')
    if (userLocation) {
      googleMapsUrl.searchParams.set('api', '1')
      googleMapsUrl.searchParams.set('origin', `${userLocation.lat},${userLocation.lng}`)
      googleMapsUrl.searchParams.set('destination', `${spot.lat},${spot.lng}`)
      googleMapsUrl.searchParams.set('travelmode', 'walking')
    } else {
      googleMapsUrl.pathname = `/maps/search/${encodeURIComponent(`${spot.lat},${spot.lng}`)}`
    }

    window.open(googleMapsUrl.toString(), '_blank', 'noopener,noreferrer')
  }, [routeState.spot, userLocation])

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Global CSS for marker animations */}
      <style>{`
        .matrica-user-marker {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
        }

        .matrica-user-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 10px);
          transform: translateX(-50%);
          white-space: nowrap;
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(9, 9, 11, 0.92);
          border: 1px solid rgba(56, 189, 248, 0.35);
          color: #e0f2fe;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.02em;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          pointer-events: none;
        }

        .matrica-user-tooltip::after {
          content: '';
          position: absolute;
          left: 50%;
          top: 100%;
          transform: translateX(-50%);
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 6px solid rgba(9, 9, 11, 0.92);
        }

        @keyframes userPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(56,189,248,0.3); }
          50%       { box-shadow: 0 0 0 10px rgba(56,189,248,0.08); }
        }
      `}</style>

      {/* Map container */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#71717a', fontSize: 14, pointerEvents: 'none' }}>
          Térkép betöltése…
        </div>
      )}

      {/* Map init error */}
      {mapError && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
          <span style={{ color: '#fca5a5', fontSize: 14 }}>{mapError}</span>
          <button onClick={() => window.location.reload()} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '6px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Oldal frissítése</button>
        </div>
      )}

      {/* Overlay layers (rendered after map is fully loaded) */}
      {mapLoaded && mapRef.current && (
        <>
          {hintSpots.map((spot) => (
            <SpotCircle
              key={spot.id}
              map={mapRef.current!}
              spot={spot}
              radiusMeters={spot.radius_visibility}
              onSelect={handleSelect}
            />
          ))}
          {clickableSpots.map((spot) => (
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
            background: 'rgba(24,24,27,0.95)',
            border: '1px solid rgba(239,68,68,0.6)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 10,
            fontSize: 13,
            zIndex: 20,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span>{geoError}</span>
          <button
            onClick={() => setGeoRetry(r => r + 1)}
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#fca5a5',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Újra próbálom
          </button>
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
          onStartRoute={handleStartRouteFromModal}
          onClaimSubmitted={handleClaimSubmitted}
          showToast={showToast}
        />
      )}

      {routeState.spot && !selectedSpot && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: 16,
            zIndex: 35,
            borderRadius: 14,
            border: '1px solid rgba(244,114,182,0.28)',
            background: 'rgba(9,9,11,0.93)',
            boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
            padding: 14,
            color: '#f4f4f5',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#f9a8d4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Utvonal aktiv
              </div>
              <div style={{ marginTop: 3, fontSize: 16, fontWeight: 700 }}>{routeState.spot.title}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap', color: '#d4d4d8', fontSize: 12 }}>
                <span>Tav: {formatRouteDistance(routeState.distanceMeters)}</span>
                <span>Ido: {formatRouteDuration(routeState.durationSeconds)}</span>
                {routeState.origin ? <span>Kiindulas: sajat poziciod</span> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseRoute}
              style={{
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'transparent',
                color: '#a1a1aa',
                borderRadius: 8,
                padding: '4px 8px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Bezár
            </button>
          </div>

          {routeLoading ? (
            <div style={{ marginTop: 10, fontSize: 12, color: '#a1a1aa' }}>Utvonal tervezese...</div>
          ) : routeError ? (
            <div style={{ marginTop: 10, fontSize: 12, color: '#fda4af' }}>{routeError}</div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: '#a1a1aa' }}>
              Kovessd a rozsaszin vonalat, aztan claimeld a szpotot a helyszinen.
            </div>
          )}

          {routeStatus ? (
            <div
              style={{
                marginTop: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                border: '1px solid rgba(244,114,182,0.24)',
                background: 'rgba(244,114,182,0.12)',
                color: '#fbcfe8',
                padding: '5px 9px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {routeStatus}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedSpot(routeState.spot)}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(132,204,22,0.35)',
                background: 'rgba(132,204,22,0.18)',
                color: '#d9f99d',
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Claim ehhez a szpothoz
            </button>
            <button
              type="button"
              onClick={handleRefreshRoute}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(244,114,182,0.28)',
                background: 'rgba(244,114,182,0.14)',
                color: '#fbcfe8',
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Ujratervezes
            </button>
            <button
              type="button"
              onClick={() => {
                if (!mapRef.current || !routeState.spot) return
                mapRef.current.flyTo({
                  center: [routeState.spot.lng, routeState.spot.lat],
                  zoom: 16.2,
                  offset: [0, -120],
                  duration: 900,
                  essential: true,
                })
              }}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'transparent',
                color: '#d4d4d8',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Ujraközépre
            </button>
            <button
              type="button"
              onClick={handleOpenExternalNavigation}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.05)',
                color: '#a1a1aa',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Google Maps fallback
            </button>
          </div>
        </div>
      )}

      <MatricaLivePanel displayName={chatDisplayName} authToken={chatAuthToken} />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}

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

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { getDistanceMeters } from '@/lib/matrica'
import type { StickerSpot } from '@/lib/matrica'
import SpotCircle from './SpotCircle'
import SpotMarker from './SpotMarker'
import SpotPreview from './SpotPreview'
import ActiveSpotsPanel from './ActiveSpotsPanel'
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
const BOTTOM_ACTION_BAR_HEIGHT = 84
const UI_CLICK_SFX_SRC = '/audio/ui-click.wav'
const UI_TOGGLE_SFX_SRC = '/audio/sfx-glitch.WAV'
const UNIFIED_SPOT_VISIBILITY_RADIUS_METERS = 420

interface UserLocation {
  lat: number
  lng: number
}

interface MapViewProps {
  chatDisplayName: string
  chatAuthToken: string | null
  userRole: 'user' | 'editor' | 'admin'
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

interface PreviewAnchor {
  x: number
  y: number
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

function formatApproxDistanceBand(distanceMeters: number | null): string {
  if (distanceMeters === null) return 'Nem elerheto'
  if (distanceMeters < 100) return 'Nagyon kozel (0-100 m)'
  if (distanceMeters < 300) return 'Kozel (100-300 m)'
  if (distanceMeters < 800) return 'Kozepes tav (300-800 m)'
  if (distanceMeters < 1500) return 'Tagabb kornyek (0.8-1.5 km)'
  return 'Messzebb (1.5 km+)'
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isPaidLockedSpot(spot: StickerSpot): boolean {
  return spot.spot_type === 'paid' && !!spot.is_locked
}


export default function MapView({ chatDisplayName, chatAuthToken, userRole }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const clickSfxRef = useRef<HTMLAudioElement | null>(null)
  const toggleSfxRef = useRef<HTMLAudioElement | null>(null)
  const firstFixRef = useRef(false)
  const lastAutoRerouteAtRef = useRef(0)
  const pendingAutoRerouteStatusRef = useRef(false)
  const handledDeepLinkRef = useRef(false)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoRetry, setGeoRetry] = useState(0)
  const [spots, setSpots] = useState<StickerSpot[]>([])
  const [previewSpot, setPreviewSpot] = useState<StickerSpot | null>(null)
  const [previewAnchor, setPreviewAnchor] = useState<PreviewAnchor | null>(null)
  const [isMobile, setIsMobile] = useState(false)
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
  const [livePanelOpen, setLivePanelOpen] = useState(false)
  const [spotsListOpen, setSpotsListOpen] = useState(false)
  const [unlockingSpotId, setUnlockingSpotId] = useState<string | null>(null)

  const previewCloseTimerRef = useRef<number | null>(null)
  const unlockToastHandledRef = useRef(false)

  const { toasts, show: showToast, dismiss: dismissToast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const click = new Audio(UI_CLICK_SFX_SRC)
    click.preload = 'auto'
    click.volume = 0.36

    const toggle = new Audio(UI_TOGGLE_SFX_SRC)
    toggle.preload = 'auto'
    toggle.volume = 0.22

    clickSfxRef.current = click
    toggleSfxRef.current = toggle

    return () => {
      if (clickSfxRef.current) {
        clickSfxRef.current.pause()
        clickSfxRef.current = null
      }
      if (toggleSfxRef.current) {
        toggleSfxRef.current.pause()
        toggleSfxRef.current = null
      }
    }
  }, [])

  const playUiSound = useCallback((kind: 'click' | 'toggle' = 'click') => {
    const audio = kind === 'toggle' ? toggleSfxRef.current : clickSfxRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => {
      // Some mobile browsers do not like the toggle asset/codec; fall back to the click sound.
      if (kind === 'toggle' && clickSfxRef.current) {
        const fallback = clickSfxRef.current
        fallback.currentTime = 0
        void fallback.play().catch(() => {
          // Ignore autoplay restrictions/errors.
        })
      }
    })
  }, [])

  useEffect(() => {
    if (!routeStatus) return

    const timeoutId = window.setTimeout(() => {
      setRouteStatus((current) => (current === routeStatus ? null : current))
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [routeStatus])

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
    if (isPaidLockedSpot(spot)) {
      setRouteError('Ehhez a fizetos szpothoz elobb feloldas szukseges.')
      return
    }

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
            label.textContent = 'SAJAT POZICIOD';

            const dot = document.createElement('div');
            dot.className = 'matrica-user-dot';
            dot.style.cssText = `
              width: 18px; height: 18px; border-radius: 50%;
              background: radial-gradient(circle at 30% 30%, #f7efe4 0%, #d6ba92 42%, #92795b 100%);
              border: 2px solid rgba(255,255,255,0.92);
              box-shadow: 0 0 0 6px rgba(200,169,126,0.2), 0 0 24px rgba(200,169,126,0.28);
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
  const loadSpots = useCallback(async () => {
    try {
      const headers: Record<string, string> = {}
      if (chatAuthToken) {
        headers.Authorization = `Bearer ${chatAuthToken}`
      }

      const res = await fetch('/api/matrica/spots', {
        headers,
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      setSpots(json.spots ?? [])
    } catch (err) {
      console.error('[MapView] spot fetch failed', err)
      setFetchError('Nem sikerült betölteni a matrica pontokat.')
    }
  }, [chatAuthToken])

  const handleSaveActiveSpot = useCallback(async (spotId: string, updates: { title: string; description: string }) => {
    if (!chatAuthToken) {
      throw new Error('unauthorized')
    }

    const res = await fetch('/api/admin/matrica/spots', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${chatAuthToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: spotId,
        title: updates.title,
        description: updates.description,
      }),
    })

    const json = await res.json().catch(() => null)
    if (!res.ok || !json?.spot) {
      throw new Error(typeof json?.error === 'string' ? json.error : `HTTP ${res.status}`)
    }

    setSpots((prev) => prev.map((spot) => (spot.id === spotId ? { ...spot, ...json.spot } : spot)))
    return json.spot as StickerSpot
  }, [chatAuthToken])

  useEffect(() => {
    void loadSpots()
  }, [loadSpots])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (handledDeepLinkRef.current) return
    if (!mapLoaded || spots.length === 0) return

    const params = new URLSearchParams(window.location.search)
    const spotId = params.get('spotId')
    if (!spotId) return

    const targetSpot = spots.find((spot) => spot.id === spotId)
    handledDeepLinkRef.current = true

    if (targetSpot) {
      const action = params.get('action')
      if (action === 'route') {
        startRouteForSpot(targetSpot)
      } else {
        window.dispatchEvent(new CustomEvent(MATRICA_FOCUS_SPOT_EVENT, {
          detail: { spotId: targetSpot.id },
        }))
      }
    }

    params.delete('spotId')
    params.delete('action')
    const cleanQuery = params.toString()
    const nextUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [mapLoaded, spots, startRouteForSpot])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (unlockToastHandledRef.current) return

    const params = new URLSearchParams(window.location.search)
    const unlockState = params.get('unlock')
    if (!unlockState) return

    unlockToastHandledRef.current = true

    if (unlockState === 'success') {
      showToast('Sikeres fizetes. A szpot reszletei feloldva 24 orara.', 'success')
      void loadSpots()
    } else if (unlockState === 'cancelled') {
      showToast('Fizetes megszakitva.', 'info')
    }

    params.delete('unlock')
    params.delete('spot_id')
    const cleanQuery = params.toString()
    const nextUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ''}`
    window.history.replaceState({}, '', nextUrl)
  }, [loadSpots, showToast])

  const handleUnlockSpot = useCallback(async (spot: StickerSpot) => {
    if (!chatAuthToken) {
      showToast('Bejelentkezes szukseges a feloldashoz.', 'error')
      return
    }

    setUnlockingSpotId(spot.id)
    try {
      const res = await fetch('/api/matrica/spot-unlock/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${chatAuthToken}`,
        },
        body: JSON.stringify({ spot_id: spot.id }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (json?.error === 'already_unlocked') {
          showToast('Ez a szpot mar fel van oldva nalad.', 'info')
          await loadSpots()
          return
        }
        throw new Error(typeof json?.error === 'string' ? json.error : `HTTP ${res.status}`)
      }

      if (!json?.url || typeof json.url !== 'string') {
        throw new Error('missing_checkout_url')
      }

      window.location.assign(json.url)
    } catch (error) {
      console.error('[MapView] unlock checkout failed', error)
      showToast('Nem sikerult elinditani a fizetest ehhez a szpothoz.', 'error')
    } finally {
      setUnlockingSpotId(null)
    }
  }, [chatAuthToken, loadSpots, showToast])

  // ── Handle online user focus events ─────────────────────────────────────────
  useEffect(() => {
    const handleChatButtonClick = (e: Event) => {
      const btn = (e.target as HTMLElement).closest('.matrica-chat-user-btn') as HTMLElement
      if (!btn) return

      const userId = btn.dataset.userId
      const nickname = btn.dataset.nickname
      const avatarUrl = btn.dataset.avatarUrl

      if (!userId || !nickname) return

      // Dispatch event so MatricaNav can open PM panel
      window.dispatchEvent(new CustomEvent('matrica:open-pm', {
        detail: {
          userId,
          nickname,
          avatarUrl: avatarUrl || null,
        },
      }))
    }

    document.addEventListener('click', handleChatButtonClick)
    return () => document.removeEventListener('click', handleChatButtonClick)
  }, [])

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
        userId?: string
        canChat?: boolean
      }>
      const { lat, lng, nickname, avatarUrl, score = 0, accepted = 0, userId, canChat = true } = customEvent.detail

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
        background: #c8a97e;
        border: 3px solid #fff;
        box-shadow: 0 0 12px rgba(200,169,126,0.55), inset 0 0 6px rgba(200,169,126,0.25);
      `

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false, className: 'matrica-online-popup' }))
        .addTo(map)

      const safeNickname = escapeHtml(nickname)
      const safeAvatar = avatarUrl ? escapeHtml(avatarUrl) : null
      const initial = safeNickname.charAt(0).toUpperCase() || '?'
      const popup = marker.getPopup()
      if (!popup) return

      popup.setHTML(`
        <div style="min-width:228px;padding:12px;background:linear-gradient(180deg, rgba(9,12,16,0.97), rgba(11,14,19,0.97));color:#f4f4f5;border:1px solid rgba(200,169,126,0.28);border-radius:12px;box-shadow:0 14px 28px rgba(0,0,0,0.42);backdrop-filter: blur(8px);">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            ${safeAvatar
              ? `<img src="${safeAvatar}" alt="${safeNickname}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid rgba(200,169,126,0.9);" />`
              : `<div style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#1f2937;color:#dbe1e8;font-weight:700;border:2px solid rgba(200,169,126,0.9);">${initial}</div>`}
            <div style="min-width:0;">
              <div style="font-weight:700;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${safeNickname}</div>
              <div style="font-size:12px;color:#9ca3af;">Online most</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:10px;font-size:12px;margin-bottom:${userId && canChat ? '10px' : '0'};">
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span style="color:#9ca3af;">Pontszam</span>
              <span style="color:#e5e7eb;font-weight:700;">${Number.isFinite(score) ? score : 0}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
              <span style="color:#9ca3af;">Elfogadott</span>
              <span style="color:#e5e7eb;font-weight:700;">${Number.isFinite(accepted) ? accepted : 0} db</span>
            </div>
          </div>
          ${userId && canChat ? `<button class="matrica-chat-user-btn" data-user-id="${escapeHtml(userId)}" data-nickname="${safeNickname}" data-avatar-url="${safeAvatar || ''}" style="width:100%;padding:9px 12px;background:rgba(200,169,126,0.14);border:1px solid rgba(200,169,126,0.48);border-radius:8px;color:#f3e9d8;font-size:13px;font-weight:700;letter-spacing:0.03em;cursor:pointer;">CHAT</button><div style="font-size:10px;color:#9ca3af;text-align:center;margin-top:5px;line-height:1.35;">ideiglenes privat chat,<br/>amig online vagytok</div>` : ''}
        </div>
      `)
      marker.togglePopup()

      const popupElement = popup.getElement()
      const chatButton = popupElement?.querySelector('.matrica-chat-user-btn') as HTMLButtonElement | null
      const handleChatClick = (clickEvent: Event) => {
        clickEvent.preventDefault()
        clickEvent.stopPropagation()

        if (!userId) return

        window.dispatchEvent(new CustomEvent('matrica:open-pm', {
          detail: {
            userId,
            nickname,
            avatarUrl: avatarUrl ?? null,
          },
        }))

        marker.remove()
      }

      chatButton?.addEventListener('click', handleChatClick)

      // Remove marker after 5 seconds
      const timeoutId = setTimeout(() => {
        marker.remove()
      }, 5000)

      return () => {
        clearTimeout(timeoutId)
        chatButton?.removeEventListener('click', handleChatClick)
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
      if (!origin || !target) return

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
              'line-color': '#c8a97e',
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

      if (!mapRef.current || typeof lat !== 'number' || typeof lng !== 'number') return

      const focusLat: number = lat
      const focusLng: number = lng

      mapRef.current.flyTo({
        center: [focusLng, focusLat],
        zoom: 16.4,
        duration: 1200,
        essential: true,
      })

      if (targetSpot) {
        setPreviewSpot(targetSpot)
        setPreviewAnchor(null)
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
    if (d <= UNIFIED_SPOT_VISIBILITY_RADIUS_METERS) {
      clickableSpots.push(spot)
    } else {
      hintSpots.push(spot)
    }
  }

  const nearestSpot = useMemo(() => getNearestSpot(userLocation, spots), [userLocation, spots])

  const handleOpenPreview = useCallback((spot: StickerSpot, anchor?: PreviewAnchor | null) => {
    if (previewCloseTimerRef.current !== null) {
      window.clearTimeout(previewCloseTimerRef.current)
      previewCloseTimerRef.current = null
    }
    setPreviewSpot(spot)
    setPreviewAnchor(anchor ?? null)
  }, [])

  const handleClosePreview = useCallback(() => {
    if (previewCloseTimerRef.current !== null) {
      window.clearTimeout(previewCloseTimerRef.current)
      previewCloseTimerRef.current = null
    }
    setPreviewSpot(null)
    setPreviewAnchor(null)
  }, [])

  const handleMarkerHoverStart = useCallback((spot: StickerSpot, anchor: PreviewAnchor) => {
    if (isMobile) return
    handleOpenPreview(spot, anchor)
  }, [handleOpenPreview, isMobile])

  const handleMarkerHoverEnd = useCallback(() => {
    if (isMobile) return
    if (previewCloseTimerRef.current !== null) {
      window.clearTimeout(previewCloseTimerRef.current)
    }
    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewSpot(null)
      setPreviewAnchor(null)
      previewCloseTimerRef.current = null
    }, 120)
  }, [isMobile])

  const handleMarkerPress = useCallback((spot: StickerSpot, anchor: PreviewAnchor) => {
    handleOpenPreview(spot, isMobile ? null : anchor)
  }, [handleOpenPreview, isMobile])

  useEffect(() => {
    if (!mapRef.current) return

    const map = mapRef.current
    const closeOnMapClick = () => {
      setPreviewSpot(null)
      setPreviewAnchor(null)
    }

    map.on('click', closeOnMapClick)
    return () => {
      map.off('click', closeOnMapClick)
    }
  }, [mapLoaded])

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

  const handleToggleSpotsList = useCallback(() => {
    playUiSound('toggle')

    if (previewSpot) {
      handleClosePreview()
    }

    setSpotsListOpen((prev) => {
      const next = !prev
      if (next && spots.length === 0) {
        showToast('Nincs aktiv szpot a kozeledben.', 'info')
      }
      return next
    })
  }, [handleClosePreview, playUiSound, previewSpot, showToast, spots.length])

  const handleCloseSpotsList = useCallback(() => {
    setSpotsListOpen(false)
  }, [])

  const handleSelectSpotFromList = useCallback((spot: StickerSpot) => {
    playUiSound('click')
    setSpotsListOpen(false)
    handleOpenPreview(spot)
  }, [handleOpenPreview, playUiSound])

  const handleStartRouteFromList = useCallback((spot: StickerSpot) => {
    playUiSound('click')
    setSpotsListOpen(false)
    startRouteForSpot(spot)
  }, [playUiSound, startRouteForSpot])


  const handleToggleChatPanel = useCallback(() => {
    playUiSound('toggle')
    window.dispatchEvent(new CustomEvent('matrica:toggle-live-panel'))
  }, [playUiSound])

  const handleOpenSpotAdmin = useCallback(() => {
    playUiSound('click')
    window.setTimeout(() => {
      window.location.href = '/admin/matrica'
    }, 80)
  }, [playUiSound])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        ['--matrica-action-rail-offset' as any]: `${BOTTOM_ACTION_BAR_HEIGHT + 16}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: livePanelOpen ? 'translateX(calc(-1 * min(460px, 42vw)))' : 'translateX(0)',
          transition: 'transform 320ms cubic-bezier(.2,.9,.2,1)',
          willChange: 'transform',
        }}
      >
      {/* Global CSS for marker animations */}
      <style>{`
        .matrica-online-popup .mapboxgl-popup-content {
          background: transparent;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          padding: 0;
        }

        .matrica-online-popup .mapboxgl-popup-tip {
          border-top-color: rgba(17, 24, 39, 0.95) !important;
          border-bottom-color: rgba(17, 24, 39, 0.95) !important;
          border-left-color: rgba(17, 24, 39, 0.95) !important;
          border-right-color: rgba(17, 24, 39, 0.95) !important;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));
        }

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
          border: 1px solid rgba(148, 163, 184, 0.38);
          color: #e2e8f0;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.08em;
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

        @keyframes hudSweep {
          0% { transform: translateX(-130%); opacity: 0; }
          35% { opacity: 0.5; }
          100% { transform: translateX(130%); opacity: 0; }
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
              radiusMeters={UNIFIED_SPOT_VISIBILITY_RADIUS_METERS}
              onSelect={(selected) => handleOpenPreview(selected)}
            />
          ))}
          {clickableSpots.map((spot) => (
            <SpotMarker
              key={spot.id}
              map={mapRef.current!}
              spot={spot}
              onPress={handleMarkerPress}
              onHoverStart={handleMarkerHoverStart}
              onHoverEnd={handleMarkerHoverEnd}
            />
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

      <SpotPreview
        spot={previewSpot}
        approxDistance={formatApproxDistanceBand(
          previewSpot && userLocation
            ? getDistanceMeters(userLocation.lat, userLocation.lng, previewSpot.lat, previewSpot.lng)
            : null
        )}
        isMobile={isMobile}
        isPaid={previewSpot?.spot_type === 'paid'}
        isLocked={previewSpot ? isPaidLockedSpot(previewSpot) : false}
        priceHuf={previewSpot?.price_huf ?? 0}
        unlocking={previewSpot?.id === unlockingSpotId}
        anchor={previewAnchor}
        onClose={handleClosePreview}
        onUnlock={handleUnlockSpot}
        onStartRoute={(spot) => {
          handleClosePreview()
          startRouteForSpot(spot)
        }}
      />

      {routeState.spot && !previewSpot && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(760px, calc(100vw - 24px))',
            bottom: BOTTOM_ACTION_BAR_HEIGHT + 12,
            zIndex: 35,
            borderRadius: 14,
            border: '1px solid rgba(200,169,126,0.32)',
            background: 'rgba(9,9,11,0.93)',
            boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
            padding: 14,
            color: '#f4f4f5',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#c8a97e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
              onClick={() => {
                playUiSound('click')
                handleCloseRoute()
              }}
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
            <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5' }}>{routeError}</div>
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
                border: '1px solid rgba(200,169,126,0.28)',
                background: 'rgba(200,169,126,0.14)',
                color: '#f3e9d8',
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
              onClick={() => {
                playUiSound('click')
                if (!routeState.spot) return
                handleOpenPreview(routeState.spot)
              }}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(200,169,126,0.4)',
                background: 'rgba(200,169,126,0.14)',
                color: '#f3e9d8',
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              Szpot adatlap
            </button>
            <button
              type="button"
              onClick={() => {
                playUiSound('click')
                handleRefreshRoute()
              }}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(200,169,126,0.34)',
                background: 'rgba(200,169,126,0.12)',
                color: '#ead8bf',
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
                playUiSound('click')
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
              onClick={() => {
                playUiSound('click')
                handleOpenExternalNavigation()
              }}
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

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <nav
        aria-label="Halozat gyors műveletek"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(520px, calc(100vw - 16px))',
          bottom: 10,
          zIndex: 230,
          borderRadius: 16,
          border: '1px solid rgba(200,169,126,0.22)',
          background: 'rgba(4, 6, 8, 0.94)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 18px 34px rgba(0,0,0,0.46)',
          display: 'flex',
          gap: 8,
          overflow: 'hidden',
          padding: '9px 10px calc(9px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          type="button"
          onClick={handleOpenSpotAdmin}
          aria-label="Szpot hozzáadása"
          title="Szpot hozzáadása"
          style={{
            borderRadius: 12,
            border: '1px solid rgba(200,169,126,0.4)',
            background: 'rgba(200,169,126,0.14)',
            color: '#f3e9d8',
            padding: '10px 8px',
            cursor: 'pointer',
            minHeight: 44,
            minWidth: 0,
            flex: '1 1 0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(200,169,126,0.12)',
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleToggleSpotsList}
          aria-label="Aktív szpotok"
          title="Aktív szpotok"
          style={{
            borderRadius: 12,
            border: '1px solid rgba(200,169,126,0.4)',
            background: (previewSpot || spotsListOpen) ? 'rgba(42,35,27,0.96)' : 'rgba(23,26,31,0.92)',

            color: '#e5e7eb',
            padding: '10px 8px',
            cursor: 'pointer',
            minHeight: 44,
            minWidth: 0,
            flex: '1 1 0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(200,169,126,0.1)',
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleToggleChatPanel}
          aria-label="Chat panel"
          title="Chat panel"
          style={{
            borderRadius: 12,
            border: '1px solid rgba(200,169,126,0.35)',
            background: livePanelOpen ? 'rgba(28,36,47,0.96)' : 'rgba(12,16,20,0.94)',
            color: '#e2e8f0',
            padding: '10px 8px',
            cursor: 'pointer',
            minHeight: 44,
            minWidth: 0,
            flex: '1 1 0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 0 0 1px rgba(200,169,126,0.1)',
          }}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
            <path d="M4 6.8a2.8 2.8 0 0 1 2.8-2.8h10.4A2.8 2.8 0 0 1 20 6.8v6.4a2.8 2.8 0 0 1-2.8 2.8H10.5l-3.9 3.1a.7.7 0 0 1-1.1-.55V16A2.8 2.8 0 0 1 4 13.2V6.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
        </button>
      </nav>
      </div>

      <ActiveSpotsPanel
        isOpen={spotsListOpen}
        spots={spots}
        userLocation={userLocation}
        isMobile={isMobile}
        bottomOffset={BOTTOM_ACTION_BAR_HEIGHT + 12}
        unlockingSpotId={unlockingSpotId}
        onClose={handleCloseSpotsList}
        onSelectSpot={handleSelectSpotFromList}
        onStartRoute={handleStartRouteFromList}
        canEditSpots={userRole === 'admin'}
        onSaveSpot={handleSaveActiveSpot}
      />


      <MatricaLivePanel
        displayName={chatDisplayName}
        authToken={chatAuthToken}
        onOpenChange={setLivePanelOpen}
        showLauncher={false}
      />
    </div>
  )
}

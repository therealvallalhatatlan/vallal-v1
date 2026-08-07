'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

const REMIND_AT_KEY = 'matrica:permission_center:remind_at'
const DISMISS_REMIND_MS = 24 * 60 * 60 * 1000
const NOT_ENABLED_REMIND_MS = 6 * 60 * 60 * 1000

type Step = 'location' | 'notifications'
type GeoState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'

type Props = {
  accessToken: string | null
  onEnableGeolocation: () => void
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function HalozatPermissionCenter({ accessToken, onEnableGeolocation }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>('location')
  const [geoState, setGeoState] = useState<GeoState>('unknown')
  const [loadingGeo, setLoadingGeo] = useState(false)
  const [loadingPush, setLoadingPush] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const notifiedGeolocationEnabledRef = useRef(false)

  const notificationPermission = typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'denied'

  const canUsePush =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  const scheduleReminder = (delayMs: number) => {
    const remindAt = Date.now() + Math.max(60 * 1000, Math.floor(delayMs))
    window.localStorage.setItem(REMIND_AT_KEY, String(remindAt))
  }

  const markGeoEnabled = () => {
    if (notifiedGeolocationEnabledRef.current) return
    notifiedGeolocationEnabledRef.current = true
    onEnableGeolocation()
  }

  const closeAfterSuccessfulGrant = () => {
    window.localStorage.removeItem(REMIND_AT_KEY)
    setVisible(false)
  }

  useEffect(() => {
    if (!accessToken) return
    if (typeof window === 'undefined') return

    const raw = window.localStorage.getItem(REMIND_AT_KEY)
    const remindAt = raw ? Number(raw) : 0
    if (Number.isFinite(remindAt) && remindAt > Date.now()) {
      return
    }

    let cancelled = false

    const init = async () => {
      let resolvedGeoState: GeoState = 'unknown'

      if (!navigator.geolocation) {
        resolvedGeoState = 'unsupported'
        setGeoState('unsupported')
        setGeoMessage('A bongeszo nem tamogatja a helymeghatarozast.')
        setStep('notifications')
      } else if ('permissions' in navigator && navigator.permissions?.query) {
        try {
          const geoPermission = await navigator.permissions.query({ name: 'geolocation' })
          if (cancelled) return

          if (geoPermission.state === 'granted') {
            resolvedGeoState = 'granted'
            setGeoState('granted')
            markGeoEnabled()
            setStep('notifications')
          } else if (geoPermission.state === 'denied') {
            resolvedGeoState = 'denied'
            setGeoState('denied')
            setGeoMessage('A helymeghatarozas most tiltva van.')
            setStep('notifications')
          } else {
            resolvedGeoState = 'prompt'
            setGeoState('prompt')
            setStep('location')
          }
        } catch {
          if (cancelled) return
          resolvedGeoState = 'prompt'
          setGeoState('prompt')
          setStep('location')
        }
      } else {
        resolvedGeoState = 'prompt'
        setGeoState('prompt')
        setStep('location')
      }

      if (!cancelled) {
        const shouldAskLocation = resolvedGeoState === 'prompt'
        const shouldAskNotifications = canUsePush && notificationPermission !== 'granted'

        if (!shouldAskLocation && !shouldAskNotifications) {
          setVisible(false)
          return
        }
        setVisible(true)
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    if (!visible) return
    if (notificationPermission === 'granted' && geoState !== 'prompt') {
      closeAfterSuccessfulGrant()
    }
  }, [visible, notificationPermission, geoState])

  const locationStatusText = useMemo(() => {
    if (geoState === 'granted') return 'Engedelyezve'
    if (geoState === 'denied') return 'Tiltva'
    if (geoState === 'unsupported') return 'Nem tamogatott'
    if (geoState === 'prompt') return 'Nincs beallitva'
    return 'Ellenorzes...'
  }, [geoState])

  const notificationStatusText = useMemo(() => {
    if (!canUsePush) return 'Nem tamogatott'
    if (notificationPermission === 'granted') return 'Engedelyezve'
    if (notificationPermission === 'denied') return 'Tiltva'
    return 'Nincs beallitva'
  }, [canUsePush, notificationPermission])

  async function requestLocation() {
    if (loadingGeo || !navigator.geolocation) {
      setStep('notifications')
      return
    }

    setLoadingGeo(true)
    setGeoMessage(null)
    let granted = false

    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
        )
      })

      setGeoState('granted')
      markGeoEnabled()
      granted = true
    } catch (error) {
      const err = error as GeolocationPositionError | undefined
      if (err?.code === 1) {
        setGeoState('denied')
        setGeoMessage('A helymeghatarozast elutasitottad.')
      } else if (err?.code === 2) {
        setGeoState('prompt')
        setGeoMessage('Nem sikerult meghatarozni a helyzetet.')
      } else {
        setGeoState('prompt')
        setGeoMessage('A helymeghatarozas most nem sikerult.')
      }
    } finally {
      setLoadingGeo(false)
      if (granted) {
        if (notificationPermission === 'granted') {
          closeAfterSuccessfulGrant()
        } else {
          setStep('notifications')
        }
      } else {
        setStep('notifications')
      }
    }
  }

  async function requestNotifications() {
    if (loadingPush) return
    if (!canUsePush || !accessToken) {
      scheduleReminder(NOT_ENABLED_REMIND_MS)
      setVisible(false)
      return
    }

    setLoadingPush(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        scheduleReminder(NOT_ENABLED_REMIND_MS)
        setVisible(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[HALOZAT-PERMISSIONS] missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        scheduleReminder(NOT_ENABLED_REMIND_MS)
        setVisible(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ subscription }),
      })

      if (!response.ok) {
        console.error('[HALOZAT-PERMISSIONS] subscribe failed:', await response.text().catch(() => 'unknown'))
        scheduleReminder(NOT_ENABLED_REMIND_MS)
      } else {
        closeAfterSuccessfulGrant()
        return
      }

      setVisible(false)
    } catch (error) {
      console.error('[HALOZAT-PERMISSIONS] notification enable error:', error)
      scheduleReminder(NOT_ENABLED_REMIND_MS)
      setVisible(false)
    } finally {
      setLoadingPush(false)
    }
  }

  function handleLater() {
    scheduleReminder(DISMISS_REMIND_MS)
    setVisible(false)
  }

  if (!visible || !accessToken) return null

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        padding: 12,
      }}
    >
      <section
        style={{
          width: 'min(480px, calc(100vw - 24px))',
          border: '1px solid rgba(190,242,100,0.34)',
          background: 'rgba(5,7,9,0.96)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          padding: '14px 14px 12px',
        }}
      >
        <p style={{ margin: 0, color: '#e5e7eb', fontSize: 14, fontWeight: 700 }}>
          Engedélyezd a helymeghatározást és az értesítéseket a teljes élményhez!
        </p>

        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px' }}>
            <div style={{ color: '#d4d4d8', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Helymeghatarozas</div>
            <div style={{ marginTop: 3, color: '#f4f4f5', fontSize: 13 }}>{locationStatusText}</div>
          </div>
          <div style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px' }}>
            <div style={{ color: '#d4d4d8', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ertesitesek</div>
            <div style={{ marginTop: 3, color: '#f4f4f5', fontSize: 13 }}>{notificationStatusText}</div>
          </div>
        </div>

        {geoMessage ? (
          <p style={{ margin: '10px 0 0 0', color: '#fca5a5', fontSize: 12 }}>{geoMessage}</p>
        ) : null}

        {step === 'location' ? (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setStep('notifications')}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'transparent',
                color: '#a1a1aa',
                fontSize: 12,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Kihagyom most
            </button>
            <button
              type="button"
              onClick={() => void requestLocation()}
              disabled={loadingGeo}
              style={{
                border: '1px solid rgba(190,242,100,0.4)',
                background: 'rgba(163,230,53,0.16)',
                color: '#ecfccb',
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 10px',
                cursor: loadingGeo ? 'default' : 'pointer',
                opacity: loadingGeo ? 0.6 : 1,
              }}
            >
              {loadingGeo ? '...' : 'Hely engedelyezése'}
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={handleLater}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'transparent',
                color: '#a1a1aa',
                fontSize: 12,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Kesesobb
            </button>
            <button
              type="button"
              onClick={() => void requestNotifications()}
              disabled={loadingPush || notificationPermission === 'granted'}
              style={{
                border: '1px solid rgba(190,242,100,0.4)',
                background: 'rgba(163,230,53,0.16)',
                color: '#ecfccb',
                fontSize: 12,
                fontWeight: 700,
                padding: '6px 10px',
                cursor: loadingPush ? 'default' : 'pointer',
                opacity: loadingPush ? 0.6 : 1,
              }}
            >
              {notificationPermission === 'granted' ? 'Engedelyezve' : loadingPush ? '...' : 'Ertesitesek engedelyezese'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'

const REMIND_AT_KEY = 'matrica:push_prompt_remind_at'
const DISMISS_REMIND_MS = 24 * 60 * 60 * 1000
const NOT_ENABLED_REMIND_MS = 6 * 60 * 60 * 1000

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

type Props = {
  accessToken: string | null
}

export default function MatricaPushPermissionPrompt({ accessToken }: Props) {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  const scheduleReminder = (delayMs: number) => {
    const remindAt = Date.now() + Math.max(60 * 1000, Math.floor(delayMs))
    window.localStorage.setItem(REMIND_AT_KEY, String(remindAt))
  }

  useEffect(() => {
    if (!accessToken) return
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'granted') return

    const raw = window.localStorage.getItem(REMIND_AT_KEY)
    const remindAt = raw ? Number(raw) : 0
    if (Number.isFinite(remindAt) && remindAt > Date.now()) {
      return
    }

    const timer = window.setTimeout(() => setVisible(true), 2400)
    return () => window.clearTimeout(timer)
  }, [accessToken])

  async function handleEnable() {
    if (!accessToken || loading) return
    setLoading(true)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        scheduleReminder(NOT_ENABLED_REMIND_MS)
        setVisible(false)
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[MATRICA-PUSH] missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        scheduleReminder(NOT_ENABLED_REMIND_MS)
        setVisible(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ subscription }),
      })

      if (!res.ok) {
        console.error('[MATRICA-PUSH] subscribe failed:', await res.text().catch(() => 'unknown'))
        scheduleReminder(NOT_ENABLED_REMIND_MS)
      } else {
        window.localStorage.removeItem(REMIND_AT_KEY)
      }

      setVisible(false)
    } catch (error) {
      console.error('[MATRICA-PUSH] enable error:', error)
      scheduleReminder(NOT_ENABLED_REMIND_MS)
      setVisible(false)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    scheduleReminder(DISMISS_REMIND_MS)
    setVisible(false)
  }

  if (!visible) return null

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
      }}
    >
      <div
        style={{
          width: 'min(420px, calc(100vw - 24px))',
          border: '1px solid rgba(190,242,100,0.34)',
          background: 'rgba(5,7,9,0.96)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          padding: '12px 12px 10px',
        }}
      >
        <p style={{ margin: 0, color: '#e5e7eb', fontSize: 13, lineHeight: 1.35 }}>
          Kersz ertesitest, ha privat uzenetet kapsz?
        </p>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'transparent',
              color: '#a1a1aa',
              fontSize: 12,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Most nem
          </button>
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            style={{
              border: '1px solid rgba(190,242,100,0.4)',
              background: 'rgba(163,230,53,0.16)',
              color: '#ecfccb',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 10px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : 'Igen'}
          </button>
        </div>
      </div>
    </div>
  )
}

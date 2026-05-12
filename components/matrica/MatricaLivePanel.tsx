'use client'

import { useCallback, useEffect, useState } from 'react'
import LiveChat from '@/components/live/LiveChat'
import { createClient } from '@/lib/browser'

type TabKey = 'chat' | 'activity'

type ActivityItem = {
  id: string
  created_at: string
  status: string
  comment: string | null
  user_alias: string
  spot_title: string
}

interface Props {
  displayName: string
  authToken: string | null
}

const supabase = createClient()
const MATRICA_CHAT_ROOM_ID = 'matrica-global'

function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'ismeretlen ido'
  return date.toLocaleString('hu-HU', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string): string {
  if (status === 'accepted') return 'elfogadva'
  if (status === 'rejected') return 'elutasitva'
  return 'fuggoben'
}

export default function MatricaLivePanel({ displayName, authToken }: Props) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('chat')
  const [chatUnread, setChatUnread] = useState(0)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)

  const unreadTotal = chatUnread

  const loadActivity = useCallback(async () => {
    if (!authToken) {
      setActivity([])
      setActivityError('A feed megtekintesehez be kell jelentkezned.')
      return
    }

    setActivityLoading(true)
    setActivityError(null)

    try {
      const res = await fetch('/api/matrica/activity?limit=30', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setActivityError('Nem sikerult betolteni az esemenyeket.')
        setActivity([])
        return
      }

      setActivity(Array.isArray(json.items) ? json.items : [])
    } catch {
      setActivityError('Nem sikerult betolteni az esemenyeket.')
      setActivity([])
    } finally {
      setActivityLoading(false)
    }
  }, [authToken])

  useEffect(() => {
    if (!open || activeTab !== 'activity') return
    void loadActivity()
  }, [open, activeTab, loadActivity])

  useEffect(() => {
    if (!open || activeTab !== 'activity' || !authToken) return

    const channel = supabase
      .channel('public:claims:matrica-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'claims' },
        () => {
          void loadActivity()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [open, activeTab, authToken, loadActivity])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Matrica live panel"
        style={{
          position: 'absolute',
          right: 14,
          bottom: 14,
          zIndex: 210,
          borderRadius: 999,
          border: '1px solid rgba(148,163,184,0.4)',
          background: 'rgba(9,12,18,0.9)',
          color: '#f4f4f5',
          minWidth: 56,
          height: 56,
          padding: '0 16px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.02em',
          cursor: 'pointer',
          boxShadow: '0 12px 34px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
        }}
      >
        LIVE
        {!open && unreadTotal > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              borderRadius: 999,
              background: '#94a3b8',
              color: '#0f172a',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
            }}
          >
            {Math.min(unreadTotal, 99)}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          style={{
            position: 'absolute',
            right: 14,
            bottom: 80,
            zIndex: 210,
            width: 'min(420px, calc(100vw - 28px))',
            height: 'min(68vh, 560px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(148,163,184,0.24)',
            background: 'linear-gradient(180deg, rgba(7,10,16,0.95), rgba(11,18,32,0.94))',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
          }}
        >
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: '#a1a1aa',
                borderRadius: 8,
                padding: '3px 8px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Bezár
            </button>
          </header>

          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                borderRadius: 999,
                border: activeTab === 'chat' ? '1px solid rgba(148,163,184,0.45)' : '1px solid rgba(255,255,255,0.15)',
                background: activeTab === 'chat' ? 'rgba(148,163,184,0.16)' : 'transparent',
                color: activeTab === 'chat' ? '#e2e8f0' : '#d4d4d8',
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              style={{
                borderRadius: 999,
                border: activeTab === 'activity' ? '1px solid rgba(148,163,184,0.45)' : '1px solid rgba(255,255,255,0.15)',
                background: activeTab === 'activity' ? 'rgba(148,163,184,0.16)' : 'transparent',
                color: activeTab === 'activity' ? '#e2e8f0' : '#d4d4d8',
                fontSize: 12,
                fontWeight: 700,
                padding: '5px 12px',
                cursor: 'pointer',
              }}
            >
              Események
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, padding: activeTab === 'chat' ? 8 : 0 }}>
            {activeTab === 'chat' ? (
              <LiveChat
                roomId={MATRICA_CHAT_ROOM_ID}
                displayName={displayName}
                role="viewer"
                compact
                active={open && activeTab === 'chat'}
                onUnreadChange={setChatUnread}
                authToken={authToken}
                requireAuth
              />
            ) : (
              <div style={{ height: '100%', overflowY: 'auto', padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: '#a1a1aa' }}>Legutobbi claim aktivitás</span>
                  <button
                    type="button"
                    onClick={() => void loadActivity()}
                    disabled={activityLoading}
                    style={{
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'transparent',
                      color: '#d4d4d8',
                      borderRadius: 8,
                      fontSize: 12,
                      padding: '4px 8px',
                      cursor: activityLoading ? 'default' : 'pointer',
                      opacity: activityLoading ? 0.6 : 1,
                    }}
                  >
                    Frissit
                  </button>
                </div>

                {activityLoading ? (
                  <p style={{ margin: 0, color: '#71717a', fontSize: 13 }}>Betoltes...</p>
                ) : activityError ? (
                  <p style={{ margin: 0, color: '#fda4af', fontSize: 13 }}>{activityError}</p>
                ) : activity.length === 0 ? (
                  <p style={{ margin: 0, color: '#71717a', fontSize: 13 }}>Meg nincs activity bejegyzes.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {activity.map((item) => (
                      <article
                        key={item.id}
                        style={{
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 10,
                          padding: '9px 10px',
                          background: 'rgba(15,23,42,0.45)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                          <strong style={{ color: '#f4f4f5', fontSize: 12 }}>{item.user_alias}</strong>
                          <span style={{ color: '#71717a', fontSize: 11 }}>{formatTime(item.created_at)}</span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: 12 }}>
                          claim: {item.spot_title} ({statusLabel(item.status)})
                        </p>
                        {item.comment ? (
                          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: 12 }}>{item.comment}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}
    </>
  )
}

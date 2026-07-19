'use client'

import { useCallback, useEffect, useState } from 'react'
import LiveChat from '@/components/live/LiveChat'
import MatricaPrivateMessagePanel from '@/components/matrica/MatricaPrivateMessagePanel'
import { useSessionGuard } from '@/hooks/useSessionGuard.js'
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
  onOpenChange?: (open: boolean) => void
  showLauncher?: boolean
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

export default function MatricaLivePanel({ displayName, authToken, onOpenChange, showLauncher = true }: Props) {
    const { session } = useSessionGuard()
    const currentUserId = (session as any)?.user?.id
  
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('chat')
  const [chatUnread, setChatUnread] = useState(0)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityError, setActivityError] = useState<string | null>(null)
  const [pmRecipientName, setPmRecipientName] = useState<string | null>(null)
  const [pmRecipientData, setPmRecipientData] = useState<{ id: string; nickname: string; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    const updateMobileState = () => setIsMobile(window.innerWidth < 768)
    updateMobileState()
    window.addEventListener('resize', updateMobileState)
    return () => window.removeEventListener('resize', updateMobileState)
  }, [])

  useEffect(() => {
    if (!pmRecipientName || !authToken) return

    let cancelled = false

    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/matrica/online-users', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        })
        const json = await res.json()
        if (!cancelled && json.ok && Array.isArray(json.users)) {
          const user = json.users.find((u: any) => u.nickname === pmRecipientName)
          if (user) {
            setPmRecipientData({
              id: user.id,
              nickname: user.nickname,
              avatarUrl: user.avatarUrl || null,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }

    void fetchUserData()

    return () => {
      cancelled = true
    }
  }, [pmRecipientName, authToken])

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

  useEffect(() => {
    onOpenChange?.(open)
  }, [onOpenChange, open])

  useEffect(() => {
    const onToggle = () => setOpen((prev) => !prev)
    const onOpen = () => setOpen(true)
    const onClose = () => setOpen(false)

    window.addEventListener('matrica:toggle-live-panel', onToggle)
    window.addEventListener('matrica:open-live-panel', onOpen)
    window.addEventListener('matrica:close-live-panel', onClose)

    return () => {
      window.removeEventListener('matrica:toggle-live-panel', onToggle)
      window.removeEventListener('matrica:open-live-panel', onOpen)
      window.removeEventListener('matrica:close-live-panel', onClose)
    }
  }, [])

  return (
    <>
      {showLauncher ? (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Matrica live panel"
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 220,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'rgba(5,7,9,0.95)',
            color: '#f4f4f5',
            minWidth: 60,
            height: 74,
            padding: '0 14px',
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
                background: '#a3e635',
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
      ) : null}

      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          top: 'var(--matrica-header-offset, 90px)',
          right: 0,
          bottom: 0,
          left: 0,
          background: 'rgba(2, 6, 23, 0.45)',
          backdropFilter: 'blur(1px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 260ms ease',
          zIndex: 211,
        }}
        aria-hidden={!open}
      />

      <section
        style={{
          position: 'fixed',
          right: 0,
          top: 'var(--matrica-header-offset, 90px)',
          bottom: 0,
          zIndex: 212,
          width: isMobile ? '100vw' : 'min(460px, 92vw)',
          height: 'calc(100dvh - var(--matrica-header-offset, 90px))',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          overflow: 'hidden',
          borderLeft: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(180deg, rgba(6,8,10,0.98), rgba(4,6,8,0.98))',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
          transform: open ? 'translateX(0)' : 'translateX(105%)',
          transition: 'transform 320ms cubic-bezier(.2,.9,.2,1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        aria-hidden={!open}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <strong style={{ color: '#e2e8f0', fontSize: 12, letterSpacing: '0.08em' }}>KOZOS CHAT</strong>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.03)',
              color: '#a1a1aa',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Bezárás"
          >
            ×
          </button>
        </header>

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: isMobile ? '10px 12px' : '8px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            style={{
              border: activeTab === 'chat' ? '1px solid rgba(163,230,53,0.35)' : '1px solid rgba(255,255,255,0.15)',
              background: activeTab === 'chat' ? 'rgba(163,230,53,0.08)' : 'transparent',
              color: activeTab === 'chat' ? '#d9f99d' : '#d4d4d8',
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
              border: activeTab === 'activity' ? '1px solid rgba(163,230,53,0.35)' : '1px solid rgba(255,255,255,0.15)',
              background: activeTab === 'activity' ? 'rgba(163,230,53,0.08)' : 'transparent',
              color: activeTab === 'activity' ? '#d9f99d' : '#d4d4d8',
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 12px',
              cursor: 'pointer',
            }}
          >
            Események
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: activeTab === 'chat' ? (isMobile ? 10 : 8) : 0 }}>
          {activeTab === 'chat' ? (
            <LiveChat
              roomId={MATRICA_CHAT_ROOM_ID}
              displayName={displayName}
              role="viewer"
              compact
              active={open && activeTab === 'chat'}
              onUnreadChange={setChatUnread}
              onUserNameClick={(username) => setPmRecipientName(username)}
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
                        padding: '9px 10px',
                        background: 'rgba(255,255,255,0.03)',
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
      
      {pmRecipientData && (
        <MatricaPrivateMessagePanel
          recipient={pmRecipientData}
            currentUserId={currentUserId || ''}
          displayName={displayName}
          authToken={authToken}
          onClose={() => {
            setPmRecipientName(null)
            setPmRecipientData(null)
          }}
        />
      )}
    </>
  )
}

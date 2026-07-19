'use client'

import { useEffect, useMemo, useState } from 'react'
import LiveChat from '@/components/live/LiveChat'
import { buildPrivateRoomId, getPrivateRoomSenderRole } from '@/lib/live/privateRooms'

type Recipient = {
  id: string
  nickname: string
  avatarUrl: string | null
}

interface Props {
  recipient: Recipient
  currentUserId: string
  displayName: string
  authToken: string | null
  onClose: () => void
  onUnreadChange?: (unreadCount: number, userId: string) => void
}

export default function MatricaPrivateMessagePanel({
  recipient,
  currentUserId,
  displayName,
  authToken,
  onClose,
  onUnreadChange,
}: Props) {
  const [isMobile, setIsMobile] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const bottomRailOffset = isMobile
    ? 'calc(86px + env(safe-area-inset-bottom, 0px))'
    : '94px'

  useEffect(() => {
    const updateMobileState = () => setIsMobile(window.innerWidth < 768)
    updateMobileState()
    window.addEventListener('resize', updateMobileState)
    return () => window.removeEventListener('resize', updateMobileState)
  }, [])

  const roomId = useMemo(() => buildPrivateRoomId(currentUserId, recipient.id), [currentUserId, recipient.id])
  const selfRole = useMemo(() => getPrivateRoomSenderRole(roomId, currentUserId) || 'viewer', [roomId, currentUserId])

  useEffect(() => {
    onUnreadChange?.(unreadCount, recipient.id)
  }, [unreadCount, recipient.id, onUnreadChange])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <section
      style={{
        position: 'fixed',
        right: isMobile ? 0 : 14,
        left: isMobile ? 0 : 'auto',
        bottom: bottomRailOffset,
        top: 'var(--matrica-header-offset, 90px)',
        zIndex: 260,
        width: isMobile ? '100vw' : 'min(380px, calc(100vw - 28px))',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 0,
        overflow: 'hidden',
        border: '1px solid rgba(200,169,126,0.28)',
        background: 'linear-gradient(180deg, rgba(6,8,10,0.98), rgba(4,6,8,0.98))',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 48px rgba(0,0,0,0.55)',
        pointerEvents: 'auto',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: isMobile ? '12px 14px' : '12px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {recipient.avatarUrl ? (
            <img
              src={recipient.avatarUrl}
              alt={recipient.nickname}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(200,169,126,0.2)',
                color: '#f4f4f5',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {recipient.nickname.trim().charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#f4f4f5', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {recipient.nickname}
            </div>
            <div style={{ color: '#71717a', fontSize: 11 }}>Privát üzenet</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
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

      <div style={{ flex: 1, minHeight: 0 }}>
        <LiveChat
          displayName={displayName}
          role={selfRole}
          selfRole={selfRole}
          roomId={roomId}
          authToken={authToken}
          requireAuth
          enableRealtime={false}
          pollIntervalMs={2500}
          hideHeader
          placeholder={`${recipient.nickname} üzenete...`}
          onUnreadChange={(count) => setUnreadCount(count)}
        />
      </div>
    </section>
  )
}
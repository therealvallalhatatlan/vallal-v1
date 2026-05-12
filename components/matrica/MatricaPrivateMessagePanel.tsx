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
}

export default function MatricaPrivateMessagePanel({
  recipient,
  currentUserId,
  displayName,
  authToken,
  onClose,
}: Props) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const updateMobileState = () => setIsMobile(window.innerWidth < 768)
    updateMobileState()
    window.addEventListener('resize', updateMobileState)
    return () => window.removeEventListener('resize', updateMobileState)
  }, [])

  const roomId = useMemo(() => buildPrivateRoomId(currentUserId, recipient.id), [currentUserId, recipient.id])
  const selfRole = useMemo(() => getPrivateRoomSenderRole(roomId, currentUserId) || 'viewer', [roomId, currentUserId])

  return (
    <section
      style={{
        position: isMobile ? 'fixed' : 'absolute',
        right: isMobile ? 0 : 14,
        left: isMobile ? 0 : 'auto',
        bottom: isMobile ? 0 : 14,
        top: isMobile ? 'var(--matrica-header-offset, 90px)' : 'auto',
        zIndex: 240,
        width: isMobile ? '100vw' : 'min(380px, calc(100vw - 28px))',
        height: isMobile ? 'calc(100dvh - var(--matrica-header-offset, 90px))' : 'min(62vh, 520px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: isMobile ? 0 : 16,
        overflow: 'hidden',
        border: isMobile ? 'none' : '1px solid rgba(148,163,184,0.24)',
        background: 'linear-gradient(180deg, rgba(7,10,16,0.96), rgba(11,18,32,0.94))',
        backdropFilter: 'blur(12px)',
        boxShadow: isMobile ? 'none' : '0 20px 48px rgba(0,0,0,0.55)',
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
                background: 'rgba(148,163,184,0.2)',
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
            border: 'none',
            background: 'transparent',
            color: '#a1a1aa',
            borderRadius: 4,
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
        />
      </div>
    </section>
  )
}
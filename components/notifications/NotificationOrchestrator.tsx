'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { applyUnreadToFavicon } from '@/lib/notifications/faviconBadge'
import { setAppBadgeCount } from '@/lib/notifications/appBadge'
import { applyUnreadToDocumentTitle } from '@/lib/notifications/titleBadge'
import {
  clearAllUnreadSources,
  getUnreadSnapshot,
  setUnreadSource,
  subscribeUnread,
} from '@/lib/notifications/unreadStore'

function onStoreChange(listener: () => void): () => void {
  return subscribeUnread(listener)
}

function getStoreSnapshot(): number {
  return getUnreadSnapshot().total
}

export default function NotificationOrchestrator() {
  const totalUnread = useSyncExternalStore(onStoreChange, getStoreSnapshot, () => 0)

  useEffect(() => {
    applyUnreadToDocumentTitle(totalUnread)
    void applyUnreadToFavicon(totalUnread)
    void setAppBadgeCount(totalUnread)
  }, [totalUnread])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; unreadCount?: number } | null
      if (!data || typeof data.type !== 'string') return

      if (data.type === 'PUSH_RECEIVED') {
        const unreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : 1
        setUnreadSource('push:background', unreadCount)
      }

      if (data.type === 'PUSH_CLICKED') {
        console.log('[UNREAD STORE CLEAR]', {
          reason: 'NotificationOrchestrator PUSH_CLICKED',
          sourcesBeforeClear: getUnreadSnapshot().sources,
        });
        clearAllUnreadSources()
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleSwMessage)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
    }
  }, [])

  return null
}

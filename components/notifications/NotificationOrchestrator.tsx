'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { applyUnreadToFavicon, resetFaviconToBase } from '@/lib/notifications/faviconBadge'
import { clearAppBadgeCount, setAppBadgeCount } from '@/lib/notifications/appBadge'
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

    const resetUnreadIfVisible = () => {
      if (document.visibilityState !== 'visible') return
      clearAllUnreadSources()
      applyUnreadToDocumentTitle(0)
      resetFaviconToBase()
      void clearAppBadgeCount()
    }

    const handleVisibilityChange = () => {
      resetUnreadIfVisible()
    }

    const handleFocus = () => {
      resetUnreadIfVisible()
    }

    const handleSwMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; unreadCount?: number } | null
      if (!data || typeof data.type !== 'string') return

      if (data.type === 'PUSH_RECEIVED') {
        const unreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : 1
        setUnreadSource('push:background', unreadCount)
      }

      if (data.type === 'PUSH_CLICKED') {
        clearAllUnreadSources()
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    navigator.serviceWorker?.addEventListener('message', handleSwMessage)

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage)
    }
  }, [])

  return null
}

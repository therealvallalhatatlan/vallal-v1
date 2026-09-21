'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { applyUnreadToFavicon } from '@/lib/notifications/faviconBadge'
import { setAppBadgeCount } from '@/lib/notifications/appBadge'
import { applyUnreadToDocumentTitle } from '@/lib/notifications/titleBadge'
import {
  getUnreadSnapshot,
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

  return null
}

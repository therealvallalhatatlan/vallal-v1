function hasNavigator(): boolean {
  return typeof navigator !== 'undefined'
}

export async function setAppBadgeCount(unreadCount: number): Promise<void> {
  if (!hasNavigator()) return

  const count = Number.isFinite(unreadCount) ? Math.max(0, Math.floor(unreadCount)) : 0
  const nav = navigator as Navigator & {
    setAppBadge?: (contents?: number) => Promise<void>
    clearAppBadge?: () => Promise<void>
  }

  try {
    if (count <= 0) {
      await nav.clearAppBadge?.()
      return
    }

    await nav.setAppBadge?.(count)
  } catch {
    // No-op: badging is best effort only.
  }
}

export async function clearAppBadgeCount(): Promise<void> {
  if (!hasNavigator()) return

  const nav = navigator as Navigator & {
    clearAppBadge?: () => Promise<void>
  }

  try {
    await nav.clearAppBadge?.()
  } catch {
    // No-op: badging is best effort only.
  }
}

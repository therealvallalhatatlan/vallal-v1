export type UnreadSourceKey = string

export interface UnreadSnapshot {
  sources: Record<UnreadSourceKey, number>
  total: number
}

type Listener = () => void

const listeners = new Set<Listener>()
const sources: Record<UnreadSourceKey, number> = {}

function sanitizeUnreadCount(count: number): number {
  if (!Number.isFinite(count)) return 0
  return Math.max(0, Math.floor(count))
}

function emit(): void {
  console.log('[UNREAD STORE] EMIT')
  console.log('[UNREAD STORE EMIT]', { sources: { ...sources } })
  for (const listener of listeners) {
    listener()
  }
}

export function getUnreadSnapshot(): UnreadSnapshot {
  const copy = { ...sources }
  let total = 0
  for (const value of Object.values(copy)) {
    total += sanitizeUnreadCount(value)
  }

  const snapshot = { sources: copy, total }
  console.log('[UNREAD STORE] SNAPSHOT', snapshot)
  return snapshot
}

export function subscribeUnread(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setUnreadSource(source: UnreadSourceKey, count: number): void {
  console.log('[UNREAD STORE SET]', { source, count, sources: { ...sources } })
  const nextValue = sanitizeUnreadCount(count)
  const previous = sources[source] ?? 0
  if (nextValue === previous) {
    console.log('[UNREAD STORE] no change for', source, nextValue)
    return
  }

  if (nextValue <= 0) {
    delete sources[source]
  } else {
    sources[source] = nextValue
  }

  emit()
}

export function incrementUnreadSource(source: UnreadSourceKey, delta = 1): void {
  const current = sources[source] ?? 0
  setUnreadSource(source, current + delta)
}

export function clearUnreadSource(source: UnreadSourceKey): void {
  if (!(source in sources)) return
  delete sources[source]
  emit()
}

export function clearUnreadSourcesByPrefix(prefix: string): void {
  let changed = false
  for (const key of Object.keys(sources)) {
    if (key.startsWith(prefix)) {
      delete sources[key]
      changed = true
    }
  }

  if (changed) {
    emit()
  }
}

export function clearAllUnreadSources(): void {
  const keys = Object.keys(sources)
  if (keys.length === 0) return

  for (const key of keys) {
    delete sources[key]
  }

  emit()
}

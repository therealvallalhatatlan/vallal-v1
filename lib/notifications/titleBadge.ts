const TITLE_PREFIX_RE = /^\(\d+\)\s+/

let baseTitleCache: string | null = null

export function getBaseDocumentTitle(): string {
  if (typeof document === 'undefined') return ''

  if (!baseTitleCache) {
    baseTitleCache = document.title.replace(TITLE_PREFIX_RE, '').trim()
  }

  return baseTitleCache
}

export function setBaseDocumentTitle(nextBaseTitle: string): void {
  const sanitized = nextBaseTitle.trim()
  baseTitleCache = sanitized
  if (typeof document !== 'undefined') {
    document.title = sanitized
  }
}

export function applyUnreadToDocumentTitle(unreadCount: number): void {
  if (typeof document === 'undefined') return

  const baseTitle = getBaseDocumentTitle()
  const count = Number.isFinite(unreadCount) ? Math.max(0, Math.floor(unreadCount)) : 0

  document.title = count > 0 ? `(${count}) Messages - ${baseTitle}` : baseTitle
}

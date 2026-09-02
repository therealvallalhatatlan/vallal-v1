/**
 * Parse YouTube and Vimeo URLs into a provider and ID for embedding.
 */
export type VideoParseResult = { provider: 'youtube' | 'vimeo'; id: string }

export function parseVideoUrl(url: string): VideoParseResult | null {
  try {
    const u = new URL(url.trim())
    const host = u.host.replace(/^www\./, '').toLowerCase()
    // YouTube short link
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1)
      return id ? { provider: 'youtube', id } : null
    }
    // YouTube standard or embed link
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      let id = u.searchParams.get('v') || ''
      if (!id) {
        const m = u.pathname.match(/\/embed\/([\w-]+)/)
        id = m?.[1] || ''
      }
      return id ? { provider: 'youtube', id } : null
    }
    // Vimeo link
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/')[1]
      return id ? { provider: 'vimeo', id } : null
    }
  } catch {
    return null
  }
  return null
}
const ICON_SELECTOR = "link[rel='icon']"

let baseFaviconHref: string | null = null
let lastAppliedCount = -1

function resolveLinkElement(): HTMLLinkElement | null {
  if (typeof document === 'undefined') return null

  const existing = document.querySelector(ICON_SELECTOR) as HTMLLinkElement | null
  if (existing) return existing

  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = '/icons/icon-192.png'
  document.head.appendChild(link)
  return link
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image_load_failed'))
    image.src = src
  })
}

function drawBadge(baseImage: HTMLImageElement, count: number): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return baseImage.src
  }

  ctx.drawImage(baseImage, 0, 0, 64, 64)

  const label = count > 99 ? '99+' : String(count)
  const radius = 16
  const cx = 48
  const cy = 16

  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 20px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy + 1)

  return canvas.toDataURL('image/png')
}

export async function applyUnreadToFavicon(unreadCount: number): Promise<void> {
  if (typeof document === 'undefined') return

  const count = Number.isFinite(unreadCount) ? Math.max(0, Math.floor(unreadCount)) : 0
  if (count === lastAppliedCount) return

  const link = resolveLinkElement()
  if (!link) return

  if (!baseFaviconHref) {
    baseFaviconHref = link.href
  }

  if (count <= 0) {
    link.href = baseFaviconHref
    lastAppliedCount = 0
    return
  }

  try {
    const image = await loadImage(baseFaviconHref)
    link.href = drawBadge(image, count)
    lastAppliedCount = count
  } catch {
    // No-op: if image drawing fails we still keep title/app badge updates.
  }
}

export function resetFaviconToBase(): void {
  if (typeof document === 'undefined') return

  const link = resolveLinkElement()
  if (!link || !baseFaviconHref) return
  link.href = baseFaviconHref
  lastAppliedCount = 0
}

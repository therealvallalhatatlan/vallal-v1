/**
 * Single source of truth for /konyv-3/[id] entries.
 *
 * Add an entry here and a matching content/konyv3/{id}.txt file.
 * Video sources may be a local public path or a direct URL to a browser-playable video.
 */
export interface Konyv3Link {
  label: string
  href: string
  /** Open the link in a new tab. Defaults to false. */
  external?: boolean
}

export interface Konyv3Entry {
  /** URL-safe identifier, for example "az-utolso-ejszaka". */
  id: string
  title: string
  /** Publication/story date in ISO format: YYYY-MM-DD. */
  date: string
  /** Local public path or direct URL to a browser-playable video file. */
  videoSrc: string
  /** Optional poster shown while the video is loading. */
  posterSrc?: string
  /** Optional links shown below the shared footer links. */
  links?: Konyv3Link[]
}

export const konyv3Bejegyzesek: Konyv3Entry[] = [
  // Add published entries here. Each entry requires a matching content/konyv3/{id}.txt file.
]

export function getKonyv3Entry(id: string): Konyv3Entry | undefined {
  return konyv3Bejegyzesek.find((entry) => entry.id === id)
}

export function formatKonyv3Date(isoDate: string): string {
  const parsedDate = new Date(`${isoDate}T12:00:00.000Z`)
  if (Number.isNaN(parsedDate.getTime())) return isoDate

  return new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsedDate)
}

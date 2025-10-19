import { headers } from 'next/headers'
import AudioPlayer from '@/components/AudioPlayer'
import { notFound } from 'next/navigation' // +
import type { Metadata } from 'next'

// Fallback in-code playlist (ha nincs JSON a public/playlists alatt)
const FALLBACK: Record<string, { title: string; file: string }[]> = {
  'holnaptol-leallok': [
    { title: 'Intro – Város zaj', file: 'holnaptol-leallok/01_intro.mp3' },
    { title: 'Szoba – loop', file: 'holnaptol-leallok/02_szoba.mp3' },
    { title: 'Éjfél – futás', file: 'holnaptol-leallok/03_ejfel.mp3' },
  ],
  sample: [
    { title: 'Bloody Shelby – We The North (Original Mix)', file: 'sample/Bloody Shelby - We The North (Original Mix).mp3' },
  ],
}

type PlaylistJson = {
  excerpt?: string
  tracks: { title: string; file: string }[]
  visuals?: string[]
}

function isStringArray(a: unknown): a is string[] {
  return Array.isArray(a) && a.every((v) => typeof v === 'string')
}
function isTracksArray(a: unknown): a is { title: string; file: string }[] {
  return Array.isArray(a) && a.every(
    (t) => t && typeof t === 'object' && typeof (t as any).title === 'string' && typeof (t as any).file === 'string'
  )
}
function isPlaylistJson(x: unknown): x is PlaylistJson {
  if (!x || typeof x !== 'object') return false
  const obj = x as any
  if (!isTracksArray(obj.tracks)) return false
  if (obj.excerpt != null && typeof obj.excerpt !== 'string') return false
  if (obj.visuals != null && !isStringArray(obj.visuals)) return false
  return true
}

async function loadPlaylistFromJSON(slug: string) {
  // JSON helye: public/playlists/<slug>.json (root-relative fetch -> stabil dev/prod, edge/server)
  const url = `/playlists/${encodeURIComponent(slug)}.json`
  try {
    const res = await fetch(url /* implicit cache (force-cache) on static public assets */)
    if (!res.ok) {
      console.warn(`[playlist] fetch failed for slug="${slug}" status=${res.status}`)
      return null
    }
    const data = await res.json().catch((e) => {
      console.warn(`[playlist] invalid JSON for slug="${slug}":`, e)
      return null
    })
    if (!isPlaylistJson(data)) {
      console.warn(`[playlist] schema validation failed for slug="${slug}"`)
      return null
    }
    return data as PlaylistJson
  } catch (err) {
    console.error(`[playlist] fetch error for slug="${slug}":`, err)
    return null
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // Prevent handling favicon and other static assets
  if (slug === 'favicon.ico' || slug.includes('.')) {
    notFound() // replace throw new Error
  }
  
  const json = await loadPlaylistFromJSON(slug)
  // Resilient fallback if JSON missing/invalid or has empty/invalid tracks
  const tracks = (json?.tracks && json.tracks.length > 0) ? json.tracks : (FALLBACK[slug] ?? FALLBACK.sample)
  const visuals = isStringArray(json?.visuals) && json!.visuals!.length > 0
    ? json!.visuals!
    : ['/img/visuals/noise-01.jpg','/img/visuals/noise-02.jpg','/img/visuals/noise-03.jpg']
  const excerpt = typeof json?.excerpt === 'string' ? json!.excerpt! : undefined
  const displayTitle = decodeURIComponent(slug).replace(/-/g, ' ')

  return (
    <main className="w-[min(640px,100vw-32px)] px-4 space-y-12 mx-auto p-6 text-zinc-100">
      <h1 className="text-6xl font-semibold mt-12 mb-4 text-center rgb-title">{displayTitle}</h1>
      {excerpt && (
        <div className="mb-8 text-center">
          <p className="text-lg text-zinc-300  max-w-3xl mx-auto leading-relaxed">
            {excerpt}
          </p>
        </div>
      )}
      <p className="text-xs text-center opacity-35 mb-10"><code>public/playlists/{slug}.json</code></p>
      
      
      <AudioPlayer tracks={tracks} images={visuals} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MusicPlaylist',
            name: displayTitle,
            description: excerpt || undefined,
            numTracks: (tracks || []).length,
            track: (tracks || []).map((t, i) => ({
              '@type': 'MusicRecording',
              position: i + 1,
              name: t.title,
              audio: {
                '@type': 'AudioObject',
                // keep path segment encoding to survive spaces/diacritics/symbols
                url: `/api/audio/${t.file.split('/').map(encodeURIComponent).join('/')}`
              }
            }))
          })
        }}
      />
      {/* BreadcrumbList JSON-LD: Kezdőlap → Novellák → {displayTitle} */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Kezdőlap',
                item: 'https://vallalhatatlan.online/'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Novellák',
                item: 'https://vallalhatatlan.online/novellak'
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: displayTitle,
                item: `https://vallalhatatlan.online/${encodeURIComponent(slug)}`
              }
            ]
          })
        }}
      />
      <style>{`
        .rgb-title {
          position: relative;
          /* Erősebb chromatic split, mozgás nélkül */
          text-shadow:
            3px 0 0 rgba(255,0,0,0.85),
            -3px 0 0 rgba(0,255,255,0.85),
            0 2px 0 rgba(0,0,0,0.35);
          filter: contrast(140%) saturate(140%);
        }
      `}</style>
    </main>
  )
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  if (!slug || slug === 'favicon.ico' || slug.includes('.')) return {}

  const json = await loadPlaylistFromJSON(slug)
  const title = decodeURIComponent(slug).replace(/-/g, ' ')
  const desc = (json?.excerpt ?? '').slice(0, 160)
  const url = `/${encodeURIComponent(slug)}`
  return {
    title,
    description: desc || undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc || undefined,
      url,
      images: [{ url: '/og.jpg' }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc || undefined,
      images: ['/og.jpg'],
    },
  }
}
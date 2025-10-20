// app/[slug]/page.tsx
import AudioPlayer from '@/components/AudioPlayer'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { loadPlaylist } from '@/lib/playlistIndex'

// ===== Config =====
const SITE_ORIGIN = 'https://vallalhatatlan.online'
const FALLBACK_VISUALS = [
  '/img/visuals/noise-01.jpg',
  '/img/visuals/noise-02.jpg',
  '/img/visuals/noise-03.jpg',
]

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

// ===== Helpers =====
function humanize(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, ' ')
}
function absolutize(url: string) {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${SITE_ORIGIN}${url}`
  return `${SITE_ORIGIN}/${url}`
}
function firstVisualFrom(data?: { visuals?: string[] } | null) {
  const arr = Array.isArray(data?.visuals) && data!.visuals!.length ? data!.visuals! : FALLBACK_VISUALS
  return arr[0]
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params

  // Prevent handling favicon and other static assets
  if (slug === 'favicon.ico' || slug.includes('.')) {
    notFound()
  }

  const data = await loadPlaylist(slug)

  // Resilient fallback if JSON missing/invalid
  const tracks = data?.tracks?.length ? data.tracks : (FALLBACK[slug] ?? FALLBACK.sample)
  const visuals = (Array.isArray(data?.visuals) && data!.visuals!.length)
    ? data!.visuals!
    : FALLBACK_VISUALS
  const excerpt = typeof data?.excerpt === 'string' ? data!.excerpt! : undefined
  const displayTitle = humanize(slug)

  return (
    <main className="w-[min(640px,100vw-32px)] px-4 space-y-12 mx-auto p-6 text-zinc-100">
      <h1 className="text-6xl font-semibold mt-12 mb-4 text-center rgb-title">{displayTitle}</h1>
      {excerpt && (
        <p className="text-zinc-300/90 text-lg leading-relaxed mb-8 whitespace-pre-line">
          {excerpt}
        </p>
      )}
      <p className="text-xs text-center opacity-35 mb-10"><code>public/playlists/{slug}.json</code></p>

      <AudioPlayer tracks={tracks} images={visuals} />

      {/* MusicPlaylist JSON-LD */}
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
                // path segment encoding to survive spaces/diacritics/symbols
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
                item: `${SITE_ORIGIN}/`
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Novellák',
                item: `${SITE_ORIGIN}/novellak`
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: displayTitle,
                item: `${SITE_ORIGIN}/${encodeURIComponent(slug)}`
              }
            ]
          })
        }}
      />

      <style>{`
        .rgb-title {
          position: relative;
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
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const { slug } = params
  if (!slug || slug === 'favicon.ico' || slug.includes('.')) return {}

  const data = await loadPlaylist(slug)
  const title = humanize(slug)
  const desc = (data?.excerpt ?? '').slice(0, 160) || undefined
  const urlPath = `/${encodeURIComponent(slug)}`

  // === OG/Twitter image: az első vizuál a JSON-ból (ha nincs, fallback) ===
  const firstVisual = firstVisualFrom(data)
  const ogImage = absolutize(firstVisual) || `${SITE_ORIGIN}/og.jpg`

  return {
    title,
    description: desc,
    alternates: { canonical: urlPath },
    openGraph: {
      title,
      description: desc,
      url: urlPath,
      // Facebook/Twitter/Discord stb. ezt fogja behúzni:
      images: [{ url: ogImage }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
      images: [ogImage],
    },
  }
}

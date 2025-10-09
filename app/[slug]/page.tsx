import { headers } from 'next/headers'
import AudioPlayer from '@/components/AudioPlayer'

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

async function loadPlaylistFromJSON(slug: string) {
  // JSON helye: public/playlists/<slug>.json (statikus fájlok)
  // Abszolút URL a request headerből (dev/prod kompatibilis)
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const host = h.get('host') ?? 'localhost:3000'
  const base = `${proto}://${host}`
  const url = `${base}/playlists/${encodeURIComponent(slug)}.json`

  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { tracks: { title: string; file: string }[]; visuals?: string[] }
    if (!Array.isArray(data?.tracks)) return null
    return data
  } catch {
    return null
  }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const json = await loadPlaylistFromJSON(slug)
  const tracks = json?.tracks ?? FALLBACK[slug] ?? FALLBACK.sample
  const visuals = json?.visuals ?? ['/img/visuals/noise-01.jpg','/img/visuals/noise-02.jpg','/img/visuals/noise-03.jpg']
  const displayTitle = decodeURIComponent(slug).replace(/-/g, ' ')

  return (
    <main className="max-w-5xl mx-auto p-6 text-zinc-100">
      <h1 className="text-6xl font-semibold mt-12 mb-4 text-center rgb-title">{displayTitle}</h1>
      <p className="text-xs text-center opacity-35 mb-10">Van egy tudatállapot, amiben meg tudjuk hajlítani a valóságot. Nem tudjuk irányítani, de valami érezhetően megváltozik. A dolgok valószínűtlensége növekszik. Furcsa és szürreális dolgok történnek velünk. Nincs más magyarázatom ezekre a történetekre.
</p>
      <AudioPlayer tracks={tracks} images={visuals} />
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
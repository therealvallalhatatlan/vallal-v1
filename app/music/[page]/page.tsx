import AudioPlayer from '@/components/AudioPlayer'
import { listSlugs, loadPlaylist } from '@/lib/playlistIndex'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PlaylistSelector } from '@/components/PlaylistSelector'


export const runtime = 'nodejs'


export async function generateMetadata(
  { params }: { params: { page: string } }
): Promise<Metadata> {
  const { page } = params
  const pageNum = Math.max(1, Number(page) || 1)
  const slugs = await listSlugs()
  const total = slugs.length || 1
  const n = Math.min(pageNum, total)
  const title = `Music — #${n} / ${total}`
  const url = `/music/${n}`
  return {
    title,
    alternates: { canonical: url },
    openGraph: { title, url, images: [{ url: '/og.jpg' }] },
    twitter: { card: 'summary_large_image', title, images: ['/og.jpg'] },
  }
}


export default async function MusicPaged({ params }: { params: { page: string } }) {
const { page } = params
const parsedPage = Number(page)
const pageNum = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
const slugs = await listSlugs()
const total = slugs.length
if (total === 0) {
return (
<main className="max-w-5xl mx-auto p-6 text-zinc-100">
<h1 className="text-3xl font-semibold mb-6">Zenei oldalak</h1>
<p className="text-zinc-400">Még nincs egyetlen playlist JSON sem a <code>/public/playlists</code> mappában.</p>
</main>
)
}


const idx = Math.min(pageNum, total) - 1
const slug = slugs[idx]
const data = await loadPlaylist(slug)

// Load all playlist titles for the dropdown
const playlistOptions = await Promise.all(
  slugs.map(async (s, i) => {
    const playlistData = await loadPlaylist(s)
    // For dropdown: keep the numbering prefix, but clean the rest
    const cleanTitle = decodeURIComponent(s).replace(/-/g, ' ')
    const title = (playlistData as any)?.title || cleanTitle
    return { slug: s, title, pageNum: i + 1 }
  })
)

const displayTitle = decodeURIComponent(slug)
  .replace(/^\d+-/, "") // Remove leading numbers and dash  
  .replace(/-/g, ' ')


return (
<main className="py-8">
  <div className="mx-auto w-[min(640px,100vw-32px)] px-6 md:px-4 space-y-8 text-left fade-in">


{/* 1) HEADER */}
        <header className="flex items-start justify-between">
          <div>
            <div className="mt-2 mb-2 text-4xl font-black italic tracking-[-0.04em] text-lime-400 crt-glitch">
              <Link href="/" className="hover:opacity-80 transition-opacity">
                Vállalhatatlan
              </Link> <br/>
            </div>
          </div>

        </header>

{/* Dropdown selector by title */}
<PlaylistSelector 
  options={playlistOptions}
  currentPage={pageNum}
  total={total}
  baseUrl="/music"
/>

{/* Címsor erősebb RGB-szétcsúszással */}
<h1 className="text-4xl font-semibold mt-0 mb-6 text-white tracking-tighter">
    <span className="text-[11px] opacity-50 tracking-wider">Soundtrack ehhez a novellához</span> <br />
    {displayTitle}
</h1>


{/* Excerpt, ha van */}
{data?.excerpt && (
<p className="text-zinc-300/90 text-base leading-relaxed mb-8 whitespace-pre-line">
{data.excerpt}
</p>
)}


{/* Player ugyanúgy, mint az aloldalon */}
<AudioPlayer tracks={data?.tracks ?? []} images={data?.visuals ?? []} />

{/* CTA Section */}
<div className="mt-12 text-center bg-black/50 rounded-2xl p-8 border border-zinc-800">
  <p className="text-zinc-300 text-lg mb-6 leading-relaxed">
    Vállalhatatlan: a Könyv. Limitált példányszám. Dead drop terjesztés.
  </p>
  <a 
    href="/checkout"
    className="inline-block px-6 py-3 bg-lime-600 hover:bg-lime-500 text-black font-semibold rounded-xl transition-colors"
  >
    Lefoglalom a példányomat
  </a>
  <div className="mt-4 text-xs text-zinc-400">
    További info <a href="https://vallalhatatlan.online" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline">vallalhatatlan.online</a> · olvass bele <a href="https://www.reddit.com/r/vallalhatatlan/" target="_blank" rel="noopener noreferrer" className="text-lime-400 hover:text-lime-300 underline">reddit.com/r/vallalhatatlan</a>
  </div>
</div>

  </div>
  {/* Stílus a címhez (statikus, nem animált RGB-split) */}
  <style>{`
    .rgb-title {
      position: relative;
      text-shadow:
        3px 0 0 rgba(255,0,0,0.85),
        -3px 0 0 rgba(0,255,255,0.85),
        0 2px 0 rgba(0,0,0,0.35);
      filter: contrast(140%) saturate(140%);
    }
    @keyframes fadeDream {
      0% { opacity:0; filter:blur(14px) saturate(55%) hue-rotate(15deg); transform:translateY(18px) scale(.985); }
      25% { opacity:.35; filter:blur(11px) }
      55% { opacity:.7; filter:blur(7px) }
      85% { opacity:.95; filter:blur(3px) }
      100% { opacity:1; filter:blur(0) transform:translateY(0) scale(1); }
    }
    .fade-in { animation: fadeDream 3.1s cubic-bezier(.33,.02,.15,1) .45s both; position:relative; }
    .fade-in::before {
      content:""; position:absolute; inset:0;
      background:radial-gradient(circle at 30% 40%,rgba(0,255,160,.15),transparent 70%),
                 radial-gradient(circle at 70% 65%,rgba(255,0,120,.18),transparent 75%);
      mix-blend-mode:screen; pointer-events:none;
      filter:blur(18px);
    }
    .fade-in::after {
      content:""; position:absolute; inset:0;
      background:
        repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,255,140,.05) 2px 3px);
      animation: musicLines 7s linear infinite;
      mix-blend-mode:overlay; pointer-events:none;
      opacity:.25;
    }
    @keyframes musicLines {
      0% { transform:translateY(0); }
      100% { transform:translateY(-200px); }
    }
  `}</style>
      
</main>
)
}
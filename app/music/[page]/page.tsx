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
    openGraph: { title, url, images: [{ url: '/og.png' }] },
    twitter: { card: 'summary_large_image', title, images: ['/og.png'] },
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
    @keyframes fadeCrtMusic {
      0% { opacity:0; transform:scaleY(.02) scaleX(1.3); filter:blur(38px) brightness(235%); }
      8% { opacity:1; transform:scaleY(.4) scaleX(1.08); filter:blur(22px) brightness(170%); }
      20% { opacity:.95; transform:scale(1.01); filter:blur(12px); }
      38% { filter:blur(7px); }
      65% { filter:blur(4px); }
      100% { opacity:1; filter:blur(0) transform:scale(1); }
    }
    @keyframes musicRgb {
      0%,100% { filter:contrast(140%) saturate(140%); }
      50% { filter:hue-rotate(22deg) contrast(155%) saturate(165%); }
    }
    @keyframes musicLines {
      0% { transform:translateY(0); }
      100% { transform:translateY(-200px); }
    }
    .fade-in {
      position:relative;
      animation: fadeCrtMusic 3.4s cubic-bezier(.26,.01,.18,1) .35s both;
    }
    .fade-in::before,
    .fade-in::after {
      content:"";
      position:absolute; inset:0;
      pointer-events:none;
    }
    .fade-in::before {
      background:
        radial-gradient(circle at 32% 38%,rgba(0,255,160,.30),transparent 58%),
        radial-gradient(circle at 72% 62%,rgba(255,0,120,.28),transparent 70%);
      filter:blur(28px);
      mix-blend-mode:screen;
      animation: musicRgb 8s linear infinite;
      opacity:.50;
    }
    .fade-in::after {
      background:repeating-linear-gradient(0deg,rgba(255,255,255,.11) 0 1px,rgba(0,0,0,0) 1px 3px);
      animation: musicLines 6s linear infinite;
      mix-blend-mode:overlay;
      opacity:.20;
    }
  `}</style>
      
</main>
)
}
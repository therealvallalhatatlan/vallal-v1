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
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeInUp .45s ease-out both; }
  `}</style>
      {/* tiny utilities: marquee + caret + tweet typer */}
      <style>{`
        .marquee { display:inline-block; will-change: transform; animation: marquee 28s linear infinite; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .caret::after { content: '▌'; margin-left: 2px; animation: blink 1s steps(1,end) infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        
        /* 90s CRT/Glitch Effects */
        .crt-glitch {
          position: relative;
          animation: flicker 0.15s infinite linear alternate, rgb-shift 2s infinite;
          text-shadow: 
            2px 0 #ff0000, 
            -2px 0 #00ffff,
            0 0 10px #a3e635;
        }
        
        .crt-glitch::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(transparent 50%, rgba(163, 230, 53, 0.03) 50%);
          background-size: 100% 4px;
          pointer-events: none;
          animation: scanlines 0.1s linear infinite;
        }
        
        .crt-glitch::after {
          content: attr(data-text);
          position: absolute;
          left: 2px;
          text-shadow: -2px 0 #ff0000;
          top: 0;
          color: transparent;
          background: transparent;
          overflow: hidden;
          animation: glitch-1 0.6s infinite linear alternate-reverse;
        }
        
        @keyframes flicker {
          0% { opacity: 1; }
          97% { opacity: 1; }
          98% { opacity: 0.98; }
          99% { opacity: 0.96; }
          100% { opacity: 1; }
        }
        
        @keyframes rgb-shift {
          0% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(0);
          }
          20% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(-1px, 0);
          }
          40% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(-1px, 1px);
          }
          60% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(0, 1px);
          }
          80% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(1px, 0);
          }
          100% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #a3e635;
            transform: translate(0);
          }
        }
        
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        
        @keyframes glitch-1 {
          0% { clip: rect(42px, 9999px, 44px, 0); }
          5% { clip: rect(12px, 9999px, 59px, 0); }
          10% { clip: rect(48px, 9999px, 29px, 0); }
          15% { clip: rect(42px, 9999px, 73px, 0); }
          20% { clip: rect(63px, 9999px, 27px, 0); }
          25% { clip: rect(34px, 9999px, 55px, 0); }
          30% { clip: rect(86px, 9999px, 73px, 0); }
          35% { clip: rect(20px, 9999px, 20px, 0); }
          40% { clip: rect(26px, 9999px, 60px, 0); }
          45% { clip: rect(25px, 9999px, 66px, 0); }
          50% { clip: rect(57px, 9999px, 98px, 0); }
          55% { clip: rect(5px, 9999px, 46px, 0); }
          60% { clip: rect(82px, 9999px, 31px, 0); }
          65% { clip: rect(54px, 9999px, 27px, 0); }
          70% { clip: rect(28px, 9999px, 99px, 0); }
          75% { clip: rect(45px, 9999px, 69px, 0); }
          80% { clip: rect(23px, 9999px, 85px, 0); }
          85% { clip: rect(54px, 9999px, 84px, 0); }
          90% { clip: rect(45px, 9999px, 47px, 0); }
          95% { clip: rect(37px, 9999px, 20px, 0); }
          100% { clip: rect(4px, 9999px, 91px, 0); }
        }
      `}</style>
      
</main>
)
}
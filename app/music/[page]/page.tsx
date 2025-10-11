import AudioPlayer from '@/components/AudioPlayer'
import { listSlugs, loadPlaylist } from '@/lib/playlistIndex'


export const runtime = 'nodejs'


export default async function MusicPaged({ params }: { params: Promise<{ page: string }> }) {
const { page } = await params
const pageNum = Math.max(1, Number(page) || 1)


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


const displayTitle = decodeURIComponent(slug).replace(/-/g, ' ')


return (
<main className="max-w-5xl mx-auto p-6 text-zinc-100">
{/* Pager felül */}
<nav className="flex flex-wrap items-center gap-2 mb-6">
{slugs.map((s, i) => {
const n = i + 1
const active = n === pageNum
return (
<a
key={s}
href={`/music/${n}`}
className={`px-3 py-1 rounded-lg border ${active ? 'border-lime-400 text-lime-300' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'}`}
>
{n}
</a>
)
})}
</nav>

<p className="text-[10px] pt-6 opacity-50">Soundtrack ehhez a novellához:</p>

{/* Címsor erősebb RGB-szétcsúszással */}
<h1 className="text-6xl font-semibold mt-0 mb-6 rgb-title">{displayTitle}</h1>


{/* Excerpt, ha van */}
{data?.excerpt && (
<p className="text-zinc-300/90 text-lg leading-relaxed mb-8 whitespace-pre-line">
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
`}</style>
</main>
)
}
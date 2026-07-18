import Link from 'next/link'

export default function TamogatasKoszonomPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06080b] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(74,222,128,0.12),transparent_42%),radial-gradient(circle_at_80%_18%,rgba(34,211,238,0.1),transparent_40%),radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.82),rgba(0,0,0,1))]" />
      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-12 sm:px-7">
        <div className="w-full border border-zinc-700/60 bg-black/45 p-6 font-mono sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/85">transaction.complete</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">Koszonjuk a tamogatast.</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300/85 sm:text-base">
            A rendszer rogzitette a bejovo tamogatast. Ez kozvetlenul segiti a konyv/film projekt folytatasat.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/konyv-2/a-pali-aki"
              className="inline-flex items-center justify-center border border-zinc-600 bg-zinc-800/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-zinc-200 transition hover:bg-zinc-700/40"
            >
              [ VISSZA A TORTENETHEZ ]
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center border border-emerald-400/60 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-200 transition hover:bg-emerald-400/20"
            >
              [ SHOP MEGNYITASA ]
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

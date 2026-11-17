import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function KalendariumSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  return (
    <main className="min-h-screen bg-[#070808] px-4 py-20 text-zinc-100">
      <div className="mx-auto max-w-xl border border-lime-200/30 bg-black p-8">
        <p className="font-mono text-xs uppercase tracking-[.2em] text-lime-200">Kalendárium 2027 / fizetés</p>
        <h1 className="mt-5 text-4xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>Köszönjük.</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          A fizetési folyamat visszajelzett. A rendelést a Stripe szerveroldali megerősítése után tekintjük kifizetettnek.
          A visszaigazolást e-mailben küldjük.
        </p>
        {session_id ? <p className="mt-6 break-all border border-zinc-800 p-3 font-mono text-[10px] text-zinc-600">Tranzakció: {session_id.slice(0, 18)}…</p> : null}
        <Link href="/kalendarium" className="mt-8 inline-flex min-h-12 items-center border border-lime-200/40 px-5 font-mono text-xs uppercase tracking-widest text-lime-100">Vissza a kalendáriumhoz</Link>
      </div>
    </main>
  )
}

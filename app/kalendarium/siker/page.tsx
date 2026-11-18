import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function KalendariumSuccessPage() {
  return (
    <main className="min-h-screen bg-[#070808] px-4 py-20 text-zinc-100">
      <div className="mx-auto max-w-xl border border-lime-200/30 bg-black p-8">
        <p className="font-mono text-xs uppercase tracking-[.2em] text-lime-200">Kalendárium 2027 / előrendelés</p>
        <h1 className="mt-5 text-4xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>Köszönjük.</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          Visszaérkeztél a fizetési folyamattól. A befizetést a Stripe szerveroldali visszaigazolása után véglegesítjük,
          és e-mailben küldjük a rendelés azonosítóját.
        </p>
        <div className="mt-7 border border-zinc-800 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-500">Előleg / példány</span>
            <strong className="text-lime-200">5 000 Ft</strong>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-zinc-500">Fennmaradó összeg / példány</span>
            <strong>7 000 Ft</strong>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-600">
            A teljes vételár 12 000 Ft példányonként. Az előleg ennek része, nem plusz költség.
          </p>
        </div>
        <Link href="/kalendarium" className="mt-8 inline-flex min-h-12 items-center border border-lime-200/40 px-5 font-mono text-xs uppercase tracking-widest text-lime-100">
          Vissza a kalendáriumhoz
        </Link>
      </div>
    </main>
  )
}

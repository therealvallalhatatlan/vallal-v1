import type { Metadata } from "next"
import Link from "next/link"
import KalendariumSubmissionFlow from "@/components/kalendarium/KalendariumSubmissionFlow"

export const metadata: Metadata = {
  title: "Kalendárium 2027 · Beküldés",
  description: "Küldd be az alkotásodat a Vállalhatatlan Kalendárium 2027 kiadványba, vagy jelentkezz a V Crew Arany Oldalak szolgáltatói közé.",
  robots: { index: true, follow: true },
}

export default function KalendariumBekuldesPage() {
  return (
    <main className="min-h-screen bg-[#080909] pb-16 pt-24 text-zinc-100 sm:pb-24 sm:pt-28">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <Link href="/" className="text-sm font-bold italic tracking-tight text-zinc-100 transition hover:text-lime-200" style={{fontFamily:"var(--font-logo)"}}>Vállalhatatlan</Link>
          <span className="font-mono text-[9px] uppercase tracking-[.22em] text-zinc-500 sm:text-[10px]">Nyitott szerkesztőség / 2027</span>
        </header>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-start lg:gap-16">
          <section className="lg:sticky lg:top-28">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[.3em] text-lime-200/70">Vállalhatatlan Kalendárium 2027</p>
            <h1 className="max-w-3xl text-5xl font-black uppercase leading-[.91] tracking-[-.055em] sm:text-6xl md:text-7xl" style={{fontFamily:"var(--font-hero)"}}>A TE<br/><span className="text-lime-200">OLDALAD</span><br/>IS LEHET.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">Naptár. Jegyzetfüzet. Kalendárium. Közösségi archívum. Egy nyomtatott tárgy, amiben a Vállalhatatlan közössége is nyomot hagyhat.</p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center border border-lime-200/30 text-lime-200">✳</div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider">Közösségi alkotások</h2>
                <p className="mt-2 text-xs leading-5 text-zinc-500">Írások, fotók, grafikák, jegyzetek és talált dokumentumok. A kiválasztott alkotók tiszteletpéldányokat kapnak.</p>
              </div>
              <div className="border border-zinc-800 bg-zinc-950/70 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center border border-amber-200/30 text-amber-200">↗</div>
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider">V Crew Arany Oldalak</h2>
                <p className="mt-2 text-xs leading-5 text-zinc-500">V Crew-tagok szolgáltatásai és vállalkozásai fizetett, szerkesztőség által ellenőrzött megjelenéssel.</p>
              </div>
            </div>
            <div className="mt-8 border-l-2 border-lime-200/50 pl-4">
              <p className="font-mono text-[10px] uppercase tracking-[.2em] text-zinc-500">Hogyan működik?</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">Válaszolj néhány kérdésre. A folyamat végén átnézheted a beküldésedet, majd elküldheted a szerkesztőségnek. Nem kell mindent egyszerre kitöltened.</p>
            </div>
            <p className="mt-10 hidden font-mono text-[9px] uppercase tracking-[.22em] text-zinc-700 lg:block">01 / Beküldés · 02 / Válogatás · 03 / Nyomtatás</p>
          </section>
          <section aria-label="Beküldő beszélgetés" className="min-w-0">
            <KalendariumSubmissionFlow />
          </section>
        </div>
        <footer className="mt-16 flex flex-col gap-2 border-t border-zinc-900 pt-5 font-mono text-[9px] uppercase tracking-[.16em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Vállalhatatlan Kalendárium 2027</span><Link href="/kapcsolat" className="hover:text-lime-200">Kérdésed van? Írj nekünk.</Link>
        </footer>
      </div>
    </main>
  )
}

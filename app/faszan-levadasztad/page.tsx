import type { Metadata } from "next"
import FaszanLevadasztadShare from "@/components/FaszanLevadasztadShare"

const shareUrl = "https://www.vallalhatatlan.online/faszan-levadasztad"
const shareTitle = "Faszán levadásztad! Tudsz róla?"
const shareDescription = "A zsákmány megvan. A nyúlhálózat működik. Nézd meg a vadászati jelentést, és add tovább."

export const metadata: Metadata = {
  title: "Faszán levadásztad! | Vállalhatatlan",
  description: shareDescription,
  alternates: { canonical: shareUrl },
  openGraph: {
    type: "website",
    url: shareUrl,
    siteName: "Vállalhatatlan",
    title: shareTitle,
    description: shareDescription,
    images: [{
      url: "https://www.vallalhatatlan.online/faszan-levadasztad/opengraph-image",
      width: 1200,
      height: 630,
      alt: "Faszán levadásztad! Vállalhatatlan vadászati jelentés",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: ["https://www.vallalhatatlan.online/faszan-levadasztad/opengraph-image"],
  },
}

export default function FaszanLevadasztadPage() {
  return (
    <main className="min-h-screen bg-[#030504] px-4 py-10 text-zinc-100 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between border-b border-lime-900/70 pb-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-lime-200/80" style={{ fontFamily: "var(--font-mono-tech)" }}>
            V. / HÁLÓZAT
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
            VADÁSZATI JELENTÉS № 0001
          </p>
        </div>

        <section className="relative overflow-hidden border border-zinc-800 bg-[#070907] p-5 sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{
            backgroundImage: "linear-gradient(rgba(132,204,22,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(132,204,22,0.08) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.28em] text-lime-200/60" style={{ fontFamily: "var(--font-mono-tech)" }}>
              MŰVELET SIKERES / ZSÁKMÁNY BIZTOSÍTVA
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black uppercase leading-[0.95] tracking-tight text-lime-100 sm:text-6xl md:text-7xl" style={{ fontFamily: "var(--font-mono-tech)" }}>
              Faszán levadásztad!
            </h1>
            <p className="mt-4 text-base text-zinc-200 sm:text-xl" style={{ fontFamily: "var(--font-mono-tech)" }}>
              Ügyes vagy, tudsz róla?
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              A zsákmány megvan. A rendszer nyilvántartásba vette. Te is tudod, hogy ez mit jelent.
            </p>

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <FaszanLevadasztadShare />
            </div>
          </div>
        </section>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
          <span>VÁLLALHATATLAN · UNDERGROUND NETWORK</span>
          <a href="/" className="text-lime-200/70 transition-colors hover:text-lime-100">VISSZA A HÁLÓZATBA ↗</a>
        </footer>
      </div>
    </main>
  )
}

import Link from "next/link"
import { Montserrat } from "next/font/google"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

const display = Montserrat({
  subsets: ["latin-ext"],
  weight: ["800"],
  style: ["italic"],
  display: "swap",
})

export const metadata = {
  title: "Leg Belső Kör / Köszönjük",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LegbelsoKorKoszonomPage() {
  return (
    <MainContent>
      <div className="min-h-screen bg-black text-zinc-200">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl items-center px-5 py-16 sm:px-6">
          <div className="w-full border border-zinc-800 bg-zinc-950/70 p-6 sm:p-10">
            <div
              className="text-[10px] uppercase tracking-[0.22em] text-lime-300/75"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              TRANSACTION.COMPLETE
            </div>
            <h1
              className={`${display.className} mt-4 text-5xl uppercase italic leading-none text-zinc-100 sm:text-7xl`}
            >
              Megvagy.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              Köszönöm, hogy beszálltál az indulásba. Innentől nem csak olvasod, ami történik.
              Része vagy annak, ami most készül.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link
                href="/legbelso-kor"
                className="flex min-h-14 items-center justify-between border-2 border-lime-100/80 px-4 text-xs uppercase tracking-[0.18em] text-lime-100 transition hover:bg-lime-300/[0.07]"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                <span>VISSZA</span>
                <span>↗</span>
              </Link>
              <Link
                href="/"
                className="flex min-h-14 items-center justify-between border border-zinc-800 px-4 text-xs uppercase tracking-[0.18em] text-zinc-500 transition hover:border-zinc-600 hover:text-zinc-200"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                <span>HÁLÓZAT</span>
                <span>↗</span>
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </MainContent>
  )
}

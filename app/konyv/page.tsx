import type { Metadata } from "next";
import Link from "next/link";
import MainContent from "@/components/MainContent";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Könyv - Jelenleg nem elérhető",
  description:
    "Az első Vállalhatatlan könyv jelenleg nem elérhető. Ha szeretnél hozzájutni, írj V.-nek emailben.",
  alternates: {
    canonical: "https://vallalhatatlan.online/konyv",
  },
  openGraph: {
    title: "Vállalhatatlan - Első könyv",
    description:
      "Az első könyv jelenleg nem elérhető. Eléréshez írj V.-nek emailben.",
    url: "https://vallalhatatlan.online/konyv",
    images: [{ url: "/api/og?title=Vallalhatatlan%20-%20Konyv" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan - Első könyv",
    description:
      "Az első könyv jelenleg nem elérhető. Eléréshez írj V.-nek emailben.",
    images: ["/api/og?title=Vallalhatatlan%20-%20Konyv"],
  },
};

export default function Page() {
  return (
    <MainContent>
      <Navigation />

      <section className="relative z-20 border border-white/10 mx-4 md:mx-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_4fr_3fr]" style={{ minHeight: "calc(100vh - 80px)" }}>

          <div className="relative overflow-hidden border-b md:border-b-0 md:border-r border-white/10 min-h-[38vh] md:min-h-0">
            <img
              src="/img/logo.png"
              alt="Vállalhatatlan"
              className="absolute inset-0 m-auto w-44 md:w-56 opacity-60 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/70" />
            <div className="absolute inset-0 fx-stripes opacity-50 pointer-events-none" />
          </div>

          <div className="flex flex-col border-b md:border-b-0 md:border-r border-white/10 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 text-xs text-white/40 uppercase tracking-[0.18em]">
              <span>[ KONYV STATUS ]</span>
              <span className="text-lime-400">OFFLINE</span>
            </div>

            <div className="flex-1 px-6 py-8 md:py-12 flex items-center">
              <div className="w-full space-y-6">
                <h1 className="text-3xl md:text-4xl leading-tight text-white/90">
                  Az első könyv
                  <br />
                  jelenleg nem elérhető.
                </h1>

                <div className="relative border border-lime-300/40 bg-black/45 p-5 md:p-6 shadow-[0_0_32px_rgba(163,230,53,0.12)]">
                  <p className="text-lg md:text-xl text-white/80 leading-relaxed">
                    Ha szeretnél hozzájutni, írj V.-nek:
                  </p>

                  <a
                    href="mailto:therealvallalhatatlan@gmail.com"
                    className="inline-block mt-3 text-lime-300 text-base md:text-lg tracking-wide underline underline-offset-4 decoration-lime-300/60 hover:text-lime-200 hover:decoration-lime-200 transition-colors"
                  >
                    therealvallalhatatlan@gmail.com
                  </a>
                </div>

                <Link
                  href="/"
                  className="inline-flex items-center border border-white/30 px-4 py-2 text-xs md:text-sm font-bold tracking-[0.22em] uppercase text-white/85 hover:border-lime-400 hover:text-lime-300 transition-colors"
                >
                  Vissza a főoldalra
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col font-mono bg-black/30">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em]">
              <span className="text-neutral-400">[ CONTACT CHANNEL ]</span>
              <span className="inline-flex items-center gap-2 text-lime-400/90">
                <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
                ACTIVE
              </span>
            </div>

            <div className="flex-1 px-4 py-4">
              <div className="border border-neutral-800 bg-black/40 p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Elérhetőség</p>
                <a
                  href="mailto:therealvallalhatatlan@gmail.com"
                  className="block break-all text-lime-300 hover:text-lime-200 transition-colors"
                >
                  therealvallalhatatlan@gmail.com
                </a>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  Röviden írd meg, hogy a könyv miatt keresed, és V. jelentkezik.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </MainContent>
  );
}
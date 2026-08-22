import type { Metadata } from "next";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
  style: "italic",
});

export const metadata: Metadata = {
  title: "Könyvek - Vállalhatatlan",
  description:
    "Vállalhatatlan könyvek. Két évad, limitált sorszámozott példányok, dead drop terjesztés.",
};

const FIRST_BOOK_STRIPE_URL = "YOUR_FIRST_BOOK_STRIPE_URL";
const SECOND_BOOK_STRIPE_URL = "YOUR_SECOND_BOOK_STRIPE_URL";

export default function Page() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16">
        {/* HEADER / INTRO */}
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ ARCHIVE / BOOKS ]
            </span>

            <span
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-lime-300/70"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
              ACTIVE
            </span>
          </div>

          <p
            className="max-w-3xl text-md leading-relaxed text-zinc-400 md:text-base py-6"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Minden évadból 100 darab sorszámozott példány készül, amit dead
            droppal terjesztek.
            <br/><br/>
            Elrejtem neked a városban és megadom a
            koordinátáit.
            <br/><br/>
            48 órád van megtalálni.{" "}
            <span className="text-lime-200/80">
              Adrenalin ON, valós veszély OFF.
            </span>
          </p>
        </section>

        {/* BOOKS */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* ============================================================
              BOOK 01
          ============================================================ */}
          <article className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 transition-colors duration-300 hover:border-lime-400/30">
            {/* IMAGE + TEXT */}
            <div className="grid grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)]">
              {/* COVER */}
              <div className="relative h-[300px] w-[96px] overflow-hidden border-r border-zinc-800 bg-zinc-900 md:h-[340px] md:w-[120px]">
                <img
                  src="/cover.png"
                  alt="Vállalhatatlan első könyv borító"
                  className="absolute inset-0 block h-full w-full min-w-0 max-w-none object-cover"
                />

                <div
                  className="absolute left-2 top-2 z-10 border border-zinc-700 bg-black/80 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  S01
                </div>
              </div>

              {/* TEXT */}
              <div className="min-w-0 overflow-hidden p-5 md:p-6">
                <span
                  className="mb-3 block text-[10px] uppercase tracking-[0.18em] text-lime-400/70"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ ELSŐ KÖNYV ]
                </span>

                <h1
                  className={`${montserrat.className} break-words text-2xl uppercase leading-[0.95] tracking-[-0.025em] text-zinc-100 md:text-3xl`}
                >
                  Vállalhatatlan I.
                </h1>

                <p
                  className="mt-5 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  A 100 sorszámozott példány elfogyott.
                  <br />
                  Ha szeretnél egy sorszámozatlan példányt, itt előrendelheted.
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={FIRST_BOOK_STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border-t border-lime-400/30 bg-lime-400/[0.025] px-5 py-4 text-lime-200 transition-all hover:border-lime-300/70 hover:bg-lime-400/[0.07]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em]">
                Előrendelés
              </span>

              <span className="text-base">↗</span>
            </a>
          </article>

          {/* ============================================================
              BOOK 02
          ============================================================ */}
          <article className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 transition-colors duration-300 hover:border-lime-400/30">
            {/* IMAGE + TEXT */}
            <div className="grid grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)]">
              {/* COVER */}
              <div className="relative h-[300px] w-[96px] overflow-hidden border-r border-zinc-800 bg-zinc-900 md:h-[340px] md:w-[120px]">
                <img
                  src="/vallalhatatlan2.png"
                  alt="Vállalhatatlan II. könyv borító"
                  className="absolute inset-0 block h-full w-full min-w-0 max-w-none object-cover"
                />

                <div
                  className="absolute left-2 top-2 z-10 border border-lime-400/25 bg-black/80 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-lime-300/80"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  S02
                </div>
              </div>

              {/* TEXT */}
              <div className="min-w-0 overflow-hidden p-5 md:p-6">
                <span
                  className="mb-3 block text-[10px] uppercase tracking-[0.18em] text-lime-400/70"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ MÁSODIK KÖNYV ]
                </span>

                <h2
                  className={`${montserrat.className} break-words text-2xl uppercase leading-[0.95] tracking-[-0.025em] text-zinc-100 md:text-3xl`}
                >
                  Vállalhatatlan II.
                </h2>

                <p
                  className="mt-5 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  Még van{" "}
                  <span className="font-bold text-lime-300">34 darab</span>{" "}
                  sorszámozott példány.
                  <br />
                  Foglald le a saját sorszámodat.
                </p>
              </div>
            </div>

            {/* CTA */}
            <a
              href={SECOND_BOOK_STRIPE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border-t border-lime-400/40 bg-zinc-400 px-5 py-4 text-lime-200 transition-all hover:border-lime-300/70 hover:bg-lime-400/[0.08] hover:text-lime-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] ">
                Sorszám lefoglalása
              </span>

              <span className="text-base">↗</span>
            </a>
          </article>
        </section>

        {/* META */}
        <div
          className="mt-6 flex flex-col gap-2 border-t border-zinc-800 px-1 pt-4 text-[9px] uppercase tracking-[0.16em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span>LIMITED EDITIONS</span>
          <span>DEAD DROP DISTRIBUTION</span>
          <span>V. / 2026</span>
        </div>
      </div>

      <Footer />
    </MainContent>
  );
}
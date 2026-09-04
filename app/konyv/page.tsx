import type { Metadata } from "next";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import { Montserrat } from "next/font/google";
import Link from "next/link";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "Könyvek - Vállalhatatlan",
  description:
    "Vállalhatatlan könyvek. Két évad, limitált sorszámozott példányok, dead drop terjesztés.",
};

const FIRST_BOOK_STRIPE_URL = "YOUR_FIRST_BOOK_STRIPE_URL";
const SECOND_BOOK_STRIPE_URL = "https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h";

export default function Page() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16">
        {/* HEADER / INTRO */}
        <section className="mb-8">

          <h2 className={`${montserrat.className} pt-8 text-6xl uppercase not-italic leading-tighter text-zinc-100`}>
            A Második könyv
          </h2>

          <p
            className="max-w-3xl text-lg leading-relaxed text-zinc-400 md:text-base py-6"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            A diliházból kikerülő V. egy szürreális pénzmosodaként működő, éjjel-nappali internetkávézó élére kerül üzletvezetőként.<br/><br/>
            Az elbaszott pornóforgatások, fura orgiák és drogoktól fűtött éjszakák kaotikus világát végül egy elcsalt routercsere, a felhalmozott adósságok és egy rendőrségi razziával végződő drogbalhé borítja lángokba.
          </p>
        </section>

        {/* BOOK */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* ============================================================
              BOOK 02
          ============================================================ */}
          <article className="overflow-hidden">
            {/* IMAGE + TEXT */}
            <div className="flex">
              {/* COVER */}
              <div className="w-40 overflow-hidden">
                <img
                  src="/vallalhatatlan2.png"
                  alt="Vállalhatatlan II. könyv borító"
                  className="inset-0 block h-full w-full min-w-0 max-w-none object-cover rounded-md"
                />
              </div>

              {/* TEXT */}
              <div className="w-70 overflow-hidden p-5 md:p-6">
                <h2 className={`${montserrat.className} break-words text-2xl italic leading-relaxed tracking-[-0.25em] text-zinc-100 md:text-3xl`}>
                  <span className="italic">Vállalhatatlan II.</span>
                </h2>

                <span className="font-mono not-italic text-zinc-200 text-2xl" style={{ fontFamily: "var(--font-mono-tech)" }}>032<span className="opacity-50">/100</span></span>

                <p className="mt-5 text-sm leading-relaxed text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  Rendeld meg a saját dedikált példányodat <span className="text-lime-100/90 font-bold">dead drop</span>* kalanddal. Kurvajó buli, imádni fogod!
                </p>
              </div>
            </div>

            <Link
              href={SECOND_BOOK_STRIPE_URL}
              className="mt-6 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 bg-black/0 px-6 font-mono text-xl font-medium tracking-[0.08em] text-lime-100/80 transition-all hover:border-zinc-100/70 hover:bg-zinc-100/10 hover:text-lime-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span>MEGSZERZEM A KÖNYVET</span>
              <span aria-hidden="true">→</span>
            </Link>

            <div className="">
              <p className="mt-8 text-xs leading-tight text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
                *A dead drop egy titkos helyszín, ahol Vállalhatatlan gondosan elrejti neked a könyvet, majd megadja a koordinátáit, pár fotót és egy leírást. <br/>
                48 órád van elmenni érte.
              </p>
            </div>

          </article>
        </section>
      </div>

      <Footer />
    </MainContent>
  );
}
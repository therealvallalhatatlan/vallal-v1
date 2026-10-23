import type { Metadata } from "next";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import { Montserrat } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import Reviews from "@/components/Reviews";
import BookPurchaseCard from "@/components/book-purchase/BookPurchaseCard";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "Vállalhatatlan I. könyv",
  description:
    "A Vállalhatatlan első kötete. Bővített kiadás, új szövegekkel, képekkel és dokumentumokkal.",
};

export default function FirstBookPage() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl rounded-md px-6 pb-16">
        <section className="mb-8">
          <p className="pt-8 font-mono text-xs uppercase tracking-[0.22em] text-lime-100/60">
            Bővített kiadás // 2026
          </p>
          <h2 className={`${montserrat.className} pt-4 text-5xl uppercase leading-tight text-zinc-100 md:text-6xl`}>
            Az első könyv
          </h2>
          <p
            className="max-w-3xl py-6 text-lg leading-relaxed text-zinc-400 md:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            A Vállalhatatlan első kötete. Új szövegekkel, képekkel és dokumentumokkal kibővített kiadás.
            Egy könyv, ami nem egyszerűen olvasmány, hanem belépő a hálózatba.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <article className="overflow-hidden">
            <div className="flex gap-4 sm:gap-6">
              <div className="w-40 shrink-0 overflow-hidden">
                <img
                  src="/vallalhatatlan.png"
                  alt="Vállalhatatlan I. könyv borító"
                  className="block h-full w-full rounded-md object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden py-2">
                <h3 className={`${montserrat.className} break-words text-2xl italic leading-relaxed text-zinc-100 md:text-3xl`}>
                  Vállalhatatlan I.
                </h3>
                <p
                  className="mt-4 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  Bővített kiadás, új szövegekkel, képekkel és dokumentumokkal.
                </p>
                <p
                  className="mt-4 text-sm leading-relaxed text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  A könyv fizikai példányai korlátozott számban készülnek.
                </p>
              </div>
            </div>

            <BookPurchaseCard productId="book-1" editionLabel="I." />
          </article>
        </section>

        <section className="px-0 py-12 text-right">
          <Image
            src="/img/deaddrop.webp"
            alt="Dead drop terjesztés"
            width={640}
            height={467}
            className="mb-4 h-auto w-full rounded-md border border-zinc-800 saturate-0"
          />
          <h2 className={`${montserrat.className} break-words text-3xl italic leading-relaxed text-zinc-100 md:text-3xl`}>
            Mi az a dead drop?
          </h2>
          <p className="mb-6 mt-4 text-lg leading-tight text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
            Nem futár jön, nem csönget senki. Kapsz egy helyet, egy jelet, egy történetet.
            Aztán elindulsz, és a könyv egyszer csak a tiéd lesz.
          </p>
          <Image
            src="/img/deaddrop2.webp"
            alt="Dead drop helyszín"
            width={402}
            height={529}
            className="mb-4 h-auto w-full rounded-md border border-zinc-800 saturate-0"
          />
          <p className="mb-12 mt-4 text-lg leading-tight text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
            A Vállalhatatlan nem csak egy könyv. Kapcsolódási pont egy analóg, személyes kapcsolatokra épülő hálózathoz.
          </p>
          <Link
            href="#book-purchase"
            aria-label="Vissza a megrendelési lehetőséghez"
            className="mb-12 mt-6 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 px-6 font-mono text-base font-medium tracking-[0.04em] text-lime-100/80 transition-all hover:border-zinc-100/70 hover:bg-zinc-100/10 hover:text-lime-100 sm:text-xl"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>MEGRENDELEM A KÖNYVET</span>
            <span aria-hidden="true">↑</span>
          </Link>
          <Reviews />
        </section>
      </div>
      <Footer />
    </MainContent>
  );
}

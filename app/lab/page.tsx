import type { Metadata } from "next";
import Link from "next/link";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import LabContact from "@/components/LabContact";
import { Montserrat } from "next/font/google";
import Image from "next/image";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
});

export const metadata: Metadata = {
  title: "LAB - Vállalhatatlan",
  description:
    "A Vállalhatatlan LAB projektjei. Film, szoftver, generatív technológia és minden, ami még épül.",
};

const MICROFILM_SUPPORT_URL = "/tamogatas";
const ILLUSTRATION_ENGINE_SUPPORT_URL = "/tamogatas";
const SHARE_URL = "https://vallalhatatlan.online/lab";
const SHARE_TEXT = "Vállalhatatlan LAB | Projekt 01 / MikroFilm Stúdió";

function SupportButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="flex items-center justify-between border-b border-zinc-800 bg-lime-400/[0.025] px-5 py-4 text-lime-200 transition-all hover:bg-lime-400/[0.07] sm:border-b-0 sm:border-r"
      style={{ fontFamily: "var(--font-mono-tech)" }}
    >
      <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
        <span
          className="text-base leading-none text-lime-400 drop-shadow-[0_0_5px_rgba(163,230,53,0.6)]"
          aria-hidden="true"
        >
          ♥
        </span>
        Támogatom
      </span>
      <span className="text-lime-300">↗</span>
    </a>
  );
}

function ProjectActions({
  interestLabel = "Részt vennék ebben",
}: {
  interestLabel?: string;
}) {
  const encodedUrl = encodeURIComponent(SHARE_URL);
  const encodedText = encodeURIComponent(`${SHARE_TEXT}\n${SHARE_URL}`);
  const encodedMailBody = encodeURIComponent(
    `Nézd meg a Vállalhatatlan LAB-ot:\n\n${SHARE_URL}`
  );

  return (
    <>
      <Link
        href="/kapcsolat"
        className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-lime-200 sm:border-b-0 sm:border-r"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.14em]">
          {interestLabel}
        </span>
        <span className="text-base" aria-hidden="true">
          +
        </span>
      </Link>

      <details className="group relative">
        <summary
          className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200 [&::-webkit-details-marker]:hidden"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
            <span aria-hidden="true" className="text-sm">
              ↗
            </span>
            Megosztás
          </span>
          <span
            className="text-xs transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            ⌄
          </span>
        </summary>

        <div className="grid grid-cols-4 gap-px border-t border-zinc-800 bg-zinc-800 p-px">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Megosztás Facebookon"
            className="flex min-h-12 items-center justify-center bg-zinc-950 px-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-lime-200"
          >
            <span className="text-sm font-bold" aria-hidden="true">
              f
            </span>
          </a>

          <a
            href={`mailto:?subject=${encodeURIComponent(SHARE_TEXT)}&body=${encodedMailBody}`}
            aria-label="Megosztás emailben"
            className="flex min-h-12 items-center justify-center bg-zinc-950 px-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-lime-200"
          >
            <span className="text-base" aria-hidden="true">
              ✉
            </span>
          </a>

          <a
            href={`https://wa.me/?text=${encodedText}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Megosztás WhatsAppon"
            className="flex min-h-12 items-center justify-center bg-zinc-950 px-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-lime-200"
          >
            <span className="text-sm font-bold" aria-hidden="true">
              WA
            </span>
          </a>

          <a
            href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(
              SHARE_TEXT
            )}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Megosztás Telegramon"
            className="flex min-h-12 items-center justify-center bg-zinc-950 px-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-lime-200"
          >
            <span className="text-base" aria-hidden="true">
              ➤
            </span>
          </a>
        </div>
      </details>
    </>
  );
}

export default function Page() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-8">
        {/* HEADER / INTRO */}
        <section>
          <h2
            className={`${montserrat.className} pt-8 text-6xl uppercase not-italic leading-tighter text-zinc-100`}
          >
            V. FÖLD ALATTI LABORJA
          </h2>

          <p
            className="max-w-3xl py-6 text-lg leading-relaxed text-zinc-400 md:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ahol a következő generációs cuccok készülnek.Gyorsaság, pontosság,
            problémamegoldás LEVEL 10000.
            <br />
            <span className="text-lime-100/80">
              Oszd meg velem őrült tervedet!
            </span>
          </p>
        </section>

        <section className="mb-10">
          <div className="max-w-3xl">
            <LabContact />
          </div>
        </section>

        {/* PROJECTS */}
        <section className="space-y-6">
          {/* PROJECT 01 */}
          <article className="mt-8 overflow-hidden rounded-md border-2 border-zinc-800 bg-zinc-950/70 transition-colors duration-300 hover:border-lime-400/30">
            <div className="p-5 md:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span
                    className="mb-3 block text-xs uppercase tracking-[0.18em] text-lime-100/70"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ PROJECT 01 / FILM ]
                  </span>

                  <h2
                    className={`${montserrat.className} max-w-2xl text-2xl leading-[0.95] tracking-[-0.025em] text-zinc-100 md:text-4xl`}
                  >
                    Vállalhatatlan
                    <br />
                    MikroFilm Stúdió
                  </h2>
                </div>

                <span
                  className="hidden shrink-0 border border-zinc-800 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-zinc-600 md:block"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  VMI / 01
                </span>
              </div>

              {/* Insert microfilm preview video */}
              <div className="mt-6">
                <video muted controls className="w-full rounded-md">
                  <source src="/videos/film.mp4" type="video/mp4" />
                  A böngésződ nem támogatja a videó lejátszást.
                </video>
              </div>

              <div className="grid gap-8 border-t border-zinc-800 pt-6 md:grid-cols-[1fr_280px]">
                <div>
                  <p
                    className="max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Egy olyan szoftverre volt szükségem amivel karakterhelyes
                    figurákat tudok generálni, és a generált karaktereket
                    animálni is tudom.
                    Ezzel a cuccal te is következetes, kontrollálható és
                    felismerhető vizuális világokat építhetsz.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid border-t border-zinc-800 sm:grid-cols-3">
              <SupportButton href={MICROFILM_SUPPORT_URL} />
              <ProjectActions />
            </div>
          </article>

          {/* PROJECT 02 / TÉRKÉP */}
          <article className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/90 transition-colors duration-300 hover:border-lime-400/30">
            <div className="p-5 md:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span
                    className="mb-3 block text-xs uppercase tracking-[0.18em] text-lime-100/70"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ PROJECT 02 / NETWORK ]
                  </span>

                  <h2
                    className={`${montserrat.className} max-w-2xl text-2xl uppercase leading-[0.95] tracking-[-0.025em] text-zinc-100 md:text-4xl`}
                  >
                    Vállalhatatlan
                    <br />
                    Térkép Motor
                  </h2>
                </div>

                <span
                  className="hidden shrink-0 border border-zinc-800 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-zinc-600 md:block"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  VTM / 02
                </span>
              </div>

              <div className="grid gap-8 border-t border-zinc-800 pt-6 md:grid-cols-[1fr_280px]">
                <div>
                    <Image
                      src="/img/map.png"
                      alt="Vállalhatatlan Második Könyv borító"
                      width={1910}
                      height={901}
                      className="w-full h-auto mb-4 rounded-md border border-zinc-800"
                    />

                  <p
                    className="max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Egy térkép, ahol a helyekhez digitális tartalmakat és fizikai tárgyakat köthetünk.
                    Hogy mire jó? 

                    Egy élő, közösségi térkép, ahol nem csak helyeket találsz,
                    hanem embereket, sztorikat és saját felfedeznivalókat is.
                    Jelölj meg helyeket, csatlakozz másokhoz, fedezd fel a
                    hálózatot, és építsd vele a saját városi térképedet.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid border-t border-zinc-800 sm:grid-cols-3">
              <SupportButton href={ILLUSTRATION_ENGINE_SUPPORT_URL} />
              <ProjectActions interestLabel="Érdekel" />
            </div>
          </article>
        </section>

        {/* PARTICIPATION NOTE */}
        <section className="mt-8 border-t border-zinc-800 pt-6">
          <div className="max-w-3xl">
            <span
              className="mb-4 block text-[10px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ HOW TO ENTER ]
            </span>

            <p
              className="text-sm leading-relaxed text-zinc-400"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Nagyobb összegű támogatásnál egyedi megállapodást kötünk arról,
              hogy pontosan mit kapsz a beszállásért.
            </p>
          </div>
        </section>

        {/* META */}
        <div
          className="mt-8 flex flex-col gap-2 border-t border-zinc-800 px-1 pt-4 text-[9px] uppercase tracking-[0.16em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span>PROJECTS IN DEVELOPMENT</span>
          <span>BUILD / TEST / RELEASE</span>
          <span>V. / 2026</span>
        </div>
      </div>

      <Footer />
    </MainContent>
  );
}

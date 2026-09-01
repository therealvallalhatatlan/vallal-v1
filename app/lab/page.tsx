import type { Metadata } from "next";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import LabContact from "@/components/LabContact";
import { Montserrat } from "next/font/google";

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

const microfilmEntryPoints = [
  "FINANSZÍROZÁS",
  "SZAKMAI TUDÁS",
  "TECHNOLÓGIA",
  "KAPCSOLATOK",
];

const engineEntryPoints = [
  "FINANSZÍROZÁS",
  "FEJLESZTÉS",
  "HARDVER",
  "SZAKMAI TUDÁS",
];

function EntryPoints({ items }: { items: string[] }) {
  return (
    <div className="mt-8 max-w-sm">
      <div className="mb-3 flex items-center gap-3">
        <span
          className="text-[9px] uppercase tracking-[0.2em] text-zinc-500"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          BESZÁLLÁSI PONTOK
        </span>

        <span className="h-px flex-1 bg-zinc-800" />
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden border border-zinc-800 bg-zinc-800">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-center gap-2 bg-zinc-950/80 px-3 py-2.5"
          >
            <span className="h-1 w-1 shrink-0 bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.7)]" />

            <span
              className="text-[9px] tracking-[0.12em] text-zinc-400"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function ProjectActions() {
  return (
    <>
      <button
        type="button"
        className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-lime-200 sm:border-b-0 sm:border-r"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.14em]">
          Részt vennék ebben
        </span>

        <span>+</span>
      </button>

      <button
        type="button"
        className="flex items-center justify-between px-5 py-4 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        <span className="text-xs font-bold uppercase tracking-[0.14em]">
          Megosztás
        </span>

        <span>↗</span>
      </button>
    </>
  );
}

export default function Page() {
  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-8 ">
        {/* HEADER / INTRO */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ LABORATÓRIUM ]
            </span>

            <span
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-lime-300/40"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
              RUNNING
            </span>
          </div>

          <div className="max-w-3xl">
            <h1
              className={`${montserrat.className} text-4xl pt-6 uppercase leading-[0.9] tracking-[-0.03em] text-zinc-100 md:text-6xl`}
            >
              V. FÖLD ALATTI LABORATÓRIUMA
            </h1>

            <p
              className="mt-6 text-md leading-relaxed text-zinc-400 md:text-base"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Ahol a következő generációs cuccok készülnek.
              <br />
              Gyorsaság, pontosság, problémamegoldás LEVEL 10000.
              <span className="text-lime-200/80">
                Oszd meg velem őrült tervedet. Megcsináljuk!
              </span>
            </p>
            <LabContact />
          </div>
          

          <div className="mt-24 flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ PROJEKTEK ]
            </span>

            <span
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-lime-300/40"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
              RUNNING
            </span>
          </div>


          <div className="max-w-3xl border-t mt-4 border-zinc-600">
            <p
              className="pt-6 text-md leading-relaxed text-zinc-400 md:text-base"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Saját fejlesztésű cuccok amikkel én dolgozom, de mások számára is érdekes lehet. 
            </p>
          </div>

        </section>

        {/* PROJECTS */}
        <section className="space-y-6">
          {/* PROJECT 01 */}
          <article className="mt-8 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70 transition-colors duration-300 hover:border-lime-400/30">
            <div className="p-5 md:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span
                    className="mb-3 block text-[10px] uppercase tracking-[0.18em] text-lime-400/70"
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
                      Egy olyan szoftverre volt szükségem amivel karakterhelyes figurákat tudok generálni, és a generált karaktereket animálni is tudom. 
                      Ezzel a cuccal te is következetes, kontrollálható és felismerhető vizuális világokat építhetsz. 
                    </p>
                  </div>
                </div>
            </div>

            <div className="grid border-t border-zinc-800 sm:grid-cols-3">
              <SupportButton href={MICROFILM_SUPPORT_URL} />
              <ProjectActions />
            </div>
          </article>

          {/* PROJECT 02 */}
          <article className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/90 transition-colors duration-300 hover:border-lime-400/30">
            <div className="p-5 md:p-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span
                    className="mb-3 block text-[10px] uppercase tracking-[0.18em] text-lime-400/70"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ PROJECT 02 / SOFTWARE ]
                  </span>

                  <h2
                    className={`${montserrat.className} max-w-2xl text-2xl uppercase leading-[0.95] tracking-[-0.025em] text-zinc-100 md:text-4xl`}
                  >
                    Vállalhatatlan
                    <br />
                    Illustration Engine
                  </h2>
                </div>

                <span
                  className="hidden shrink-0 border border-zinc-800 px-2 py-1 text-[8px] uppercase tracking-[0.15em] text-zinc-600 md:block"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  VIE / 02
                </span>
              </div>

              <div className="grid gap-8 border-t border-zinc-800 pt-6 md:grid-cols-[1fr_280px]">
                <div>
                  <p
                    className="max-w-2xl text-sm leading-relaxed text-zinc-300 md:text-base"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    A képeink és videóink mögött álló saját fejlesztésű
                    szoftverrendszer.
                    <br />
                    <br />
                    Fine-tuningolt saját modellekkel és kép-, hang- és
                    videogenerálással dolgozunk. A cél egy olyan saját
                    eszközrendszer, amellyel nem egyszerűen generálni tudunk,
                    hanem következetes, kontrollálható és felismerhető vizuális
                    világokat építhetünk.
                    <br />
                    <br />
                    Amit jelenleg különböző modellekből, szolgáltatásokból és
                    saját workaroundokból rakunk össze, azt egyetlen
                    használható rendszerbe akarjuk rendezni.
                  </p>

                  <p
                    className="mt-5 text-[11px] uppercase tracking-[0.12em] text-lime-200/70"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    NEM PROMPTOKAT GYÁRTUNK. ESZKÖZT ÉPÍTÜNK.
                  </p>

                  <EntryPoints items={engineEntryPoints} />
                </div>
              </div>
            </div>

            <div className="grid border-t border-zinc-800 sm:grid-cols-3">
              <SupportButton href={ILLUSTRATION_ENGINE_SUPPORT_URL} />
              <ProjectActions />
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
              Nagyobb összegű támogatásnál egyedi megállapodást kötünk arról, hogy pontosan mit
              kapsz a beszállásért.
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
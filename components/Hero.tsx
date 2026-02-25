import { Card } from "@/components/Card";

const heroCards = [
  {
    title: "A Könyv",
    badge: "Limitált • sorszámozott",
    imageSrc: "/vallalhatatlan-2.png",
    imageAlt: "A Vállalhatatlan nyomtatott könyv borítója",
    description:
      "Dead drop könyv, amit nem bolti polcon, hanem valódi városi kalandban szerzel meg.",
    href: "/konyv",
    cta: "Könyv részletek",
    emphasis: "physical",
  },
  {
    title: "Digitális Változat",
    badge: "Azonnali hozzáférés",
    imageSrc: "/img/cover.gif",
    imageAlt: "A Vállalhatatlan digitális változatának előnézete",
    description:
      "A teljes anyag elérhető olvasó appban: történetek, hangos tartalmak és folyamatosan bővülő digitális extrák.",
    href: "/reader",
    cta: "Digitális részletek",
    emphasis: "digital",
  },
] as const;

export default function Hero() {
  return (
    <section className="relative mx-auto max-w-3xl px-6 py-10 md:py-32">


      <div className="">
        {/* Left: headline + CTAs */}
        <div className="space-y-9">

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            <span className="text-lime-400">Vállalhatatlan</span>
            <span className="text-neutral-200">, meg sem történt történetek</span>
          </h1>

          <p className="max-w-xl text-xl md:text-2xl leading-7 text-neutral-300 ">
            <img
              src="/img/dd.png"
              alt="PP"
              className="mr-4 mt-1 float-left h-32 w-auto -rotate-5"
            />
            Ezt a könyvet ne keresd a könyvesboltokban. 
            Ez egy városi kaland, egy titkos küldetés, ahol a könyv megszerzése is része a történetnek.
          </p>

          <div className="mt-16 rounded-2xl border border-lime-400/20 bg-black/60 p-6 md:p-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 space-y-3">
                <h2 className="text-2xl font-semibold text-white md:text-3xl">
                 Fizikai Könyv + Dead Drop Kaland
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-neutral-300 ">
                  Kapsz egy koordinátát, és pár fotót egy rejtekhelyről. 
                  Akkor megy a drop, amikor ráérsz.
                  24 órád van. Nem szivatás - kaland.
                </p>
                <div className="py-4 flex items-center gap-3 border border-white/0 rounded-lg">
                  <span className="text-lg font-semibold text-lime-100">10.000 huf</span>
                  <a
                    href="/konyv"
                    className="inline-flex items-center justify-center rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-black ring-1 ring-lime-500/40 transition hover:bg-lime-400 hover:ring-lime-400/60"
                  >
                    Megvásárolom
                  </a>
                  <a
                    href="/deaddrop"
                    className="text-xs font-semibold text-lime-100/50 transition hover:text-lime-200"
                  >
                    Tudj meg többet
                  </a>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center md:justify-end">
                <img
                  src="/vallalhatatlan.png"
                  alt="A Vállalhatatlan fizikai könyv"
                  className="h-48 w-auto object-contain md:h-56"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-lime-400/20 bg-lime-400/60 p-6 md:p-9">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center justify-center md:justify-start">
                <img
                  src="/img/insta2.gif"
                  alt="A Vállalhatatlan Substack websorozat"
                  className="h-72 w-auto rounded-xl object-contain md:h-72"
                />
              </div>

              <div className="flex-1 space-y-3">
                <h2 className="text-2xl font-semibold text-black md:text-3xl">
                  Websorozat a Substacken! 
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-neutral-900">
                  Heti 2-3 epizód, egymás után időrendben, mintha egy Netflix dokut néznél. Zenékkel, videókkal - élőben.
                </p>
                <div className="py-4 flex items-center gap-3 border border-white/0 rounded-lg">
                  <span className="text-lg font-semibold text-neutral-900">5 eur / hónap</span>
                  <a
                    href="/feed"
                    className="inline-flex items-center justify-center rounded-xl bg-black/80 px-4 py-2 text-sm font-bold text-lime-300 ring-1 ring-lime-500/40 transition hover:bg-black hover:ring-lime-400/60"
                  >
                    Csatlakozz!
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

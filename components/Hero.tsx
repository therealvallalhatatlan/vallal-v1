"use client";

import { Card } from "@/components/Card";
import { useState, useEffect } from "react";

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
  const [displayText, setDisplayText] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [startDescription, setStartDescription] = useState(false);
  const [showSection, setShowSection] = useState(false);
  const fullText = ', meg sem történt történetek';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setDisplayText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) {
          clearInterval(interval);
          setStartDescription(true);
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!startDescription) return;
    let i = 0;
    const descText = 'Ezt a könyvet ne keresd a könyvesboltokban. Ez egy városi kaland. Egy titkos küldetés. A könyv megszerzése része a történetnek.';
    const interval = setInterval(() => {
      if (i <= descText.length) {
        setDescriptionText(descText.slice(0, i));
        i++;
        if (i > descText.length) {
          clearInterval(interval);          setShowSection(true);        }
      }
    }, 10);
    return () => clearInterval(interval);
  }, [startDescription]);

  return (
    <section className="relative mx-auto max-w-3xl px-6 py-32 md:py-48">


      <div className="">
        {/* Left: headline + CTAs */}
        <div className="">

          <h1 className="text-4xl font-bold leading-tight md:text-6xl">
            <span className="text-lime-400">Vállalhatatlan</span>
            <span className="text-white">{displayText}</span>
            <span className="cursor">|</span>
          </h1>

          <p className="max-w-xl text-xl md:text-2xl leading-7 text-neutral-300 mb-12">
            {descriptionText}
          </p>


                    {/* Első + Második Könyv dobozok */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {/* Első Könyv */}
            <div className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="space-y-2">
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-600">Első könyv</p>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Vállalhatatlan v1.0
                </h2>
                <p className="text-lg leading-relaxed text-zinc-400">
                  Az eredeti, első kiadás. Még senki sem számolta meg hány oldal.  
                </p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <span className="font-mono text-sm font-semibold text-zinc-400">10 000 Ft</span>
                <a
                  href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
                  className="rounded-lg bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200"
                >
                  Megrendelem
                </a>
              </div>
            </div>

            {/* Második Könyv */}
            <div className="flex flex-col justify-between rounded-2xl border border-lime-400/20 bg-zinc-950 p-6">
              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-widest text-lime-400/60">Második könyv — előrendelés</p>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Vállalhatatlan v2.0
                </h2>
                <p className="text-sm leading-relaxed text-zinc-500">
                  Internetkávézó, 2002. 100 sorszámozott, limitált példány — válassz egyet, mielőtt más megelőz. Dead drop terjesztéssel.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <span className="font-mono text-sm font-semibold text-lime-400/70">10 000 Ft</span>
                <a
                  href="/konyv-2"
                  className="rounded-lg bg-lime-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-lime-300"
                >
                  Előrendelés
                </a>
              </div>
            </div>

          </div>

          <div className={`mb-16 mt-16 rounded-2xl border border-lime-400/20 bg-black/60 p-6 md:p-9 ${showSection ? 'fade-in' : 'opacity-0'}`}>
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
                    href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
                    className="inline-flex items-center justify-center rounded-xl bg-lime-500 px-4 py-2 text-sm font-semibold text-black ring-1 ring-lime-500/40 transition hover:bg-lime-400 hover:ring-lime-400/60"
                  >
                    Megvásárolom
                  </a>
                  <a
                    href="#gyik"
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
                    href="https://vallalhatatlan.substack.com/"
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

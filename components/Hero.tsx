"use client";

import React, { useState } from "react";

export default function Hero() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <section className="px-6 py-4 max-w-3xl mx-auto bg-transparent">
      <div className="items-center">
        {/* Left column – messaging */}
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">
            Magyarország első dead drop könyve
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span
              className="crt-glitch text-lime-400"
              data-text="Vállalhatatlan"
            >
              Vállalhatatlan,
              <span className="text-neutral-200"> meg sem történt történetek</span>
            </span>
          </h1>

          {/* Bullet list */}
          <ul className="space-y-2 text-md md:text-base text-gray-200 mb-6">
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Limitált példányszámú, sorszámozott, dedikált könyv
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Digitális hangoskönyv, zenék, folyamatosan frissülő extra sztorik
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Dead drop* terjesztés – te vadászod le a saját példányod
            </li>
          </ul>

          <p className="text-sm text-gray-300 mb-2">
            *A saját sorszámozott könyvedet{" "}
            <span className="text-lime-400 font-semibold">
              24 órán belül elrejtem
            </span>{" "}
            a városban, és elküldöm a GPS-koordinátákat, fotóval együtt.
          </p>
          <p className="text-xs text-gray-500 italic">
            **Ha nem akarsz bokorba mászni: kérheted posta automatába is.
          </p>
        </div>
      </div>

      <section className="mt-16 w-full">
        <div className="mx-auto">
          <div className="grid gap-6 md:grid-cols-2 max-w-5xl">
            <div className="w-full">
              <PreorderCard onOpenDetails={() => setModalOpen(true)} />
            </div>
            <div className="w-full">
              <DigitalCard />
            </div>
          </div>
        </div>
      </section>


      {isModalOpen && (
        <DetailsModal onClose={() => setModalOpen(false)} />
      )}
    </section>
  );
}

/* -------------------------
   Preorder card component
   ------------------------- */
function PreorderCard({ onOpenDetails }: { onOpenDetails: () => void }) {
  const title = "Karácsonyi különkiadás";
  const subtitle = "Limitált, egyszeri újranyomás (50 példány).";
  const body = `Még idén elindítom az 50 példányos, sorszámozott és dedikált utánnyomást. Ez a batch egy karácsonyi különkiadás. Minden példányhoz jár egy kézzel írt rövid dedikáció és egy kis, exkluzív kártya.`;
  const badge = "🎅 LIMITÁLT • 50 dedikált példány";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <img
        src="/img/50.png"
        alt="Limitált 50 példány"
        className="pointer-events-none select-none absolute -top-2 -right-2 w-32 rotate-12 opacity-90"
      />
      <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">
        nyomtatott könyv
      </p>
      <div className="flex items-center justify-between relative">
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            {title}
          </h3>
          <p className="mt-1 text-sm text-neutral-300">{subtitle}</p>
        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {body}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Könyv
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Hozzáférés a digitális cuccokhoz
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Dead drop városi kaland
        </li>
      </ul>

      <div className="mt-6 flex items-center gap-3">
        <span className="text-neutral-100 text-2xl">15.000.-</span>
        <a
          href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
          className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
          aria-label="Előrendelés"
        >
          Megveszem
        </a>
      </div>

    </div>
  );
}



/* -------------------------
   Simple accessible modal
   ------------------------- */
function DetailsModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal panel */}
      <div className="relative z-10 max-w-3xl w-full rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-lime-300">
              Karácsonyi különkiadás — részletek
            </h2>
            <p className="mt-2 text-sm text-neutral-300">
              Ez nem koldulás: ez egy exkluzív lehetőség. Ha legalább 10 előrendelés
              összegyűlik, elindítjuk a 50 példányos utánnyomást. Minden kötet sorszámozott,
              dedikált, és kap egy kézzel írt rövid dedikációt + egy exkluzív kártyát.
            </p>
          </div>

          <button
            aria-label="Bezárás"
            className="ml-auto rounded-md bg-neutral-800 p-2 text-sm text-gray-300 hover:bg-neutral-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 text-sm text-neutral-300 leading-relaxed">
          <p>
            Hogyan működik:
          </p>
          <ol className="mt-2 ml-5 list-decimal text-sm text-gray-400">
            <li>Feliratkozol előrendelésre (nem fizetsz most, csak elköteleződsz).</li>
            <li>Amint 10 előrendelés összejön, emailt küldök fizetési instrukcióval és a pontos határidővel.</li>
            <li>Ha nem jön össze a 10 előrendelés egy ésszerű határidőn belül, visszajelzek és nem húzódik meg a nyomda.</li>
          </ol>

          <p className="mt-3 italic text-xs text-gray-500">
            Tipp: ha van ismerősöd, aki vicces, provokatív, vagy csak szeret különleges ajándékot adni —
            szólj neki most, ne várd meg az utolsó pillanatot.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <a
            href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
            className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
          >
            Előrendelés / Megveszem
          </a>

          <button
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:text-white"
            onClick={onClose}
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
}


/* -------------------------
   Digital offer card
   ------------------------- */
function DigitalCard() {
  const title = "Vállalhatatlan Reader App";
  const subtitle = "Olvasd és hallgasd perceken belül";
  const body = `Megkapod a teljes könyvet és a digitális ökoszisztémát egy egyedi Vállalhatatlan app formájában. Azonnali hozzáférés minden frissítéshez.`;
  const badge = "⚡ AZONNALI HOZZÁFÉRÉS";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <img
        src="/img/lifetime.png"
        alt="Lifetime hozzáférés"
        className="pointer-events-none select-none absolute -top-4 -right-1 rotate-9 w-28"
      />
      <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">
        digitális verzió
      </p>
      <div className="flex items-center justify-between relative">
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            {title}
          </h3>

        </div>
      </div>

      <p className="mt-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {body}
      </p>

      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Lifetime access
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Folyamatosan frissülő sztorik
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Audiobook, felolvassa M. Máté.
        </li>
        <li className="flex items-start gap-2">
          <span className="text-lime-400">•</span>
          Letölthető zenék
        </li>
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-neutral-100 text-2xl">5000huf</span>
        <a
          href="https://vallalhatatlan.online/digital"
          className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
          aria-label="Digitális verzió megvásárlása"
        >
          Megveszem digitálisan
        </a>
      </div>
    </div>
  );
}

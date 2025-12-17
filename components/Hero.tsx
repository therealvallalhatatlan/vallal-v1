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
              <div className="inline-block align-middle">
                <div>Limitált, sorszámozott, dedikált könyv</div>
                <div className="text-xs text-neutral-400">Csak 100 darabot nyomtatok belőle. Egyenként címezem, sorszámozom és dedikálom.</div>
              </div>
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              <div className="inline-block align-middle">
                <div>Hangoskönyv, zenék, life time hozzáférés</div>
                <div className="text-xs text-neutral-400">Néhány sztori felolvasva + 30 letölthető soundtrack + frissítések</div>
              </div>
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              <div className="inline-block align-middle">
                <div>Dead drop* terjesztés - könyvesboltba ne keresd</div>
                <div className="text-xs text-neutral-400">GPS-koordináta, fotó és 48 órás időablak, hogy megtaláld. Nem szivatás - kaland.</div>
              </div>
            </li>
          </ul>
          <p className="text-sm text-gray-500 italic">
            *Ha nem akarsz bokorba mászni: kérheted posta automatába is.
          </p>
        </div>
      </div>

      <section className="mt-16 w-full">
        <div className="mx-auto">
          <div className="grid gap-6 md:grid-cols-1 max-w-5xl">
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
  const body = `Még idén elindítom az 50 példányos, sorszámozott és dedikált utánnyomást. Ez a batch egy karácsonyi különkiadás. Minden példányhoz jár egy kézzel írt rövid dedikáció, egy kis exkluzív kártya és matricák.`;
  const badge = "🎅 LIMITÁLT • 50 dedikált példány";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 pr-16 md:pr-24 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <img
        src="/img/50.png"
        alt="Limitált 50 példány"
        className="pointer-events-none select-none w-64 float-right"
      />
      <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">
        nyomtatott könyv
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
        <p className="text-sm text-gray-500">
          <a
            href="https://www.patreon.com/c/vallalhatatlan"
            target="_blank"
            rel="noreferrer"
            className="text-lime-200 underline underline-offset-4"
          >
            Patreon
          </a>{" "}
          támogatóknak 10.000.-
        </p>
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
  const subtitle = "Olvasd és hallgasd azonnal";
  const body = `Megkapod a könyv teljes szövegét és a digitális ökoszisztémát egy egyedi Vállalhatatlan app formájában. Azonnali hozzáférés minden frissítéshez.`;
  const badge = "⚡ AZONNALI HOZZÁFÉRÉS";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <img
          src="/img/lifetime.png"
          alt="Lifetime hozzáférés"
          className="pointer-events-none select-none w-48 mx-auto md:mx-0 md:flex-shrink-0"
        />
        <div className="flex-1">
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
            <span className="text-neutral-100 text-2xl">5000.-</span>
            <a
              href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
              className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
              aria-label="Digitális verzió megvásárlása"
            >
              Megveszem digitálisan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

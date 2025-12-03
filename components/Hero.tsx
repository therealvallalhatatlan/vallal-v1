"use client";

import React, { useState } from "react";

export default function Hero() {
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <section className="px-6 py-16 max-w-3xl mx-auto bg-transparent">
      <div className="items-center">
        {/* Left column – messaging */}
        <div className="text-left">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-300/80 mb-4">
            Magyarország első dead drop könyve
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span
              className="crt-glitch text-lime-400"
              data-text="Vállalhatatlan"
            >
              Vállalhatatlan,
              <span className="text-neutral-200"> meg sem történt történetek: </span>
              A Könyv
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
              QR-kódos digitális élmény, zenék, extra sztorik
            </li>
            <li>
              <span className="text-lime-400 font-semibold mr-2">✓</span>
              Dead drop* átvétel – te vadászod le a saját példányod
            </li>
          </ul>

          <p className="text-sm text-gray-300 mb-2">
            A saját sorszámozott könyvedet{" "}
            <span className="text-lime-400 font-semibold">
              24 órán belül elrejtem
            </span>{" "}
            a városban, és elküldöm a GPS-koordinátákat, fotóval együtt.
          </p>
          <p className="text-xs text-gray-500 italic">
            *Ha nem akarsz bokorba mászni: kérheted posta automatába is.
          </p>
        </div>
      </div>

      <section className="mt-16 w-full">
        <div className="mx-auto">
          <div className="grid gap-6 md:grid-cols-1 place-items-start">
            <div className="w-full max-w-3xl">
              <PreorderCard onOpenDetails={() => setModalOpen(true)} />
            </div>
          </div>
        </div>
      </section>

      <HeroCtas />

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
  const title = "Karácsonyi különkiadás — előrendelés";
  const subtitle = "Limitált, csak egyszeri újranyomás (50 példány).";
  const body = `Ha legalább 10 előrendelés összejön, elindítom a 50 példányos, sorszámozott és dedikált utánnyomást. Ez a batch egy karácsonyi különkiadás — minden példányhoz jár egy kézzel írt rövid dedikáció és egy kis, exkluzív kártya.

Előrendelés = elköteleződés: feliratkozol most, és ha összejön a minimum, megy a nyomda; ha nem, visszajelzek és töröljük az előjegyzést (vagy lehetséges alternatívát ajánlok).`;
  const badge = "LIMITÁLT • 50 példány (indul, ha 10 előrendelés összeáll)";

  return (
    <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            {title}
          </h3>
          <p className="mt-1 text-sm text-neutral-300">{subtitle}</p>
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wider bg-lime-700/10 text-lime-300 px-3 py-1 rounded-full border border-lime-800">
          {badge}
        </span>
      </div>

      <p className="mt-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
        {body}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <a
          href="/checkout"
          className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
          aria-label="Előrendelés"
        >
          Előrendelés / Megveszem
        </a>

        <button
          type="button"
          className="text-sm text-gray-400 underline-offset-2 hover:underline"
          onClick={onOpenDetails}
        >
          További részletek
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500 italic">
        Tipp: írok egy rövid emailt az előrendelőknek, amint megvan a 10 fő — így nem kell most rögtön fizetni, csak elköteleződni.
      </p>
    </div>
  );
}

/* -------------------------
   CTA section (kept)
   ------------------------- */
function HeroCtas() {
  const heroCtas = [
    {
      title: "Megveszem a könyvet",
      description:
        "Limitált, sorszámozott példány. Dead drop és digitális extra tartalmak.",
      href: "/checkout",
      button: "Megveszem",
    },
    {
      title: "Letöltöm az alkalmazást",
      description:
        "Digitális Reader: novellák, zenék és vizuálok mobilra optimalizálva.",
      href: "/reader",
      button: "Letöltöm",
    },
  ];

  return (
    <div className="mt-12 max-w-5xl mx-auto px-4 grid gap-4 md:grid-cols-2">
      {heroCtas.map((c) => (
        <a
          key={c.href}
          href={c.href}
          className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4"
        >
          <div>
            <p className="text-sm text-neutral-300">{c.title}</p>
            <p className="mt-1 text-xs text-gray-400">{c.description}</p>
          </div>

          <div>
            <span className="inline-flex items-center rounded-md bg-lime-500 px-3 py-2 text-xs font-semibold text-black">
              {c.button}
            </span>
          </div>
        </a>
      ))}
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
            href="/checkout"
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

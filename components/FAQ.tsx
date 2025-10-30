// components/FAQ.tsx
"use client";

import React from "react";
import clsx from "clsx";

type Item = { q: string; a: React.ReactNode; open?: boolean };

const items: Item[] = [
  {
    q: "Mikor kapom meg a könyvemet?",
    open: true,
    a: (
      <>
        A kampány elérte a célját, és a könyv már kinyomtatásra került! Mindenkivel egyenként felveszem a kapcsolatot a megrendelés beérkezésének sorrendjében. Kapni fogsz egy személyes üzenetet a kézbesítés módjáról (drop/postázás) és a pontos részletekről. Ha még nem kerestelek meg, türelem – sorra kerülsz!
      </>
    ),
  },
  {
    q: "Milyen helyeken lesz elrejtve a csomag?",
    a: (
      <>
        Nyilvános, bárki által elérhető helyeken, ahol nem kerülhetsz kellemetlen helyzetbe. Nem kell valamit vásárolni, nem kell személyzethez szólni, és nem kell belépni tiltott területre. Gondolj parkokra, közterekre, utcabútorok környékére, jellegzetes városi pontokra. A rejtek gyakran kapcsolódik a történetekhez – kapsz róla pozíciót, leírást és fotós nyomot. A cél, hogy jó kaland legyen, ne szívatás. Ha elakadnál, segítünk útbaigazítással.
      </>
    ),
  },
  {
    q: "Módosíthatom vagy lemondhatom a rendelésemet?",
    a: (
      <>
        Ez limitált előrendelés. A vásárlás pillanatában lefoglalod a sorszámodat és a gyártási kapacitást, ezért a rendelés nem módosítható és nem lemondható. (Ha elírtad az e-mailed vagy átadnád valakinek a helyedet, írj nekünk – adatot tudunk frissíteni, de a rendelést nem töröljük.)
      </>
    ),
  },
  {
    q: "Milyen fizetési módokat fogadtok el?",
    a: (
      <>
        Stripe-on keresztül bankkártyát (Visa, MasterCard, Amex), Apple Payt és Google Payt fogadunk el.
        Klubtagok kuponkódot is használhatnak a kedvezményhez.
      </>
    ),
  },
];

export default function FAQ({ className }: { className?: string }) {
  return (
    <section className={clsx("w-full", className)}>
      <h2 className="mb-6 text-center font-black tracking-[0.08em] text-lime-400">
        Gy.<span className="inline-block translate-y-[-0.04em]">I.</span>K.
      </h2>

      <div className="divide-y divide-green-400/20">
        {items.map((item, idx) => (
          <DetailsRow key={idx} item={item} />
        ))}
      </div>
    </section>
  );
}

function DetailsRow({ item }: { item: Item }) {
  return (
    <details
      className="group open:bg-transparent"
      {...(item.open ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer select-none items-center justify-between py-4 text-lime-300 hover:text-lime-200">
        <span className="text-[15px] md:text-base">{item.q}</span>
        {/* caret */}
        <svg
          className="ml-4 h-4 w-4 shrink-0 text-lime-300 transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>

      <div className="mb-4 rounded-md border border-lime-400/20 bg-black/30 p-4 text-sm leading-relaxed text-lime-200/90">
        {item.a}
      </div>
    </details>
  );
}

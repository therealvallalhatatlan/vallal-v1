"use client";

export default function FilmHero() {
  return (
    <section className="relative isolate min-h-screen overflow-hidden text-white">
      <div className="relative z-10 flex h-full flex-col items-start justify-end gap-6 px-6 pb-20 pt-28 lg:px-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
          Vállalhatatlan
        </h1>
        <p className="text-sm uppercase tracking-[0.4em] text-lime-400/80">A Sorozat</p>
        <p className="max-w-2xl text-lg text-slate-200">
          Valódi történetek, neonfények és brutálisan őszinte karakterek. Támogasd, hogy először mozgóképformában lássuk viszont az egyik novellát! Első lépés kiválasztani a történetet, majd megadni, mennyivel állsz be a stáblista oldalára.
        </p>
      </div>
    </section>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX } from "lucide-react";

export default function HeroTerminal() {
  const [now, setNow] = useState<Date | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted((prev) => !prev);
    }
  };

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedDate = now
    ? `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`
    : "----.--.--.";
  const formattedTime = now
    ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "--:--";

  return (
    <section className="relative z-20 border border-white/10 mx-4 md:mx-8 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-[3fr_4fr_3fr]" style={{ minHeight: "calc(100vh - 80px)" }}>

        {/* ── Left Column: Hero Video ── */}
        <div className="relative overflow-hidden border-b md:border-b-0 md:border-r border-white/10 min-h-[67vh] md:min-h-0">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full max-h-max object-cover opacity-80 grayscale"
            src="/videos/0420.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />

          {/* Mute/unmute toggle */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Hang bekapcsolása" : "Hang kikapcsolása"}
            className="absolute top-3 right-3 z-10 p-2 border border-white/20 bg-black/50 text-white/60 hover:text-lime-400 hover:border-lime-400/50 transition-all"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {/* Gradient fade to black at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* System status overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 font-mono text-[9px] tracking-[0.14em] space-y-1.5">
            <div className="flex justify-between">
              <span className="text-white/50">[ System</span>
              <span className="text-lime-400 font-bold">ONLINE ]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">[ Network</span>
              <span className="text-lime-400 font-bold">ACTIVE ]</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">[ Könyv II</span>
              <span className="text-lime-400 font-bold">AVAILABLE ]</span>
            </div>
          </div>
        </div>

        {/* ── Mobile: Social links below video ── */}
        <div className="md:hidden flex items-center justify-center gap-6 border-b border-white/10 px-4 py-3 font-mono text-xs text-gray-400">
          <a href="mailto:therealvallalhatatlan@gmail.com" className="hover:text-lime-400 transition-colors">Email</a>
          <a href="https://www.facebook.com/vallalhatatlan2000" target="_blank" rel="noopener noreferrer" className="hover:text-lime-400 transition-colors">Facebook</a>
          <a href="https://reddit.com/r/vallalhatatlan" target="_blank" rel="noopener noreferrer" className="hover:text-lime-400 transition-colors">Reddit</a>
          <a href="https://vallalhatatlan.substack.com/" target="_blank" rel="noopener noreferrer" className="hover:text-lime-400 transition-colors">Substack</a>
        </div>

        {/* ── Middle Column: Main Content ── */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r border-white/10 font-mono">
          {/* Date/time header bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-2.5 text-xs text-white/40">
            <span>[ Current Date ]</span>
            <span>{formattedDate}&nbsp;&nbsp;{formattedTime}</span>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-8 flex flex-col gap-6">
            <h1 className="text-2xl md:text-3xl font-bold  tracking-wide leading-tight text-white/90">
              Vállalhatatlan,<br />
              meg sem történt történetek
            </h1>

            <p className="text-xl text-white/55 leading-tight">
             Nem kapható könyvesboltokban.<br/>
             Ez egy városi kaland.<br/>A könyv megszerzése a küldetés része.
            </p>

            <p className="text-xs text-red-200/65 italic">
              Az első könyv ELFOGYOTT —{" "}
              <Link
                href="/konyv"
                className="text-white/50 underline underline-offset-2 hover:text-lime-400 transition-colors"
              >
                Nyomtass egyet magadnak!
              </Link>
            </p>

            {/* Primary CTA */}
            <Link
              href="/konyv-2"
              className="relative overflow-hidden flex flex-col border border-white/50 bg-black/55 px-5 py-4 shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_20px_rgba(163,230,53,0.12)] hover:border-lime-400/80 hover:bg-lime-400/10 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.72),0_0_28px_rgba(163,230,53,0.24)] transition-all group"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[3px] border border-lime-400/60 group-hover:border-lime-400/90 transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-widest uppercase text-white/85 group-hover:text-white transition-colors">
                  KÜLDETÉS INDÍTÁSA
                </span>
                <span className="relative flex items-center justify-center w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400" />
                </span>
              </div>
              <span className="text-sm text-white/65 mt-1 tracking-wider">
                Budapest: dead drop 24 órán belül.<br/>Vidék: diszkrét postai kézbesítés, ha a körön kívül vagy.
              </span>
            </Link>

            {/* Dead drop section */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">
                [ PROTOCOL // DEAD_DROP ]
              </h2>
              <p className="text-base text-white/50 leading-relaxed">
                A könyvet elrejtem valahol a városban és megadok egy leírást,
                <br/>pár fotót és egy koordinátát.
                <br/>24 órád van megtalálni.
              </p>

            </div>
          </div>
        </div>

        {/* ── Right Column: Infrastructure Catalog ── */}
        <div className="flex flex-col font-mono bg-black/30">
          {/* System header bar */}
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em]">
            <span className="text-neutral-400">[ INFRASTRUCTURE // SELF-SUSTENANCE ]</span>
            <span className="inline-flex items-center gap-2 text-lime-400/90">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              Active
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Manifesto */}
            <section className="border border-neutral-800 bg-black/40 p-3.5 space-y-2">
              <p className="text-xl italic leading-tight text-white/55">
                Ez a projekt tisztán a könyv bevételeiből és az alábbi három, egyedileg, kézzel készített cuccból tartja fenn magát. 
              </p>
            </section>

            {/* Technical catalog */}
            <section className="border border-neutral-800 divide-y divide-neutral-800 bg-black/40">
              <article className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 p-3.5 items-start">
                <img
                  src="/ny1.jpg"
                  alt="VÁLLALHATATLAN PÓLÓ"
                  className="h-[150px] w-[150px] border border-neutral-800 object-cover grayscale"
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-md uppercase tracking-[0.18em] text-neutral-100">01 // VÁLLALHATATLAN PÓLÓ</h3>
                    <p className="text-[14px] leading-relaxed text-neutral-400">
                      Szitanyomott mintával elöl hátul, kézzel varrt fényvisszaverő szalaggal.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    className="block w-full border border-neutral-800 bg-black/50 px-3 py-2 text-center text-[12px] uppercase tracking-[0.2em] text-neutral-200 hover:border-lime-400/60 hover:text-lime-300 hover:bg-lime-500/5 transition-colors"
                  >
                    MŰVELETI RUHÁZAT
                  </Link>
                </div>
              </article>

              <article className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 p-3.5 items-start">
                <img
                  src="/ny2.jpg"
                  alt="VÁLLALHATATLAN TÁSKA"
                  className="h-[150px] w-[150px] border border-neutral-800 object-cover grayscale"
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-md uppercase tracking-[0.18em] text-neutral-100">02 // VÁLLALHATATLAN TÁSKA</h3>
                    <p className="text-[14px] leading-relaxed text-neutral-400">
                      Erős vászontáska, tartós szitanyomattal és kézzel varrott fényvisszaverő csíkkal.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    className="block w-full border border-neutral-800 bg-black/50 px-3 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-200 hover:border-lime-400/60 hover:text-lime-300 hover:bg-lime-500/5 transition-colors"
                  >
                    Request Bag
                  </Link>
                </div>
              </article>

              <article className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 p-3.5 items-start">
                <img
                  src="/s1.jpg"
                  alt="RENDSZER KITŰZŐ"
                  className="h-[150px] w-[150px] border border-neutral-800 object-cover grayscale"
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-md uppercase tracking-[0.18em] text-neutral-100">03 // RENDSZER KITŰZŐ</h3>
                    <p className="text-[14px] leading-relaxed text-neutral-400">
                      Kézzel készített kitűző, a projekt logójával.
                    </p>
                  </div>
                  <Link
                    href="/shop"
                    className="block w-full border border-neutral-800 bg-black/50 px-3 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-200 hover:border-lime-400/60 hover:text-lime-300 hover:bg-lime-500/5 transition-colors"
                  >
                    Request Pin
                  </Link>
                </div>
              </article>
            </section>
          </div>
        </div>

      </div>
    </section>
  );
}

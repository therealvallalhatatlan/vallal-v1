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
            className="absolute inset-0 w-full h-full object-cover opacity-80 grayscale"
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
          <div className="absolute bottom-0 left-0 right-0 p-4 font-mono text-xs space-y-1.5">
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
            <h1 className="text-2xl md:text-3xl font-bold leading-snug tracking-wide text-white/90">
              Vállalhatatlan,<br />
              meg sem történt<br />
              történetek
            </h1>

            <p className="text-base text-white/55 leading-relaxed">
             Ezt a könyvet ne keresd a könyvesboltokban.<br/>
             Ez egy városi kaland. Egy titkos küldetés.<br/>A könyv megszerzése része a történetnek.
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
              className="flex flex-col border border-white/25 hover:border-lime-400/50 bg-black/40 hover:bg-lime-400/5 px-5 py-4 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold tracking-widest uppercase text-white/75 group-hover:text-white transition-colors">
                  második Könyv
                </span>
                <span className="relative flex items-center justify-center w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-60 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-400" />
                </span>
              </div>
              <span className="text-xs text-white/35 mt-1 tracking-wider">
                Sorszámozott darabok, limitált példányszám
              </span>
            </Link>

            {/* Dead drop section */}
            <div className="border-t border-white/10 pt-6 space-y-3">
              <h2 className="text-sm font-bold tracking-wider uppercase text-white/70">
                Mi az a dead drop?
              </h2>
              <p className="text-base text-white/50 leading-relaxed">
                A könyvet elrejtem valahol a városban* és megadok egy leírást,
                <br/>pár fotót és a koordinátáit.
                <br/>24 órád van megtalálni.
                <br/>
                <span className="text-white/50 text-xs">*Ha unalmas automatára vágysz, jelezd.</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Shop ── */}
        <div className="flex flex-col font-mono">
          {/* Shop header bar */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 text-xs">
            <span className="text-white/40">[ Shop ]</span>
            <span className="text-lime-400">Feltöltve</span>
          </div>

          {/* Product cards */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/10">
            {/* Product 1: Férfi póló */}
            <div className="p-4 space-y-3">
              <div className="overflow-hidden bg-zinc-900">
                <img
                  src="/ny1.jpg"
                  alt="Férfi póló"
                  className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                100% pamut póló, szitanyomattal elöl hátul, kézzel varrott fényvisszaverő szalaggal. Lányoknak crop top változatban is.
              </p>
              <Link
                href="/shop"
                className="block w-full text-center border border-white/25 hover:border-lime-400/50 py-2.5 text-xs font-bold tracking-widest uppercase text-white/65 hover:text-white hover:bg-lime-400/5 transition-all"
              >
                Vállalhatatlan póló
              </Link>
            </div>

            {/* Product 2: Női póló */}
            <div className="p-4 space-y-3">
              <div className="overflow-hidden bg-zinc-900">
                <img
                  src="/ny2.jpg"
                  alt="Női póló"
                  className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <p className="text-xs text-white/45 leading-relaxed">
                Erős, strapabíró anyagból készült bevásárlótáska fényvisszaverő szalaggal. Pink és fekete színben.
              </p>
              <Link
                href="/shop"
                className="block w-full text-center border border-white/25 hover:border-lime-400/50 py-2.5 text-xs font-bold tracking-widest uppercase text-white/65 hover:text-white hover:bg-lime-400/5 transition-all"
              >
                Vállalhatatlan bevásárlótáska
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

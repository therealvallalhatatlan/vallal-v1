"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BatteryWarning, Volume2, VolumeX } from "lucide-react";

export default function HeroTerminal() {
  const [now, setNow] = useState<Date | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [activeShopTab, setActiveShopTab] = useState(0);
  const [isShopHovered, setIsShopHovered] = useState(false);
  const [isShopGlitching, setIsShopGlitching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasMountedShopTabsRef = useRef(false);

  const shopTabs = [
    {
      id: "01",
      title: "VÁLLALHATATLAN PÓLÓ",
      image: "/ny1.jpg",
      alt: "VÁLLALHATATLAN PÓLÓ",
      description: "Szitanyomott mintával elöl-hátul, kézzel varrt fényvisszaverő szalaggal. Utcai ruházat, ami azonnal felismerhető.",
      cta: "PÓLÓ KATALÓGUS",
    },
    {
      id: "02",
      title: "VÁLLALHATATLAN TÁSKA",
      image: "/ny2.jpg",
      alt: "VÁLLALHATATLAN TÁSKA",
      description: "Erős vászontáska, tartós szitanyomattal és kézzel varrott fényvisszaverő csíkkal. Napi használatra és rejtett küldetésekhez.",
      cta: "TÁSKA KATALÓGUS",
    },
    {
      id: "03",
      title: "RENDSZER KITŰZŐ",
      image: "/s1.jpg",
      alt: "RENDSZER KITŰZŐ",
      description: "Kézzel készített, limitált kitűző. Kicsi, de jelzésértékű tárgy azoknak, akik a rendszer peremén mozognak.",
      cta: "KITŰZŐ KATALÓGUS",
    },
  ];

  const currentShopItem = shopTabs[activeShopTab];

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

  useEffect(() => {
    if (isShopHovered) {
      return;
    }

    const tabInterval = setInterval(() => {
      setActiveShopTab((prev) => (prev + 1) % shopTabs.length);
    }, 3000);

    return () => clearInterval(tabInterval);
  }, [isShopHovered, shopTabs.length]);

  useEffect(() => {
    if (!hasMountedShopTabsRef.current) {
      hasMountedShopTabsRef.current = true;
      return;
    }

    setIsShopGlitching(true);
    const glitchTimeout = window.setTimeout(() => {
      setIsShopGlitching(false);
    }, 260);

    return () => window.clearTimeout(glitchTimeout);
  }, [activeShopTab]);

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
            <div
              className="group relative overflow-hidden flex flex-col border border-lime-300/75 bg-transparent px-4 py-3 transition-all"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[3px] border border-lime-300/45 group-hover:border-lime-300/70 transition-colors"
              />
              <div className="flex items-center justify-between">
                <span className="cta-mission-title text-lg font-bold tracking-[0.2em] uppercase text-lime-200/95 transition-colors">
                  KÜLDETÉS INDÍTÁSA
                </span>
                <span className="relative flex items-center justify-center w-3 h-3">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-lime-300/45 opacity-70 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-300/95" />
                </span>
              </div>
              <span className="cta-mission-body text-sm text-neutral-200/90 mt-1 tracking-wide leading-relaxed">
                Budapest: dead drop 24 órán belül.<br/>Vidék: diszkrét postai kézbesítés, ha a körön kívül vagy.
              </span>
            </div>

            <Link
              href="/konyv-2"
              className="cta-mission cta-mission--brutal group relative overflow-hidden flex items-center justify-center border border-lime-300/90 bg-lime-400 px-5 py-3 transition-all"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[3px] border border-black/35 group-hover:border-black/50 transition-colors"
              />
              <span className="relative z-[1] text-lg font-bold tracking-[0.35em] uppercase text-neutral-950/95">
                START
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
            <div className="flex items-center gap-2">
              <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full border border-red-500/35 bg-red-950/55 px-2 py-1 text-red-300">
                <BatteryWarning className="h-3.5 w-3.5" />
                <span className="font-semibold tracking-[0.18em]">CRITICAL</span>
              </span>
              <Link
                href="/tamogatas"
                className="upload-glow-btn inline-flex items-center rounded-full border border-lime-300/55 bg-lime-400/14 px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-lime-100 transition-colors hover:border-lime-200 hover:bg-lime-300/20 hover:text-lime-50"
              >
                FELTÖLTÉS
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {/* Manifesto */}
            <section className="border border-neutral-800 bg-black/40 p-3.5 space-y-2">
              <p className="text-xl italic leading-tight text-lime-300/90">
                Ez a projekt tisztán a könyv bevételeiből és az alábbi három, egyedileg, kézzel készített cuccból tartja fenn magát. 
              </p>
            </section>

            {/* Technical catalog */}
            <section
              className="border border-neutral-800 bg-black/40"
              onMouseEnter={() => setIsShopHovered(true)}
              onMouseLeave={() => setIsShopHovered(false)}
            >
              <div className="grid grid-cols-3 border-b border-neutral-800 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]">
                {shopTabs.map((tab, index) => {
                  const isActive = index === activeShopTab;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveShopTab(index)}
                      className={`group relative border-r border-neutral-800 px-3 py-3 text-left transition-all duration-200 last:border-r-0 ${
                        isActive
                          ? "bg-white/[0.045]"
                          : "bg-transparent hover:bg-white/[0.03]"
                      }`}
                      aria-current={isActive ? "true" : "false"}
                    >
                      {isActive && (
                        <span className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-lime-300/70" />
                      )}
                      <div className="space-y-1">
                        <span
                          className={`block text-[26px] leading-none tracking-[0.26em] transition-colors ${
                            isActive ? "text-lime-300/90" : "text-neutral-500"
                          }`}
                        >
                          {tab.id}
                        </span>
                        <span
                          className={`block text-[11px] uppercase tracking-[0.16em] transition-colors ${
                            isActive ? "text-neutral-100" : "text-neutral-400"
                          }`}
                        >
                          {tab.title}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <article className={`relative overflow-hidden p-3.5 ${isShopGlitching ? "shop-preview-glitch" : ""}`}>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(163,230,53,0.09),transparent_46%),radial-gradient(circle_at_86%_12%,rgba(255,255,255,0.05),transparent_40%)]" />
                {isShopGlitching && (
                  <>
                    <span className="shop-glitch-band shop-glitch-band--top" />
                    <span className="shop-glitch-band shop-glitch-band--bottom" />
                  </>
                )}
                <div className={`relative grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)] items-start ${isShopGlitching ? "shop-preview-glitch__content" : ""}`}>
                  <div className="relative w-full aspect-square sm:w-[150px]">
                    <Link href="/shop" className="block h-full w-full">
                      <img
                        src={currentShopItem.image}
                        alt={currentShopItem.alt}
                        className="h-full w-full border border-neutral-700 object-cover grayscale transition-all hover:grayscale-0"
                      />
                    </Link>
                    <span className="absolute left-2 top-2 border border-neutral-700 bg-black/70 px-1.5 py-0.5 text-[10px] tracking-[0.2em] text-lime-300">
                      {currentShopItem.id}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <h3 className="text-sm uppercase tracking-[0.22em] text-neutral-100">
                        {currentShopItem.title}
                      </h3>
                      <p className="text-[14px] leading-relaxed text-neutral-300">
                        {currentShopItem.description}
                      </p>
                    </div>

                    <Link
                      href="/shop"
                      className="inline-flex min-h-10 w-full items-center justify-center border border-neutral-700 bg-black/65 px-4 py-2 text-center text-[11px] uppercase tracking-[0.24em] text-neutral-100 transition-colors hover:border-lime-400/60 hover:text-lime-300 hover:bg-lime-500/5"
                    >
                      {currentShopItem.cta}
                    </Link>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </div>

      </div>

      <style jsx>{`
        .shop-preview-glitch::before,
        .shop-preview-glitch::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
        }

        .shop-preview-glitch::before {
          background: linear-gradient(90deg, transparent 0%, rgba(163, 230, 53, 0.16) 45%, transparent 100%);
          mix-blend-mode: screen;
          animation: shopGlitchFlash 260ms ease-out;
        }

        .shop-preview-glitch::after {
          background:
            linear-gradient(180deg, transparent 0%, rgba(255, 255, 255, 0.08) 48%, transparent 52%, transparent 100%),
            repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 1px, transparent 1px, transparent 4px);
          animation: shopScanlineFlash 260ms ease-out;
        }

        .shop-preview-glitch__content {
          animation: shopPreviewJitter 260ms steps(2, end);
        }

        .shop-glitch-band {
          position: absolute;
          left: 0;
          right: 0;
          height: 14%;
          pointer-events: none;
          opacity: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.14) 35%, rgba(163, 230, 53, 0.22) 55%, transparent 100%);
          mix-blend-mode: screen;
        }

        .shop-glitch-band--top {
          top: 16%;
          animation: shopBandTop 260ms ease-out;
        }

        .shop-glitch-band--bottom {
          top: 58%;
          animation: shopBandBottom 260ms ease-out;
        }

        @keyframes shopPreviewJitter {
          0% {
            transform: translate3d(0, 0, 0);
            filter: saturate(1);
          }
          20% {
            transform: translate3d(-2px, 1px, 0);
            filter: saturate(1.08);
          }
          45% {
            transform: translate3d(2px, -1px, 0);
          }
          70% {
            transform: translate3d(-1px, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
            filter: saturate(1);
          }
        }

        @keyframes shopGlitchFlash {
          0% {
            opacity: 0;
            transform: translateX(-12%);
          }
          18% {
            opacity: 0.8;
          }
          100% {
            opacity: 0;
            transform: translateX(12%);
          }
        }

        @keyframes shopScanlineFlash {
          0% {
            opacity: 0;
          }
          25% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes shopBandTop {
          0% {
            opacity: 0;
            transform: translate3d(-3%, -4px, 0);
          }
          30% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform: translate3d(4%, 3px, 0);
          }
        }

        @keyframes shopBandBottom {
          0% {
            opacity: 0;
            transform: translate3d(3%, 4px, 0);
          }
          30% {
            opacity: 0.85;
          }
          100% {
            opacity: 0;
            transform: translate3d(-4%, -3px, 0);
          }
        }

        .upload-glow-btn {
          box-shadow:
            0 0 0 1px rgba(163, 230, 53, 0.24),
            0 0 18px rgba(163, 230, 53, 0.24),
            inset 0 0 12px rgba(163, 230, 53, 0.18);
          animation: uploadGlowPulse 1.9s ease-in-out infinite;
        }

        @keyframes uploadGlowPulse {
          0%,
          100% {
            box-shadow:
              0 0 0 1px rgba(163, 230, 53, 0.24),
              0 0 16px rgba(163, 230, 53, 0.2),
              inset 0 0 8px rgba(163, 230, 53, 0.14);
          }
          50% {
            box-shadow:
              0 0 0 1px rgba(190, 242, 100, 0.48),
              0 0 32px rgba(163, 230, 53, 0.44),
              inset 0 0 14px rgba(190, 242, 100, 0.28);
          }
        }
      `}</style>
    </section>
  );
}

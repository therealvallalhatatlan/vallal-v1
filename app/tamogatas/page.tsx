"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SupportersTicker } from "@/components/supporters/SupportersTicker";
import { SUPPORTER_NAMES } from "@/data/supporters";
import Footer from "@/components/Footer";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: ["800"],
  style: ["italic"],
  display: "swap",
});

const MIN_AMOUNT_HUF = 1000;
const MAX_AMOUNT_HUF = 999000;
const SLIDER_STEP_HUF = 1000;
const DEFAULT_AMOUNT_HUF = 5000;

const CHEERS_SFX_SRC = "/audio/cheers.wav";
const CHEERS2_SFX_SRC = "/audio/cheers2.wav";

function formatHuf(value: number) {
  return `${new Intl.NumberFormat("hu-HU").format(value)} Ft`;
}

export default function TamogatasPage() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT_HUF);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cheersAudioRef = useRef<HTMLAudioElement | null>(null);
  const cheers2AudioRef = useRef<HTMLAudioElement | null>(null);
  const didPlayCheersRef = useRef(false);

  useEffect(() => {
    const cheers = new Audio(CHEERS_SFX_SRC);
    cheers.preload = "auto";
    cheers.volume = 0.95;
    cheersAudioRef.current = cheers;

    const cheers2 = new Audio(CHEERS2_SFX_SRC);
    cheers2.preload = "auto";
    cheers2.volume = 0.95;
    cheers2AudioRef.current = cheers2;

    const playCheersOnFirstInteraction = () => {
      if (didPlayCheersRef.current) return;

      didPlayCheersRef.current = true;

      const current = cheersAudioRef.current;
      if (!current) return;

      current.currentTime = 0;

      void current.play().catch(() => {
        // Ignore blocked playback attempts.
      });

      window.removeEventListener(
        "pointerdown",
        playCheersOnFirstInteraction,
      );
      window.removeEventListener("keydown", playCheersOnFirstInteraction);
    };

    window.addEventListener("pointerdown", playCheersOnFirstInteraction, {
      passive: true,
    });

    window.addEventListener("keydown", playCheersOnFirstInteraction);

    return () => {
      window.removeEventListener(
        "pointerdown",
        playCheersOnFirstInteraction,
      );
      window.removeEventListener("keydown", playCheersOnFirstInteraction);

      cheers.pause();
      cheers.currentTime = 0;
      cheersAudioRef.current = null;

      cheers2.pause();
      cheers2.currentTime = 0;
      cheers2AudioRef.current = null;
    };
  }, []);

  const handleSliderPointerDown = () => {
    const cheers2 = cheers2AudioRef.current;
    if (!cheers2) return;

    cheers2.currentTime = 0;

    void cheers2.play().catch(() => {
      // Ignore blocked playback attempts.
    });
  };

  const progress = useMemo(() => {
    const ratio =
      (amount - MIN_AMOUNT_HUF) / (MAX_AMOUNT_HUF - MIN_AMOUNT_HUF);

    return Math.min(100, Math.max(0, ratio * 100));
  }, [amount]);

  const setAmountSafe = (nextValue: number) => {
    const clamped = Math.max(
      MIN_AMOUNT_HUF,
      Math.min(MAX_AMOUNT_HUF, Math.round(nextValue)),
    );

    setAmount(clamped);
  };

  const handleSubmit = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/tamogatas/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.error || "Nem sikerült létrehozni a fizetést.",
        );
      }

      if (!data?.url) {
        throw new Error("Hiányzik a Stripe átirányítási URL.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Váratlan hiba történt.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Background texture */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(163,230,53,0.045),transparent_38%)]" />

        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:100%_4px]" />

        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:80px_80px]" />
      </div>

      <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
        {/* PAGE HEADER */}
        <header className="mb-8 mt-20">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-800 pb-3">
            <span
              className="text-[9px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ SUPPORT / ACCESS ]
            </span>

            <span
              className="flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-lime-300/70"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.75)]" />
              NETWORK: ONLINE
            </span>
          </div>
        </header>

        {/* SUPPORTERS */}
        <div className="mb-5 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80">
          <div className="border-b border-zinc-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <span
                className="text-[9px] uppercase tracking-[0.2em] text-zinc-500"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                [ 🤍 A HÁLÓZAT TÁMOGATÓI ]
              </span>

              <span
                className="text-xs uppercase tracking-[0.15em] text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                LIVE
              </span>
            </div>
          </div>

          <div className="px-4 py-3">
            <SupportersTicker
              names={SUPPORTER_NAMES}
              label="Támogatók nevei"
            />
          </div>
        </div>

        {/* CHANNELS */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* DIRECT FUNDING */}
          <article className="group overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80 transition-colors duration-300 hover:border-lime-400/30">
            <div className="relative p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:100%_4px]" />

              <div className="relative">
                <div className="mb-6 flex items-start justify-between">
                  <span
                    className="text-[9px] uppercase tracking-[0.2em] text-lime-400/80"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ 02 / DIRECT FUNDING ]
                  </span>

                  <span
                    className="text-xs uppercase tracking-[0.15em] text-zinc-700"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    STRIPE
                  </span>
                </div>

                <h2
                  className={`${montserrat.className} text-[26px] uppercase leading-[0.95] tracking-[-0.03em] text-zinc-100 md:text-[34px]`}
                >
                  🤍 KÖZVETLEN
                  <br />
                  TÁMOGATÁS
                </h2>

                <div
                  className="mt-5 border-t border-zinc-800 pt-5"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <div className="mb-3 flex items-end justify-between">
                    <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                      TÁMOGATÁSI ÖSSZEG
                    </span>

                    <span className="text-sm font-bold tracking-[0.08em] text-lime-300">
                      {formatHuf(amount)}
                    </span>
                  </div>

                  {/* RANGE */}
                  <div className="relative h-7 w-full">
                    <input
                      type="range"
                      min={MIN_AMOUNT_HUF}
                      max={MAX_AMOUNT_HUF}
                      step={SLIDER_STEP_HUF}
                      value={amount}
                      onPointerDown={handleSliderPointerDown}
                      onChange={(event) =>
                        setAmountSafe(Number(event.target.value))
                      }
                      className="tamogatas-range absolute inset-0 z-10 h-7 w-full cursor-pointer"
                      aria-label="Támogatási összeg"
                      style={{
                        background: `linear-gradient(
                          to right,
                          rgb(163 230 53) 0%,
                          rgb(163 230 53) ${progress}%,
                          rgb(39 39 42) ${progress}%,
                          rgb(39 39 42) 100%
                        )`,
                      }}
                    />
                  </div>

                  <div className="mt-1 flex justify-between text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                    <span>{formatHuf(MIN_AMOUNT_HUF)}</span>
                    <span>{formatHuf(MAX_AMOUNT_HUF)}</span>
                  </div>

                  {/* MANUAL AMOUNT */}
                  <label className="mt-6 block">
                    <span className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                      KÉZI ÖSSZEG / FT
                    </span>

                    <div className="relative">
                      <input
                        type="number"
                        min={MIN_AMOUNT_HUF}
                        max={MAX_AMOUNT_HUF}
                        step={SLIDER_STEP_HUF}
                        value={amount}
                        onChange={(event) =>
                          setAmountSafe(
                            Number(event.target.value || MIN_AMOUNT_HUF),
                          )
                        }
                        className="w-full rounded-md border border-zinc-800 bg-black px-3 py-3 pr-14 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-lime-400/60"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      />

                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase tracking-[0.12em] text-zinc-600"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      >
                        HUF
                      </span>
                    </div>
                  </label>
                </div>

                {/* ERROR */}
                {error && (
                  <div
                    className="mt-4 rounded-md border border-red-500/30 bg-red-500/[0.04] px-3 py-3 text-[10px] leading-relaxed text-red-300"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span className="mr-2 text-red-500">[ ERROR ]</span>
                    {error}
                  </div>
                )}

                {/* CHECKOUT */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="group/button mt-5 flex min-h-[58px] w-full items-center justify-between rounded-md border border-lime-400/50 bg-lime-400/[0.025] px-4 transition-all duration-200 hover:border-lime-400/80 hover:bg-lime-400/[0.08] hover:shadow-[0_0_30px_rgba(163,230,53,0.07)] disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200">
                    {isLoading
                      ? "[ ÁTIRÁNYÍTÁS STRIPE... ]"
                      : "[ STRIPE FIZETÉS INDÍTÁSA ]"}
                  </span>

                  <span className="py-4 text-lime-300 transition-transform group-hover/button:translate-x-1">
                    ↗
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-zinc-800 px-5 py-3 sm:px-6">
              <span
                className="text-xs uppercase tracking-[0.16em] text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                MIN. 1 000 FT // MAX. 1 000 000 FT
              </span>
            </div>
          </article>

          {/* SHOP */}
          <article className="group overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80 transition-colors duration-300 hover:border-lime-400/30">
            <div className="relative p-5 sm:p-6">
              <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:100%_4px]" />

              <div className="relative">
                <div className="mb-6 flex items-start justify-between">
                  <span
                    className="text-[9px] uppercase tracking-[0.2em] text-lime-400/80"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ 01 / SHOP CHANNEL ]
                  </span>

                  <span
                    className="text-[8px] uppercase tracking-[0.15em] text-zinc-700"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    OBJECTS
                  </span>
                </div>

                <h2
                  className={`${montserrat.className} text-[26px] uppercase leading-[0.95] tracking-[-0.03em] text-zinc-100 md:text-[34px]`}
                >
                  TÁRGYI
                  <br />
                  TÁMOGATÁS
                </h2>

                <div
                  className="mt-5 border-t border-zinc-800 pt-5 text-md leading-[1.8] text-zinc-500"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <p>
                    Póló, táska, kitűző, könyv és egyéb cuccok.
                  </p>
                </div>

                <Link
                  href="/shop"
                  className="group/button mt-6 flex min-h-[56px] items-center justify-between rounded-md border border-lime-400/40 bg-lime-400/[0.025] px-4 transition-all duration-200 hover:border-lime-400/70 hover:bg-lime-400/[0.07] hover:shadow-[0_0_25px_rgba(163,230,53,0.06)]"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span className="py-6 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200">
                    [ SHOP MEGNYITÁSA ]
                  </span>

                  <span className="text-lime-300 transition-transform group-hover/button:translate-x-1">
                    ↗
                  </span>
                </Link>
              </div>
            </div>

            <div className="border-t border-zinc-800 px-5 py-3 sm:px-6">
              <span
                className="text-xs uppercase tracking-[0.16em] text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                KÖNYVEK / MERCH / EGYEDI CUCCOK
              </span>
            </div>
          </article>
        </div>

        {/* BOTTOM NOTE */}
        <section className="mt-5 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/80">
          <div className="p-5 sm:p-6">
            <div className="flex gap-4">
              <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />

              <div>
                <span
                  className="block text-[9px] uppercase tracking-[0.18em] text-zinc-500"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ MIRE MEGY A PÉNZ? ]
                </span>

                <p
                  className="mt-3 max-w-3xl text-[10px] leading-[1.9] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  A támogatás közvetlenül a Vállalhatatlan projektjeinek
                  készítésére és működtetésére megy. Könyvek, filmek,
                  technológia, szerverek, kísérletek. A hálózatot nem egy nagy
                  gép tartja életben. Sok kicsi.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 px-5 py-3 sm:px-6">
            <div
              className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-zinc-700"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span>SUPPORT</span>
              <span>BUILD</span>
              <span>RELEASE</span>
              <span>REPEAT</span>
            </div>
          </div>
        </section>


      </section>

      {/* RANGE STYLES */}
      <style jsx>{`
        .tamogatas-range {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          height: 2px;
          margin: 0;
          padding: 0;
          border: 0;
          outline: none;
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 1px;
        }

        .tamogatas-range::-webkit-slider-runnable-track {
          width: 100%;
          height: 1px;
          background: transparent;
          border: 0;
        }

        .tamogatas-range::-moz-range-track {
          width: 100%;
          height: 1px;
          background: transparent;
          border: 0;
        }

        .tamogatas-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          margin-top: -6.5px;
          border: 0;
          border-radius: 9999px;
          background: #f4f4f5;
          box-shadow: 0 0 0 1px rgba(244, 244, 245, 0.12);
          cursor: pointer;
        }

        .tamogatas-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: 0;
          border-radius: 9999px;
          background: #f4f4f5;
          box-shadow: 0 0 0 1px rgba(244, 244, 245, 0.12);
          cursor: pointer;
        }

        .tamogatas-range:focus-visible::-webkit-slider-thumb {
          box-shadow:
            0 0 0 2px rgba(163, 230, 53, 0.35),
            0 0 12px rgba(163, 230, 53, 0.25);
        }

        .tamogatas-range:focus-visible::-moz-range-thumb {
          box-shadow:
            0 0 0 2px rgba(163, 230, 53, 0.35),
            0 0 12px rgba(163, 230, 53, 0.25);
        }
      `}</style>
       <Footer />
    </main>
  );
}
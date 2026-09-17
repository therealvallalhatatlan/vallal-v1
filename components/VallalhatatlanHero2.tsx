"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import { RefreshCw } from "lucide-react"
import Reviews from "@/components/Reviews"
import Image from "next/image"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

type RandomStory = {
  source: "konyv2" | "stories"
  slug: string
  title: string
  text: string
}

export default function VallalhatatlanHero2() {
  type BookCopy = {
    id: string
    copy_number: number
    status: "available" | "reserved" | "sold"
  }

  const [availableCopies, setAvailableCopies] = useState<number[]>([])
  const [randomStory, setRandomStory] = useState<RandomStory | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [showAcquire, setShowAcquire] = useState(false)
  const [pickupMethod, setPickupMethod] = useState<"dead-drop" | "automata">("dead-drop")
  const [selectedCopy, setSelectedCopy] = useState<number | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const loadRandomStory = async () => {
    setStoryLoading(true)

    try {
      const response = await fetch("/api/public/random-story", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Random story unavailable")

      const data = (await response.json()) as RandomStory
      setRandomStory(data)
    } catch (error) {
      console.error("Failed to load random story:", error)
    } finally {
      setStoryLoading(false)
    }
  }

  const loadAvailableCopies = async () => {
    try {
      const response = await fetch("/api/inventory", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Inventory unavailable")

      const data = (await response.json()) as { copies?: BookCopy[] }
      const copies = Array.isArray(data.copies) ? data.copies : []
      const available = copies
        .filter((copy) => copy.status === "available")
        .map((copy) => copy.copy_number)
        .filter((number) => Number.isInteger(number) && number >= 1 && number <= 100)

      setAvailableCopies(available)

      if (available.length > 0) {
        setSelectedCopy((current) =>
          current && available.includes(current)
            ? current
            : available[Math.floor(Math.random() * available.length)],
        )
      } else {
        setSelectedCopy(null)
      }
    } catch (error) {
      console.error("Failed to load available copies:", error)
    }
  }

  const randomizeCopy = () => {
    if (availableCopies.length < 2) return

    const choices = availableCopies.filter((copyNumber) => copyNumber !== selectedCopy)
    const next = choices[Math.floor(Math.random() * choices.length)]
    if (next) setSelectedCopy(next)
  }

  const handleAcquire = () => {
    if (availableCopies.length === 0) return

    if (!selectedCopy || !availableCopies.includes(selectedCopy)) {
      const next = availableCopies[Math.floor(Math.random() * availableCopies.length)]
      if (next) setSelectedCopy(next)
    }

    setShowAcquire(true)
  }

  const startCheckout = async () => {
    if (!selectedCopy || !availableCopies.includes(selectedCopy) || checkoutLoading) return

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const reserveResponse = await fetch("/api/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_number: selectedCopy }),
      })
      const reserveData = (await reserveResponse.json()) as {
        success?: boolean
        error?: string
      }

      if (!reserveResponse.ok || !reserveData.success) {
        throw new Error(reserveData.error || "A kiválasztott példányt közben elvitték.")
      }

      const response = await fetch("/api/checkout-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_number: selectedCopy }),
      })

      const data = (await response.json()) as {
        success?: boolean
        url?: string
        error?: string
      }

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || "A fizetés indítása nem sikerült.")
      }

      window.location.href = data.url
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "A fizetés indítása nem sikerült.",
      )
      setCheckoutLoading(false)
      void loadAvailableCopies()
    }
  }

  useEffect(() => {
    void loadAvailableCopies()
    void loadRandomStory()
  }, [])
  return (
    <section
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#010101] text-green-200"
      style={{
        paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 fx-stripes opacity-10 mix-blend-plus-lighter" />

      <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <div className="w-full pt-14 pb-14 relative">
          <video
          className="absolute right-1 top-6 w-27 h-27 rounded-full float-right border border-zinc-700/40"
          src="/videos/avatar/avatar.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={false}
          preload="metadata"
          />
          <p
            className="pt-24 ml-auto max-w-xl text-right text-[19px] font-semibold italic leading-relaxed text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ennek a könyvnek nincs írója,<br/>nincs kiadója, és nem kapható<br/>a könyvesboltokban.<br/>
            <span className="text-lime-100 mr-4">→</span>
            <span className="text-lime-100">Meg kell találnod.</span>
          </p>
        </div>

        <section aria-label="Sorszám kiválasztása">
          <div className="flex items-end justify-between gap-6 pt-6 border-t border-zinc-800">
            <div>
              <p
                className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                A TE PÉLDÁNYOD:
              </p>

              <div className="flex items-center gap-4">
                <span
                  className="block text-8xl leading-none tracking-[-0.1m] text-zinc-100 sm:text-8xl"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {String(selectedCopy ?? 67).padStart(3, "0")}
                </span>

                <button
                  type="button"
                  onClick={randomizeCopy}
                  disabled={availableCopies.length < 2}
                  aria-label="Másik szabad sorszám"
                  title="Másik szabad sorszám"
                  className="mb-1 flex h-11 w-32 items-center justify-center rounded-full border border-zinc-700/40 text-zinc-400 transition-all hover:border-lime-100/70 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <span className="mr-3 text-[11px] tracking-wider uppercase">Random</span>
                  <RefreshCw size={20} strokeWidth={1} />
                </button>
              </div>
            </div>

            <div className="hidden text-right sm:block">
              <p
                className="text-[9px] uppercase tracking-[0.18em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                SZABAD PÉLDÁNYOK
              </p>
              <p
                className="mt-1 text-sm text-zinc-400"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {availableCopies.length} / 100
              </p>
            </div>
          </div>

          <div
            className="mt-8 max-w-xl border-l border-lime-100/20 pl-4 text-sm leading-[1.8] text-zinc-400 sm:pl-5"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <p>100 darab sorszámozott példány készül.</p>
            <p>Átvétel: Dead Drop vagy automata.</p>
          </div>
        </section>

        <section className="mt-10" aria-label="Könyv megszerzése">
          <button
            type="button"
            onClick={handleAcquire}
            disabled={availableCopies.length === 0}
            className="group relative flex min-h-20 w-full items-center justify-between overflow-hidden rounded-sm border-2 border-lime-100/80 bg-lime-100 px-5 py-5 text-left text-black transition-all duration-300 hover:border-zinc-100 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span className="text-lg font-bold uppercase tracking-[0.08em] sm:text-xl">
              <span className="mr-6 rounded-md bg-white border border-zinc-200 text-zinc-800 p-3">
              #{String(selectedCopy ?? 67).padStart(3, "0")}
              </span>
              Levadászom
            </span>
            <span
              className="text-2xl transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </button>

          <div
            className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-zinc-600"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>10 000 HUF / PÉLDÁNY</span>
            <span>{availableCopies.length} SZABAD</span>
          </div>

          {showAcquire && (
            <div className="mt-5 overflow-hidden rounded-sm border border-zinc-800 bg-zinc-950/80">
              <div className="border-b border-zinc-800 px-4 py-3">
                <div
                  className="flex items-center justify-between text-[9px] uppercase tracking-[0.18em] text-zinc-500"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span>ÁTVÉTEL KIVÁLASZTÁSA</span>
                  <span>#{String(selectedCopy ?? 67).padStart(3, "0")}</span>
                </div>
              </div>

              <div className="grid gap-px bg-zinc-800 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPickupMethod("dead-drop")}
                  aria-pressed={pickupMethod === "dead-drop"}
                  className={`px-4 py-5 text-left transition-colors ${
                    pickupMethod === "dead-drop"
                      ? "bg-zinc-900 text-zinc-100"
                      : "bg-[#050505] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span
                    className="block text-md uppercase tracking-[0.08em]"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Dead drop
                  </span>
                  <span
                    className="mt-2 block text-xs leading-relaxed"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Ingyenes átvétel egy aktív átadóponton, Budapesten.
                  </span>
                  <span
                    className="mt-3 block text-md uppercase tracking-[0.14em] text-lime-100/80"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    +0 HUF
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPickupMethod("automata")}
                  aria-pressed={pickupMethod === "automata"}
                  className={`px-4 py-5 text-left transition-colors ${
                    pickupMethod === "automata"
                      ? "bg-zinc-900 text-zinc-100"
                      : "bg-[#050505] text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span
                    className="block text-md uppercase tracking-[0.08em]"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Automata
                  </span>
                  <span
                    className="mt-2 block text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Csomagautomata, feláras átvétellel.
                  </span>
                  <span
                    className="mt-3 block text-md uppercase tracking-[0.14em] text-lime-100/80"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    +2 500 HUF
                  </span>
                </button>
              </div>

              <div className="border-t border-zinc-800 p-4">
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p
                      className="text-[9px] uppercase tracking-[0.18em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      VÉGÖSSZEG
                    </p>
                    <p
                      className="mt-1 text-2xl text-zinc-100"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {pickupMethod === "automata" ? "12 500" : "10 000"} HUF
                    </p>
                  </div>
                  <span
                    className="text-right text-[9px] uppercase tracking-[0.15em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    STRIPE
                    <br />
                    BIZTONSÁGOS FIZETÉS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void startCheckout()}
                  disabled={!selectedCopy || checkoutLoading}
                  className="flex min-h-14 w-full items-center justify-between rounded-sm border border-zinc-600 px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-zinc-100 transition-all hover:border-lime-100/70 hover:bg-zinc-100/5 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span>{checkoutLoading ? "STRIPE INDÍTÁSA..." : "Tovább a Stripe fizetéshez"}</span>
                  <span aria-hidden="true">↗</span>
                </button>
                {checkoutError && (
                  <p
                    className="mt-3 text-xs leading-relaxed text-rose-300"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {checkoutError}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-16 w-full">
          <Reviews />
        </section>

        <section className="mt-12 w-full" aria-label="Random Sztorik">
          <div
            className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-t border-zinc-800 pt-4"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>Random Sztori</span>
            <button
              type="button"
              onClick={() => void loadRandomStory()}
              disabled={storyLoading}
              aria-label="Új random sztori"
              title="Új random sztori"
              className="group flex h-7 w-7 items-center justify-center text-zinc-200 transition-colors hover:text-lime-100 disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                strokeWidth={2.5}
                className={`transition-transform duration-500 ${storyLoading ? "animate-spin" : "group-hover:rotate-180"}`}
              />
            </button>
          </div>

          {randomStory ? (
            <article className="border-t border-zinc-800 pt-6">
              <h3
                className={`${montserrat.className} py-2 text-3xl leading-tighter text-zinc-100 line-through`}
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {randomStory.title}
              </h3>
              <p
                className="mt-4 whitespace-pre-line text-md leading-relaxed text-zinc-300"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {randomStory.text}
              </p>
            </article>
          ) : (
            <div className="border-t border-zinc-800 pt-4 font-mono text-sm italic text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
              {storyLoading ? "Sztori betöltése..." : "Nincs elérhető sztori."}
            </div>
          )}
        </section>

        <div
          className="mt-8 pb-8 pt-6 font-mono text-md leading-relaxed text-zinc-400"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <div className="mt-8 border-t border-zinc-900 pt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            SIGNAL ORIGIN: REDDIT
            <br />
            STATUS: STILL RUNNING
          </div>
        </div>
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 z-60 bg-zinc-950 px-2 py-6 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <div className="grid min-h-[74px] grid-cols-3 items-center divide-x divide-zinc-700 rounded-md border-2 border-zinc-700 bg-zinc-950 text-center hover:border-zinc-200/40 transition-all">
          <Link
            href="/konyv"
            className="flex min-h-[64px] flex-col items-center justify-center px-2 py-4 hover:bg-zinc-100/10 transition-colors"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ KÖNYV ]
            </span>
            <span
              className="text-xs text-lime-100/80"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              67 Történet
            </span>
          </Link>

          <Link
            href="/halozat"
            className="flex min-h-[84px] flex-col items-center justify-center bg-zinc-800/0 px-2 py-4 hover:bg-zinc-100/10 transition-colors"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ HALOZAT ]
            </span>
            <span
              className="text-xs text-lime-100/80"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              00 AKTIV SZPOT
            </span>
          </Link>

          <Link
            href="/lab"
            className="flex min-h-[84px] flex-col items-center justify-center px-2 py-4 hover:bg-zinc-100/10 transition-colors"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ LAB ]
            </span>
            <span
              className="text-xs text-lime-100/80"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              03 Projekt
            </span>
          </Link>
        </div>
      </nav>
    </section>
  )
}

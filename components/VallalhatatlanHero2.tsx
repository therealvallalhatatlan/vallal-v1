"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import { RefreshCw } from "lucide-react"
import Reviews from "@/components/Reviews"
import { Badge } from "@/components/Badge"
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
    if (!selectedCopy || checkoutLoading) return

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/checkout-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy_number: selectedCopy,
          delivery_method: pickupMethod,
        }),
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
        <div className="w-full pb-18 pt-10 relative">
          <p
            className="ml-auto max-w-xl text-right text-[19px] font-semibold italic leading-relaxed text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ennek a könyvnek nincs írója,<br/>nincs kiadója, és nem kapható<br/>a könyvesboltokban.<br/>
            <span className="text-lime-100/80 mr-4">→</span>
            <span className="text-lime-100/80">Meg kell találnod.</span>
          </p>
        </div>

        <section className="bg-black" aria-label="Sorszám kiválasztása">
          <div className="pt-6">
            <div>
              <div className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-t pt-4 pb-1 border-b border-zinc-800">
                <p
                  className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                 A TE KÖNYVED SORSZÁMA
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className="block text-8xl leading-none tracking-wide text-zinc-100"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {String(selectedCopy ?? 67).padStart(3, "0")}
                </span>
                <span className="-ml-4 text-xl text-zinc-600"style={{ fontFamily: "var(--font-mono-tech)" }}>/100</span>
                <button
                  type="button"
                  onClick={randomizeCopy}
                  disabled={availableCopies.length < 2}
                  aria-label="Másik szabad sorszám"
                  title="Másik szabad sorszám"
                  className="mb-1 flex h-10 w-28 opacity-70 hover:opacity-100 text-xs uppercase border p-2 border-zinc-800 items-center justify-center rounded-full text-zinc-400 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <RefreshCw size={18} strokeWidth={2} />
                  <span className="ml-2 text-zinc-700"style={{ fontFamily: "var(--font-mono-tech)" }}>Másikat</span>
                </button>
              </div>
            </div>
          </div>

          <div
            className="mt-8 max-w-xl border-l border-lime-100/20 pl-4 text-sm leading-[1.8] text-zinc-400 sm:pl-5"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <p>100 darab sorszámozott könyv,<br/>amiben öszeáll a történet.</p>
            <p>Átvétel: <span className="text-lime-100">Dead Drop</span> vagy Posta automata.</p>
          </div>
        </section>

        <section className="mt-10" aria-label="Könyv megszerzése">
          <button
            type="button"
            onClick={handleAcquire}
            disabled={availableCopies.length === 0}
            className="group relative flex min-h-20 w-full items-center justify-between overflow-hidden rounded-sm border-2 border-lime-100/80 bg-zinc-100 px-5 py-5 text-left text-black transition-all duration-300 hover:border-zinc-100 hover:bg-lime-100 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span className="text-lg font-bold uppercase tracking-[0.08em] sm:text-xl">
              <span className="mr-6 rounded-md bg-white border border-zinc-200 text-zinc-800 p-3">
              {String(selectedCopy ?? 67).padStart(3, "0")}
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

        <section className="pt-20">
          <div className="">
            <video
              className="rounded-lg relative left-1/2 mt-0 block w-screen -translate-x-1/2"
              src="/videos/dd3.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              preload="metadata"
            />
            <p className="mt-6 text-right text-[19px] font-semibold italic leading-relaxed text-zinc-100 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Terjesztés: <span className="text-lime-100">Dead Drop [ˈdɛd drɒp]</span>
            </p>
            <p className="text-right text-[19px] font-semibold italic leading-relaxed text-zinc-300 sm:text-base" style={{ fontFamily: "var(--font-mono-tech)" }}>
              Kapsz egy koordinátát, pár fotót<br/>és egy pontos leírást.<br/>48 órád van megtalálni a cuccot.
            </p>

            

            <p className="py-6 text-sm leading-[1.8] text-zinc-400 text-right"
            style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Nem szivatás - KALAND, amiről mesélni fogsz!<br/>Ha 48 órán belül mész és nincs ott - újraküldöm. 
            </p>

            <div className="flex justify-end gap-2 mt-2 mb-6">
              <div className="relative group">
                <Badge className="text-[12px] tracking-widest px-4 py-1 uppercase border border-lime-100/60 bg-transparent text-zinc-300">Budapest</Badge>
                <span className="pointer-events-none absolute bottom-full right-1/2 transform translate-x-1/2 mb-1 hidden whitespace-nowrap rounded bg-black shadow-2xl shadow-gray-950 px-2 py-1 text-sm text-zinc-100 group-hover:block">
                  Aktív
                </span>
              </div>
              <div className="relative group">
                <Badge className="text-[12px] tracking-widest px-4 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">Szeged</Badge>
                <span className="pointer-events-none absolute bottom-full right-1/2 transform translate-x-1/2 mb-1 hidden whitespace-nowrap rounded bg-black shadow-2xl shadow-gray-950 px-2 py-1 text-sm text-zinc-100 group-hover:block">
                  Hamarosan
                </span>
              </div>
              <div className="relative group">
                <Badge className="text-[12px] tracking-widest px-4 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">Pécs</Badge>
                <span className="pointer-events-none absolute bottom-full right-1/2 transform translate-x-1/2 mb-1 hidden whitespace-nowrap rounded bg-black shadow-2xl shadow-gray-950 px-2 py-1 text-sm text-zinc-100 group-hover:block">
                  Hamarosan
                </span>
              </div>
              <div className="relative group">
                <Badge className="text-[12px] tracking-widest px-4 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">London</Badge>
                <span className="pointer-events-none absolute bottom-full right-1/2 transform translate-x-1/2 mb-1 hidden whitespace-nowrap rounded bg-black shadow-2xl shadow-gray-950 px-2 py-1 text-sm text-zinc-100 group-hover:block">
                  Hamarosan
                </span>
              </div>
            </div>

            <p className="py-6 text-sm leading-[1.8] text-zinc-400 text-right" style={{ fontFamily: "var(--font-mono-tech)" }}>
              <Link
                href="/kapcsolat"
                className=" text-zinc-400 text-xs hover:text-lime-100"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                Jelentkezz terjesztőnek! <span className="text-lime-100 text-lg" aria-hidden="true">🐇</span>
              </Link>
            </p>
            
          </div>
        </section>
        
        <section className="mt-12 w-full">
          <div className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-t pt-4 pb-1 border-b border-zinc-800">
            <p
                className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                MIRŐL SZÓL A KÖNYV?
              </p>
          </div>
        </section>


        <section className="mt-6 w-full">
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


    </section>
  )
}

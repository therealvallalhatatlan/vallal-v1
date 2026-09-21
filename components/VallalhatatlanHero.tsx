"use client"

import { Fragment, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import { RefreshCw } from "lucide-react"
import Reviews from "@/components/Reviews"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

const HERO_HEADLINES = [
  "MA KI KELL VINNEM A KUKÁT.",
  "ÖTTŐL VAGYOK.",
  "EZ MOST A VALÓSÁG?",
  "NE KÉRDEZD, KI ÍRTA.",
  "HOL VAN CICA ÚR?!",
  "SPEED- FŰ- BLOODY MARY KOMBÓ.",
  "MINTHA A TESZ-VESZ VÁROSBAN LENNÉK.",
  "A MÁSODIK AJTÓ MÖGÖTT NEM VOLT SEMMI.",
  "VADNYUGAT VOLT, MINT MA A DARKNET.",
  "Hozhatok még egy bloody maryt?",
] as const

const DEFAULT_HEADLINE = "EZ NEM EGY KÖNYV. EZ EGY HÁLÓZAT."

const getRandomHeadline = () => {
  const randomIndex = Math.floor(Math.random() * HERO_HEADLINES.length)
  return HERO_HEADLINES[randomIndex] ?? DEFAULT_HEADLINE
}

type RandomStory = {
  source: "konyv2" | "stories"
  slug: string
  title: string
  text: string
}

export default function VallalhatatlanHero() {
  const [activeDropCount, setActiveDropCount] = useState(17)
  const [physicalSpotCount, setPhysicalSpotCount] = useState<number | null>(null)
  const [virtualSpotCount, setVirtualSpotCount] = useState<number | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<number | null>(null)
  const [headline, setHeadline] = useState(getRandomHeadline)
  const [randomStory, setRandomStory] = useState<RandomStory | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [activeBookTab, setActiveBookTab] = useState<'first' | 'second'>('second')

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

  useEffect(() => {
    let cancelled = false

    async function loadActiveDropCount() {
      try {
        const response = await fetch("/api/public/dead-drops", {
          cache: "no-store",
        })

        const data = await response.json()

        if (!cancelled && response.ok && Array.isArray(data?.activeDrops)) {
          setActiveDropCount(data.activeDrops.length)
        }
      } catch {
        // Keep the existing display value when the public feed is unavailable.
      }
    }

    async function loadRegisteredUsers() {
      try {
        const response = await fetch("/api/public/stats", {
          cache: "no-store",
        })

        const data = await response.json()

        if (!cancelled && response.ok && typeof data?.users === "number") {
          setRegisteredUsers(data.users)
        }
      } catch {
        // Keep the value null when the stats endpoint is unavailable.
      }
    }

    async function loadSpotCounts() {
      try {
        const response = await fetch("/api/matrica/spots", {
          cache: "no-store",
        })

        const data = await response.json()

        if (!cancelled && response.ok && Array.isArray(data?.spots)) {
          setPhysicalSpotCount(
            data.spots.filter(
              (spot: { type?: string }) => spot.type === "physical",
            ).length,
          )

          setVirtualSpotCount(
            data.spots.filter(
              (spot: { type?: string }) => spot.type === "virtual",
            ).length,
          )
        }
      } catch {
        // Keep null state when the spots endpoint is unavailable.
      }
    }

    void loadActiveDropCount()
    void loadRegisteredUsers()
    void loadSpotCounts()
    void loadRandomStory()

    return () => {
      cancelled = true
    }
  }, [])

  const formatHeroCount = (value: number | null) =>
    value === null ? "--" : String(value).padStart(2, "0")

  return (
    <section
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#010101] text-green-200"
      style={{
        paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 fx-stripes opacity-10 mix-blend-plus-darker" />
      <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-6">

        <video
          className="rounded-3xl relative left-1/2 mt-0 block w-screen -translate-x-1/2"
          src="/videos/film2.mp4"
          autoPlay
          muted
          loop
          playsInline
          controls={true}
          preload="metadata"
        />

        <h2
          className={`${montserrat.className} pt-8 text-6xl uppercase leading-tighter text-zinc-100`}
        >
          {headline.split("\n").map((line, index, array) => (
            <Fragment key={line + index}>
              {line}
              {index < array.length - 1 && <br />}
            </Fragment>
          ))}
        </h2>


        <div
          className="mt-8 mb-6 font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <p className="text-zinc-100">KÖNYV / HÁLÓZAT / LABORATÓRIUM</p>

          <p>
            {registeredUsers === null
              ? "— REGISZTRÁLT FELHASZNÁLÓ"
              : `${registeredUsers} REGISZTRÁLT FELHASZNÁLÓ`}
          </p>

          <p>
            <span>{formatHeroCount(physicalSpotCount)}</span>{" "}
            ELREJTETT TÁRGY
          </p>

          <p>
            <span>{formatHeroCount(virtualSpotCount)}</span>{" "}
            ELÉRHETŐ TARTALOM
          </p>

          <p>39 KINYOMTATOTT TÖRTÉNET</p>

          <p>28 ONLINE SZTORI</p>

        <Link
          href="/halozat"
          className="mt-6 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 bg-black/0 px-6 font-mono text-xl font-medium tracking-[0.08em] text-lime-100/80 transition-all hover:border-zinc-100/70 hover:bg-zinc-100/10 hover:text-lime-100"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span>BELÉPÉS A HÁLÓZATBA</span>
          <span aria-hidden="true">→</span>
        </Link>
        </div>

        <section className="w-full" aria-label="Magyarázat">
          <div className="pt-6 font-mono italic leading-relaxed text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
            <div className="py-12 text-xl text-right">
              <p>
                Ennek a könyvnek nincs szerzője,<br />
                nincs címe, és nincs kiadója.
              </p>
              <p>Vállalhatatlan.</p>
            </div>

            {/* Könyv archívum / iratmappa */}
            <div className="relative mt-10">
              {/* Mappa felső pereme */}
              <div className="relative z-10 flex items-end border-b border-zinc-700/80">

                <div className="flex items-end gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveBookTab("first")}
                    className={`rounded-tr-md rounded-tl-md group relative min-w-1/3 border-x border-t px-10 py-2 text-left text-[11px] uppercase tracking-[0.12em] transition-all duration-300 sm:min-w-[142px] sm:text-xs ${
                      activeBookTab === "first"
                        ? "-mb-px border-zinc-600/40 bg-[#000000] text-zinc-100"
                        : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/40 hover:text-zinc-400"
                    }`}
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span className="block text-[8px] tracking-[0.18em] text-zinc-600 group-hover:text-zinc-500">
                      DOSSIER 01
                    </span>
                    <span className={activeBookTab === "first" ? "text-zinc-200" : "line-through decoration-rose-300/50"}>
                      Első könyv
                    </span>
                    {activeBookTab === "first" && (
                      <span className="absolute bottom-0 left-3 right-3 h-px bg-lime-100/50" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveBookTab("second")}
                    className={`rounded-tr-md rounded-tl-md group relative min-w-1/3 border-x border-t px-10 py-2 text-left text-[11px] uppercase tracking-[0.12em] transition-all duration-300 sm:min-w-[154px] sm:text-xs ${
                      activeBookTab === "second"
                        ? "-mb-px border-zinc-600/40 bg-[#000000] text-zinc-100"
                        : "border-transparent bg-transparent text-zinc-600 hover:border-zinc-800 hover:bg-zinc-900/40 hover:text-zinc-400"
                    }`}
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span className="block text-[8px] tracking-[0.18em] text-zinc-600 group-hover:text-zinc-500">
                      DOSSIER 02
                    </span>
                    <span>Második könyv</span>
                    {activeBookTab === "second" && (
                      <span className="absolute bottom-0 left-3 right-3 h-px bg-lime-100/70" />
                    )}
                  </button>
                </div>
              </div>

              {/* A mappa belseje */}
              <div className="rounded-br-md rounded-bl-md relative overflow-hidden border-x border-b border-zinc-700/40 bg-black px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_20px_60px_rgba(0,0,0,0.25)] sm:px-7 sm:py-7">
                <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:repeating-linear-gradient(0deg,transparent,transparent_3px,#fff_4px)]" />
                <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-white/[0.025] to-transparent" />

                {activeBookTab === "first" ? (
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600 not-italic">
                      <span>STATUS / ELFOGYOTT</span>
                      <span>FILE 001</span>
                    </div>

                    <div className="flow-root">
                      
                      
                      <p className="font-mono text-sm leading-[1.75] text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                        <span className="text-3xl leading-none text-zinc-100">000<span className="text-zinc-600">/100</span></span>
                        <br />
                        <span className="text-zinc-400">Az első könyv elfogyott.</span>
                        <br />
                        Ha szeretnél mégis hozzájutni, írj Vállalhatatlannak.
                      </p>
                    </div>

                    <Link
                      href="mailto:therealvallalhatatlan@gmail.com"
                      className="mt-7 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 px-4 py-4 font-mono text-md uppercase tracking-[0.08em] text-lime-100/80 transition-colors hover:border-zinc-100/70 hover:bg-zinc-100/10"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      <span>DOBJ EGY MAILT</span>
                      <span aria-hidden="true">@</span>
                    </Link>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between border-b border-zinc-800/80 pb-3 text-[9px] uppercase tracking-[0.18em] text-zinc-600 not-italic">
                      <span>STATUS / ELÉRHETŐ</span>
                      <span>FILE 002</span>
                    </div>

                    <div className="flow-root">
                      <Image
                        src="/vallalhatatlan2.png"
                        alt="Vállalhatatlan második könyv borító"
                        width={194}
                        height={200}
                        className="float-left mr-5 mb-3 h-auto w-32 rounded-sm border border-zinc-700/80 shadow-[8px_8px_0_rgba(0,0,0,0.22)] sm:w-36"
                      />
                      <p className="font-mono text-sm leading-[1.75] text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                        <span className="text-3xl leading-none text-zinc-100">032<span className="text-zinc-600">/100</span></span>
                        <br />
                        <span className="text-zinc-200">Már csak 32 darab van a második könyvből.</span>
                        <br />
                        68 példány már megtalálta a gazdáját.
                      </p>
                    </div>

                    <Link
                      href="/konyv"
                      className="mt-7 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 px-4 py-4 font-mono text-md uppercase tracking-[0.08em] text-lime-100/80 transition-colors hover:border-zinc-100/70 hover:bg-zinc-100/10"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      <span>A KÖNYV MEGSZERZÉSE</span>
                      <span aria-hidden="true">➤</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <Reviews />


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

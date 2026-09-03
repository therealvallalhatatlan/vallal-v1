"use client"

import { Fragment, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import { RefreshCw } from "lucide-react"
import VHeroChat from "@/components/VHeroChat"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

const HERO_HEADLINES = [
  "STÁZI MINDENT HALL ÉS LÁT.",
  "MA KI KELL VINNED A KUKÁT.",
  "BUZIBÁCSI A KAPUBAN VÁR.",
  "MI A FASZT OLVASTAM MEGINT?",
  "UGORJUNK FASZUL NYULAK!",
  "PIPACSOK KÖZT EGY SZÁL GATYÁBAN.",
  "A TÁRSADALOM SZÉLSŐ- ÉRTÉKEI.",
  "GOMBAÁRUS MAFFIÓZÓ.",
  "POLITOXI- KOMÁN MAGATARTÁS- MINTÁZAT.",
  "NE KÉRDEZD, KI ÍRTA.",
  "SPEED- FŰ- BLOODY MARY KOMBÓ.",
  "EGY MÁSIK DIMENZIÓ.",
  "MINTHA A TESZ-VESZ VÁROSBAN LENNÉK.",
  "VÁLLALHATATLAN ÁLLAPOTBA KERÜLTEM.",
  "A MÁSODIK AJTÓ MÖGÖTT NEM VOLT SEMMI.",
  "FELSZIKRÁZNAK A NEURONJAIM",
  "2002. ZSIBRIK, REHAB",
  "A CSUPASZ PADLÓN ÜLÜNK A TÖKÜRES BEM-RAKPARTI LAKÁSBAN.",
  "VADNYUGAT VOLT, MINT MA A DARKNET.",
  "SIRÁLYOK HANGJA A DUNA FELŐL",
] as const

const DEFAULT_HEADLINE = "EZ NEM EGY KÖNYV."

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
  const [headline, setHeadline] = useState(DEFAULT_HEADLINE)
  const [randomStory, setRandomStory] = useState<RandomStory | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)

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
          className="mt-8 mb-4 font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <p className="text-zinc-100">ARCHÍVUM / HÁLÓZAT / LABORATÓRIUM</p>

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

          <p>67 ONLINE SZTORI</p>
        </div>

        <Link
          href="/halozat"
          className="mt-6 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 bg-black/0 px-6 font-mono text-xl font-medium tracking-[0.08em] text-lime-100/80 transition-colors hover:border-zinc-100 hover:bg-zinc-100/70 hover:text-zinc-900"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span>BELÉPÉS A HÁLÓZATBA</span>
          <span aria-hidden="true">→</span>
        </Link>


        <section className="mt-16 w-full" aria-label="Magyarázat">
          <div className="border-t border-zinc-800 pt-6 font-mono text-[17px] italic leading-relaxed text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
            <p>
              Nincs címe, nincs írója, és nincs kiadója. 
            </p>
   
            <p>
              Ne keresd a könyvesboltokban.
            </p>
            <br/>
            <p>
              Elrejtem, te meg megtalálod.
            </p>
            <p className="mt-4">
              A cél hogy jól érezzük magunkat, visszavegyük a várost, és visszaszerezzük a kontrollt a valóságérzékelésünk felett.
            </p> 

            <div className="flex flex-row gap-4 mt-16">

                <div className="h-40 w-40 overflow-hidden relative bg-zinc-900/0">
                  <video
                    className="rounded-md absolute left-0 top-0 block"
                    src="/videos/konyv2.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls={false}
                    preload="metadata"
                  />
                </div>

                <Link
                  href="/halozat"
                  className="flex gap-6 w-1/2 items-center justify-between rounded-md border-2 border-lime-100/80 bg-black/0 px-6 font-mono text-xl font-medium tracking-[0.08em] text-lime-100/80 transition-colors hover:border-zinc-100 hover:bg-zinc-100/70 hover:text-zinc-900"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span aria-hidden="true">←</span>
                  <span className="flex flex-col items-start">
                    <span className="text-4xl text-lime-100/70">#038</span>
                    <span className="text-sm">EZ A TE PÉLDÁNYOD</span>
                  </span>
                </Link>
            </div>

            

            </div>
        </section>


        <section className="mt-12 w-full" aria-label="Random Sztorik">
          <div
            className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500 border-t border-zinc-800 pt-4"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>Random Sztorik</span>
            <button
              type="button"
              onClick={() => void loadRandomStory()}
              disabled={storyLoading}
              aria-label="Új random sztori"
              title="Új random sztori"
              className="group flex h-7 w-7 items-center justify-center text-zinc-500 transition-colors hover:text-lime-100 disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                strokeWidth={1.5}
                className={`transition-transform duration-500 ${storyLoading ? "animate-spin" : "group-hover:rotate-180"}`}
              />
            </button>
          </div>

          {randomStory ? (
            <article className="border-t border-zinc-800 pt-6">
              <h3
                className={`${montserrat.className} py-2 text-3xl leading-tighter text-zinc-100`}
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {randomStory.title}
              </h3>
              <p
                className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-zinc-300"
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

        <div className="mt-12 w-full">
          <VHeroChat />
        </div>

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
        className="fixed bottom-0 left-0 right-0 z-60 border-t border-zinc-700 bg-zinc-950 px-3 py-6 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        <div className="grid min-h-[94px] grid-cols-3 items-center divide-x divide-zinc-700 rounded-md border border-zinc-700 bg-zinc-950 text-center">
          <Link
            href="/konyv"
            className="flex min-h-[84px] flex-col items-center justify-center px-2 py-4"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-400"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ ARCHIVUM ]
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
            className="flex min-h-[84px] flex-col items-center justify-center bg-zinc-800/90 px-2"
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
            className="flex min-h-[84px] flex-col items-center justify-center px-2"
          >
            <span
              className="text-sm font-bold uppercase text-zinc-400"
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

"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { Montserrat } from "next/font/google"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

export default function VallalhatatlanHero() {
  const [activeDropCount, setActiveDropCount] = useState(17)
  const [physicalSpotCount, setPhysicalSpotCount] = useState<number | null>(null)
  const [virtualSpotCount, setVirtualSpotCount] = useState<number | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<number | null>(null)

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

        if (
          !cancelled &&
          response.ok &&
          typeof data?.users === "number"
        ) {
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

      <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-6">
        <h2
          className={`${montserrat.className} text-6xl uppercase leading-tighter text-zinc-100`}
        >
          A KÖNYV
          <br />
          A KULCS.
          <br />
        </h2>

        <div
          className="mt-8 mb-4 font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <p className="text-zinc-100">ARCHÍVUM / HÁLÓZAT / LABOR</p>

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

        {/* Main Network CTA */}
        <Link
          href="/halozat"
          className="mt-6 flex min-h-16 w-full items-center justify-between rounded-md border-2 border-lime-100/80 bg-black/0 px-6 font-mono text-xl font-medium tracking-[0.08em] text-lime-100/80 transition-colors hover:border-zinc-100 hover:bg-zinc-100/70 hover:text-zinc-900"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span>BELÉPÉS A HÁLÓZATBA</span>

          <span aria-hidden="true">→</span>
        </Link>

        <p
          className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-lime-100/40"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          PUBLIC ACCESS // NODE DISCOVERY
        </p>

        {/* Video: full width, natural aspect-ratio / auto height */}
        <div className="relative mt-12 w-full overflow-hidden">
          <video
            className="block h-auto w-full opacity-100 grayscale"
            src="/videos/vmfi.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(1,1,1,0.16),rgba(1,1,1,0.62))]" />
        </div>

        {/* About / project description */}
        <div
          className="mt-8 border-t border-zinc-800 pb-12 pt-6 font-mono text-md leading-relaxed text-zinc-400"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <p className="mb-4 text-[16px] uppercase tracking-[0.16em] text-lime-200/80">
            Mi a fasz történik velem?
          </p>

          <div className="space-y-4">
            <p>
              Nem tudom mi történt velem abban a sötét erdőben, ahol megszületett Író Úr, és elkezdte visszafejteni az eseményeket.
            </p>

            <p>
              De aznap éjjel valami meghasadt, és Vállalhatatlan szabad lett.
            </p>

            <p>
              Aztán lett belőle egy{" "}
              <Link
                href="/konyv2"
                className="text-lime-200 underline decoration-lime-200/40 underline-offset-4 transition-colors hover:text-lime-100"
              >
                limitált példányszámú könyv
              </Link>
              . A könyv mellé lejátszási listák, QR-kódok, ki nem adott
              anyagok és egy csomó olyan dolog került, aminek nem feltétlenül
              kellett volna egy könyvben lennie.
            </p>

            <p>
              Később kiderült, hogy a könyv csak egy belépési pont. Azóta lett
              belőle egy{" "}
              <Link
                href="/halozat"
                className="text-lime-200 underline decoration-lime-200/40 underline-offset-4 transition-colors hover:text-lime-100"
              >
                hálózat
              </Link>
              , fizikai helyekkel, digitális nyomokkal, dead dropokkal,
              történetekkel és olyan tartalmakkal, amelyek nem feltétlenül
              ugyanott vannak, ahol keresed őket.
            </p>

            <p>
              Van{" "}
              <Link
                href="/reader"
                className="text-lime-200 underline decoration-lime-200/40 underline-offset-4 transition-colors hover:text-lime-100"
              >
                olvasó
              </Link>
              , vannak könyvek, van{" "}
              <Link
                href="/shop"
                className="text-lime-200 underline decoration-lime-200/40 underline-offset-4 transition-colors hover:text-lime-100"
              >
                shop
              </Link>
              , vannak elrejtett dolgok, és vannak olyan részei a rendszernek,
              amelyek még nincsenek teljesen kész.
            </p>

            <p>
              Nem egy startup. Nem egy márkaépítési gyakorlat. És nem egy
              gondosan becsomagolt univerzum, amit valaki a háttérben
              előre megtervezett.
            </p>

            <p className="text-zinc-300">
              Inkább egy folyamatosan épülő archívum arról, mi történik,
              amikor egy könyv kilép a könyvből.
            </p>

            <p>
              Ha szeretnéd, hogy tovább épüljön,{" "}
              <Link
                href="/tamogatas"
                className="text-lime-200 underline decoration-lime-200/40 underline-offset-4 transition-colors hover:text-lime-100"
              >
                támogathatod
              </Link>
              . Ha nem, az is teljesen rendben van. A rendszer ettől még
              működik tovább.
            </p>
          </div>

          <div className="mt-8 border-t border-zinc-900 pt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            SIGNAL ORIGIN: REDDIT
            <br />
            STATUS: STILL RUNNING
          </div>
        </div>
      </div>

      {/* Bottom navigation bar */}
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
            href="/nyitott-muhely"
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
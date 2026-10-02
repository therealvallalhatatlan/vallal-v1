"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Montserrat } from "next/font/google"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

const display = Montserrat({
  subsets: ["latin-ext"],
  weight: ["800"],
  style: ["italic"],
  display: "swap",
})

const PRESET_AMOUNTS = [25000, 50000, 100000, 250000]
const MIN_AMOUNT_HUF = 1000
const MAX_AMOUNT_HUF = 1000000

function formatHuf(value: number) {
  return new Intl.NumberFormat("hu-HU").format(value)
}

export default function LegbelsoKorPage() {
  const [amount, setAmount] = useState(50000)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountLabel = useMemo(() => `${formatHuf(amount)} Ft`, [amount])

  async function handleCheckout() {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch("/api/legbelso-kor/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      })

      const data: { url?: string; error?: string } = await res.json().catch(() => ({}))

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Nem sikerült elindítani a beszállást.")
      }

      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Váratlan hiba történt.")
      setIsLoading(false)
    }
  }

  return (
    <MainContent>
      <div className="min-h-screen bg-black text-zinc-200">
        <section className="mx-auto w-full max-w-5xl px-5 pb-20 sm:px-6">
          <div className="border-t border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 py-3">
              <span
                className="text-[10px] uppercase tracking-[0.24em] text-lime-300/75"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                INTERNAL CHANNEL / LEG BELSŐ KÖR
              </span>
              <span
                className="hidden text-[9px] uppercase tracking-[0.18em] text-zinc-700 sm:block"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                ACCESS: FOUNDERS
              </span>
            </div>

            <div className="grid gap-10 py-12 lg:grid-cols-[1.35fr_.65fr] lg:gap-14 lg:py-16">
              <div>
                <p
                  className="mb-5 text-[10px] uppercase tracking-[0.22em] text-zinc-500"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  50 EMBER / 100 KÖNYV / EGY HÁLÓZAT
                </p>

                <h1
                  className={`${display.className} text-5xl uppercase italic leading-[0.92] tracking-[-0.03em] text-zinc-100 sm:text-7xl lg:text-8xl`}
                >
                  Te már<br />
                  benne vagy.
                </h1>

                <div className="mt-8 max-w-xl space-y-4 text-base leading-7 text-zinc-300 sm:text-lg">
                  <p>
                    Most két dolgot indítunk el: <strong className="text-zinc-100">100 új könyvet</strong> és egy
                    országos dead drop hálózatot.
                  </p>
                  <p>
                    A pénz nagy része már megvan. A hiányzó részt nem támogatásként kérem.
                    <span className="text-lime-200"> Beszállást ajánlok.</span>
                  </p>
                </div>

                <div className="mt-9 inline-flex items-center gap-3 border border-zinc-800 bg-zinc-950 px-3 py-2">
                  <span
                    className="h-2 w-2 animate-pulse rounded-full bg-lime-300"
                    aria-hidden="true"
                  />
                  <span
                    className="text-[10px] uppercase tracking-[0.18em] text-zinc-400"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    AZ INDULÁSHOZ SZÜKSÉGES ÖSSZEG NAGY RÉSZE MÁR MEGVAN
                  </span>
                </div>
              </div>

              <div className="self-end border-l border-zinc-800 pl-6 lg:pl-8">
                <div
                  className="text-[10px] uppercase tracking-[0.22em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  PROJECT TARGETS
                </div>

                <div className="mt-5 space-y-5">
                  <div>
                    <div className="flex items-end justify-between gap-4">
                      <span
                        className="text-sm uppercase tracking-[0.14em] text-zinc-300"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      >
                        KÖNYV
                      </span>
                      <span className="text-3xl font-black tracking-tight text-lime-200">100</span>
                    </div>
                    <div className="mt-2 h-px bg-gradient-to-r from-lime-300/90 via-lime-300/35 to-zinc-900" />
                    <p
                      className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      számozott új példányok
                    </p>
                  </div>

                  <div>
                    <div className="flex items-end justify-between gap-4">
                      <span
                        className="text-sm uppercase tracking-[0.14em] text-zinc-300"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      >
                        DEAD DROP
                      </span>
                      <span className="text-3xl font-black tracking-tight text-lime-200">5</span>
                    </div>
                    <div className="mt-2 h-px bg-gradient-to-r from-lime-300/90 via-lime-300/35 to-zinc-900" />
                    <p
                      className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      induló városi pontok
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-y border-zinc-800 py-8 lg:grid-cols-2">
              <div className="border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ 01 / KÖNYV ]
                </div>
                <div className="mt-4 text-3xl font-black uppercase tracking-tight text-zinc-100">
                  100 példány.
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Az I. könyv bővített kiadása és az újranyomott II. könyv együtt viszi tovább a történetet.
                </p>
              </div>

              <div className="border border-zinc-800 bg-zinc-950/70 p-5 sm:p-6">
                <div
                  className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ 02 / DEAD DROP ]
                </div>
                <div className="mt-4 text-3xl font-black uppercase tracking-tight text-zinc-100">
                  Országos hálózat.
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Városi pontok, nyomok, kihelyezés. A könyvet nem mindig megveszed. Néha levadászod.
                </p>
              </div>
            </div>

            <section className="py-14 sm:py-16">
              <div className="mx-auto max-w-3xl text-center">
                <p
                  className="text-[10px] uppercase tracking-[0.24em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  NEM EGY ÚJABB TÁRGY
                </p>
                <h2
                  className={`${display.className} mt-4 text-4xl uppercase italic leading-none text-zinc-100 sm:text-6xl`}
                >
                  Egy hely ebben
                  <br />
                  a történetben.
                </h2>

                <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
                  {[
                    ["ELSŐKÉNT", "Bizonyos dolgokról ti tudtok majd először."],
                    ["ZÁRTAN", "Lesznek esték és alkalmak, ahová ez a kör kap meghívást."],
                    ["NYOMOT HAGY", "Az indulásnak lesz látható és maradandó nyoma."],
                  ].map(([title, body]) => (
                    <div key={title} className="border border-zinc-800 bg-zinc-950/50 p-5">
                      <div
                        className="text-[10px] uppercase tracking-[0.18em] text-lime-300/75"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      >
                        {title}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border border-zinc-800 bg-zinc-950/80 p-5 sm:p-7">
              <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <div
                    className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ BESZÁLLÁS ]
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold uppercase tracking-tight text-zinc-100">
                    Mennyivel szállsz be?
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    Az összeg teljes egészében az induló könyvnyomás és a dead drop hálózat megvalósítását segíti.
                  </p>
                </div>

                <div className="w-full lg:max-w-md">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PRESET_AMOUNTS.map((preset) => {
                      const selected = amount === preset
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAmount(preset)}
                          className={`min-h-12 border px-3 text-[11px] uppercase tracking-[0.13em] transition ${
                            selected
                              ? "border-lime-200 bg-lime-300/10 text-lime-100"
                              : "border-zinc-800 bg-black text-zinc-500 hover:border-zinc-600 hover:text-zinc-200"
                          }`}
                          style={{ fontFamily: "var(--font-mono-tech)" }}
                        >
                          {formatHuf(preset)} Ft
                        </button>
                      )
                    })}
                  </div>

                  <label className="mt-3 block">
                    <span
                      className="mb-2 block text-[9px] uppercase tracking-[0.16em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      SAJÁT ÖSSZEG / FT
                    </span>
                    <input
                      type="number"
                      min={MIN_AMOUNT_HUF}
                      max={MAX_AMOUNT_HUF}
                      step={1000}
                      value={amount}
                      onChange={(event) => {
                        const next = Number(event.target.value)
                        if (!Number.isFinite(next)) return
                        setAmount(Math.max(MIN_AMOUNT_HUF, Math.min(MAX_AMOUNT_HUF, Math.round(next))))
                      }}
                      className="h-12 w-full border border-zinc-800 bg-black px-3 text-right text-sm text-zinc-100 outline-none focus:border-lime-300/60"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    />
                  </label>

                  {error && (
                    <div
                      className="mt-3 border border-red-500/30 bg-red-500/[0.04] px-3 py-3 text-[10px] leading-relaxed text-red-300"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      [ ERROR ] {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="mt-3 flex min-h-14 w-full items-center justify-between border-2 border-lime-100/80 bg-lime-300/[0.03] px-4 transition hover:border-lime-200 hover:bg-lime-300/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-lime-100">
                      {isLoading ? "ÁTIRÁNYÍTÁS..." : "BESZÁLLOK"}
                    </span>
                    <span className="text-sm text-lime-300">
                      {amountLabel} ↗
                    </span>
                  </button>

                  <p
                    className="mt-3 text-center text-[9px] uppercase tracking-[0.13em] text-zinc-700"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    STRIPE / BIZTONSÁGOS FIZETÉS
                  </p>
                </div>
              </div>
            </section>

            <section className="py-12">
              <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ UTÁNA ]
                  </div>
                  <div className="mt-5 space-y-2 text-sm text-zinc-400">
                    <p>100 könyv elkészül.</p>
                    <p>A hálózat első pontjai felállnak.</p>
                    <p>Jönnek az első zárt alkalmak.</p>
                    <p>És indul a következő fejezet.</p>
                  </div>
                </div>

                <div className="border-l border-zinc-800 pl-5 lg:pl-8">
                  <div
                    className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    [ ALAPÍTÓK ]
                  </div>
                  <p className="mt-5 text-base leading-7 text-zinc-300">
                    Te már ott voltál, amikor még nem lehetett tudni, hogy ebből bármi lesz.
                  </p>
                  <p className="mt-4 text-sm leading-6 text-zinc-500">
                    Ez az oldal azért létezik, mert az indulás első köre nem véletlenül alakult ki.
                  </p>
                </div>
              </div>
            </section>

            <div className="flex flex-col items-start justify-between gap-5 border-t border-zinc-800 pt-6 text-[10px] uppercase tracking-[0.16em] sm:flex-row sm:items-center">
              <span
                className="text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                VÁLLALHATATLAN / LEG BELSŐ KÖR
              </span>
              <Link
                href="/"
                className="text-zinc-600 transition hover:text-lime-200"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                ← VISSZA A HÁLÓZATBA
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </MainContent>
  )
}

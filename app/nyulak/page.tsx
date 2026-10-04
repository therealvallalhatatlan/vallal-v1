"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"
import Image from "next/image"
import { SupportersTicker } from "@/components/supporters/SupportersTicker"
import { SUPPORTER_NAMES } from "@/data/supporters"

type Mode = "monthly" | "once" | "natural" | null

const MEDALLION_THRESHOLD_HUF = 4000
const MAX_MONTHLY_HUF = 30000
const MAX_ONCE_HUF = 100000

const MONTHLY_STEPS = [1000, 2500, 5000, 10000, 20000, 30000]
const ONCE_STEPS = [1000, 2500, 5000, 10000, 15000, 20000, 30000, 50000, 100000]

function formatHuf(value: number) {
  return new Intl.NumberFormat("hu-HU").format(value)
}

function getLevel(mode: "monthly" | "once", amount: number) {
  const hasMedallion = amount > MEDALLION_THRESHOLD_HUF

  if (amount >= 20000) {
    return {
      title: "TELJES BESZÁLLÁS",
      description:
        "Megkapod mindazt, ami a kisebb szinteken jár, plusz az összes könyvet.",
      benefits: [
        "nyúl azonosító",
        "heti speckó írások emailben",
        "könyv",
        "az összes könyv",
        "nyulas medál + nyaklánc",
      ],
      medallion: hasMedallion,
    }
  }

  if (mode === "once" && amount >= 15000) {
    return {
      title: "NAGY UGRÁS",
      description:
        "A havi szintekhez tartozó dolgok mellett megkapod az új kiadású első könyvet is.",
      benefits: [
        "nyúl azonosító",
        "heti speckó írások emailben",
        "könyv",
        "új kiadású első könyv",
        "nyulas medál + nyaklánc",
      ],
      medallion: hasMedallion,
    }
  }

  if (amount >= 10000) {
    return {
      title: "NYÚL + KÖNYV",
      description: "Megkapod a könyvet, és bent vagy a nyúl-hálózatban.",
      benefits: [
        "nyúl azonosító",
        "heti speckó írások emailben",
        "könyv",
        ...(hasMedallion ? ["nyulas medál + nyaklánc"] : []),
      ],
      medallion: hasMedallion,
    }
  }

  if (amount >= 5000) {
    return {
      title: "AKTÍV NYÚL",
      description: "Rendszeresen kapsz valamit, ami máshol nem jelenik meg.",
      benefits: [
        "nyúl azonosító",
        "heti speckó írások emailben",
        ...(hasMedallion ? ["nyulas medál + nyaklánc"] : []),
      ],
      medallion: hasMedallion,
    }
  }

  return {
    title: "NYÚL AZONOSÍTÓ",
    description:
      "Már azzal is beszállsz, hogy ott vagy. Kapsz egy saját nyúl azonosítót.",
    benefits: [
      "nyúl azonosító",
      ...(hasMedallion ? ["nyulas medál + nyaklánc"] : []),
    ],
    medallion: hasMedallion,
  }
}

function getStepValue(values: number[], amount: number) {
  return values.reduce((closest, value) =>
    Math.abs(value - amount) < Math.abs(closest - amount) ? value : closest,
  )
}

export default function NyulakPage() {
  const [mode, setMode] = useState<Mode>(null)
  const [monthlyAmount, setMonthlyAmount] = useState(10000)
  const [onceAmount, setOnceAmount] = useState(15000)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [shareName, setShareName] = useState(false)
  const [naturalChoice, setNaturalChoice] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const amount = mode === "monthly" ? monthlyAmount : onceAmount
  const level = mode && mode !== "natural" ? getLevel(mode, amount) : null

  const monthlyStep = useMemo(
    () => getStepValue(MONTHLY_STEPS, monthlyAmount),
    [monthlyAmount],
  )

  const onceStep = useMemo(
    () => getStepValue(ONCE_STEPS, onceAmount),
    [onceAmount],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
  }

  function handleNaturalSelect(choice: string) {
    setNaturalChoice((current) =>
      current.includes(choice)
        ? current.filter((item) => item !== choice)
        : [...current, choice],
    )
  }

  const fieldClass =
    "h-12 w-full rounded-md border border-zinc-500 bg-black px-3 text-[18px] text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-lime-300/60"

  const smallButtonClass =
    "rounded-md border border-zinc-600 bg-black px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-200"

  return (
    <MainContent>
      <main className="min-h-screen bg-black text-zinc-200">
        <section className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-6">
          <div className="border-b border-zinc-800 pt-0 pb-3">
            <div className="flex items-center justify-between gap-4">
              <span
                className="text-[10px] uppercase tracking-[0.18em] text-zinc-500"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                KOMMUNIKÁCIÓS CSATORNA - NYULAK
              </span>
              <span
                className="shrink-0 text-[9px] tracking-[0.12em] text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                2026.10.04.
              </span>
            </div>
          </div>

          <article className="px-8 py-12 sm:px-12 sm:py-16">
            <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[0.95] tracking-[-0.035em] text-zinc-200 sm:text-6xl">
              Sziasztok nyulak.
            </h1>

            <div className="mt-8 max-w-2xl space-y-5 text-[20px] leading-8 text-zinc-300/80 sm:text-lg">
              <p>
                Ezt a bulit mi tartjuk fent, és rajtunk múlik milyen lesz.
                Sokfélék vagyunk, és más-más a megküzdési stratégiánk.
              </p>

              <p>
                Itt most azért gyűltünk össze, hogy közösen véghez vigyünk
                valamit.
              </p>

              <p>
                Legyen saját nyelvünk, kultúránk, saját mitológiánk, és saját
                hálózatunk, amire építkezhetünk.
              </p>

              <p>
                Lehetőséget kaptunk - és ez egy kísérlet, ne feledjétek
                nyulak.
              </p>
            </div>

            <p
              className="mt-10 text-sm text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <Image
                src="/img/logo.png"
                alt="Vállalhatatlan"
                width={128}
                height={55}
                className="float-right h-auto w-18 object-contain opacity-70"
              />
            </p>
          </article>

          <section className="mt-4 space-y-4">
            <button
              type="button"
              onClick={() => setMode(mode === "monthly" ? null : "monthly")}
              className={[
                "w-full rounded-md border p-5 text-left transition sm:p-6",
                mode === "monthly"
                  ? "border-lime-200/70 bg-lime-300/[0.04]"
                  : "border-zinc-700 bg-black hover:border-zinc-500",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] text-zinc-500"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    01 / HAVONTA
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-zinc-100">
                    Havonta beszállok
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-6 text-zinc-400">
                    Nem kell nagyot mondanod. Egy kisebb havi összegből is
                    folyamatosan életben marad a hálózat.
                  </p>
                </div>
                <span className="text-lg text-lime-300">↗</span>
              </div>
            </button>

            {mode === "monthly" && (
              <section className="border border-zinc-800 p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.18em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      HAVI BESZÁLLÁS
                    </p>
                    <p
                      className="mt-2 text-3xl font-semibold text-lime-200"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {formatHuf(monthlyAmount)} Ft / hó
                    </p>
                  </div>
                  <p
                    className="text-right text-[11px] uppercase tracking-[0.14em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    nincs minimum
                  </p>
                </div>

                <input
                  type="range"
                  min={1000}
                  max={MAX_MONTHLY_HUF}
                  step={500}
                  value={monthlyAmount}
                  onChange={(event) =>
                    setMonthlyAmount(Number(event.target.value))
                  }
                  className="mt-7 w-full accent-lime-300"
                  aria-label="Havi beszállás összege"
                />

                <div className="mt-3 flex items-center justify-between gap-3">
                  {[1000, 5000, 10000, 20000, 30000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMonthlyAmount(value)}
                      className={
                        monthlyStep === value
                          ? "text-[11px] text-lime-200"
                          : "text-[11px] text-zinc-600 hover:text-zinc-300"
                      }
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {formatHuf(value)}
                    </button>
                  ))}
                </div>

                {level && (
                  <div className="mt-7 border-t border-zinc-800 pt-6">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p
                          className="text-[11px] uppercase tracking-[0.18em] text-lime-200"
                          style={{ fontFamily: "var(--font-mono-tech)" }}
                        >
                          {level.title}
                        </p>
                        <p className="mt-2 max-w-xl text-[16px] leading-6 text-zinc-300">
                          {level.description}
                        </p>
                      </div>
                      {level.medallion && (
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                          MEDÁL + NYAKLÁNC
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-2 text-sm text-zinc-400">
                      {level.benefits.map((benefit) => (
                        <div key={benefit}>✓ {benefit}</div>
                      ))}
                    </div>

                    <p className="mt-5 text-[12px] leading-5 text-zinc-600">
                      A nyulas medál + nyaklánc a készlet erejéig, 4 000 Ft
                      feletti pénzügyi beszállásnál jár.
                    </p>
                  </div>
                )}

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Neved / beceneved"
                    className={fieldClass}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={160}
                    autoComplete="email"
                    placeholder="Email"
                    className={fieldClass}
                  />
                </div>

                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shareName}
                    onChange={(event) => setShareName(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-lime-300"
                  />
                  <span className="text-sm leading-6 text-zinc-400">
                    A nevem megjelenhet a Nyulak között.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="mt-6 flex min-h-14 w-full items-center justify-between rounded-md border-2 border-lime-200/80 bg-lime-300/[0.03] px-4 transition hover:bg-lime-300/[0.09]"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span className="text-sm uppercase tracking-[0.18em] text-lime-100">
                    HAVONTA BESZÁLLOK
                  </span>
                  <span className="text-sm text-lime-300">
                    {formatHuf(monthlyAmount)} Ft ↗
                  </span>
                </button>
              </section>
            )}

            <button
              type="button"
              onClick={() => setMode(mode === "once" ? null : "once")}
              className={[
                "w-full rounded-md border p-5 text-left transition sm:p-6",
                mode === "once"
                  ? "border-lime-200/70 bg-lime-300/[0.04]"
                  : "border-zinc-700 bg-black hover:border-zinc-500",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] text-zinc-500"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    02 / EGYSZERI
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-zinc-100">
                    Egyszer tankolok
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-6 text-zinc-400">
                    Egy nagyobb lökés most. A szinthez tartozó dolgokat
                    megkapod, 15 000 Ft felett pedig az új kiadású első
                    könyvet is.
                  </p>
                </div>
                <span className="text-lg text-lime-300">↗</span>
              </div>
            </button>

            {mode === "once" && (
              <section className="border border-zinc-800 p-5 sm:p-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p
                      className="text-[11px] uppercase tracking-[0.18em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      EGYSZERI BESZÁLLÁS
                    </p>
                    <p
                      className="mt-2 text-3xl font-semibold text-lime-200"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {formatHuf(onceAmount)} Ft
                    </p>
                  </div>
                  <p
                    className="text-right text-[11px] uppercase tracking-[0.14em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    te mondod meg
                  </p>
                </div>

                <input
                  type="range"
                  min={1000}
                  max={MAX_ONCE_HUF}
                  step={500}
                  value={onceAmount}
                  onChange={(event) => setOnceAmount(Number(event.target.value))}
                  className="mt-7 w-full accent-lime-300"
                  aria-label="Egyszeri beszállás összege"
                />

                <div className="mt-3 flex flex-wrap gap-4">
                  {[1000, 5000, 10000, 15000, 20000, 50000, 100000].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setOnceAmount(value)}
                        className={
                          onceStep === value
                            ? "text-[11px] text-lime-200"
                            : "text-[11px] text-zinc-600 hover:text-zinc-300"
                        }
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                      >
                        {formatHuf(value)}
                      </button>
                    ),
                  )}
                </div>

                {level && (
                  <div className="mt-7 border-t border-zinc-800 pt-6">
                    <p
                      className="text-[11px] uppercase tracking-[0.18em] text-lime-200"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {level.title}
                    </p>
                    <p className="mt-2 max-w-xl text-[16px] leading-6 text-zinc-300">
                      {level.description}
                    </p>

                    <div className="mt-5 space-y-2 text-sm text-zinc-400">
                      {level.benefits.map((benefit) => (
                        <div key={benefit}>✓ {benefit}</div>
                      ))}
                    </div>

                    <p className="mt-5 text-[12px] leading-5 text-zinc-600">
                      A nyulas medál + nyaklánc a készlet erejéig, 4 000 Ft
                      feletti pénzügyi beszállásnál jár.
                    </p>
                  </div>
                )}

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Neved / beceneved"
                    className={fieldClass}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    maxLength={160}
                    autoComplete="email"
                    placeholder="Email"
                    className={fieldClass}
                  />
                </div>

                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shareName}
                    onChange={(event) => setShareName(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-lime-300"
                  />
                  <span className="text-sm leading-6 text-zinc-400">
                    A nevem megjelenhet a Nyulak között.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  className="mt-6 flex min-h-14 w-full items-center justify-between rounded-md border-2 border-lime-200/80 bg-lime-300/[0.03] px-4 transition hover:bg-lime-300/[0.09]"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  <span className="text-sm uppercase tracking-[0.18em] text-lime-100">
                    EGYSZER TANKOLOK
                  </span>
                  <span className="text-sm text-lime-300">
                    {formatHuf(onceAmount)} Ft ↗
                  </span>
                </button>
              </section>
            )}

            <button
              type="button"
              onClick={() => setMode(mode === "natural" ? null : "natural")}
              className={[
                "w-full rounded-md border p-5 text-left transition sm:p-6",
                mode === "natural"
                  ? "border-lime-200/70 bg-lime-300/[0.04]"
                  : "border-zinc-700 bg-black hover:border-zinc-500",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p
                    className="text-[11px] uppercase tracking-[0.18em] text-zinc-500"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    03 / TERMÉSZETBEN
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-zinc-100">
                    Természetben fizetek
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-6 text-zinc-400">
                    Oszd meg az oldalt, beszélj róla, terjeszd az igét,
                    kommentelj, küldd tovább annak, akinek szerinted itt a
                    helye. Aztán olvass tovább.
                  </p>
                </div>
                <span className="text-lg text-lime-300">↗</span>
              </div>
            </button>

            {mode === "natural" && (
              <section className="border border-zinc-800 p-5 sm:p-7">
                <p
                  className="text-[11px] uppercase tracking-[0.18em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  MIT VÁLLALSZ?
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "Megosztom az oldalt",
                    "Beszélek róla valakinek",
                    "Kommentelek / bekapcsolódom",
                    "Elküldöm egy nyúlnak",
                  ].map((choice) => {
                    const selected = naturalChoice.includes(choice)
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => handleNaturalSelect(choice)}
                        className={[
                          "rounded-md border px-4 py-4 text-left text-sm transition",
                          selected
                            ? "border-lime-200 bg-lime-300/10 text-lime-100"
                            : "border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-200",
                        ].join(" ")}
                      >
                        {selected ? "✓ " : ""}{choice}
                      </button>
                    )
                  })}
                </div>

                <p className="mt-6 text-sm leading-6 text-zinc-500">
                  Nincs minimum. Nincs ellenőrzés. Csak csináld.
                </p>

                <button
                  type="button"
                  onClick={() => setSubmitted(true)}
                  disabled={naturalChoice.length === 0}
                  className="mt-6 flex min-h-14 w-full items-center justify-center rounded-md border-2 border-lime-200/80 bg-lime-300/[0.03] px-4 text-sm uppercase tracking-[0.18em] text-lime-100 transition hover:bg-lime-300/[0.09] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  EZT VÁLLALOM
                </button>
              </section>
            )}
          </section>

          {submitted && (
            <div
              className="mt-8 border border-lime-200/20 bg-lime-300/[0.03] px-4 py-4 text-sm text-lime-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ NYÚL ] Megvan. A fizetési kapcsolatra és az azonosító
              létrehozására a következő körben kötjük rá.
            </div>
          )}

          <div className="mt-8 space-y-3 border-t border-zinc-900 pt-6">
            <p className="text-center text-[10px] uppercase tracking-[0.14em] text-zinc-700">
              4 000 Ft feletti pénzügyi beszállásnál, a készlet erejéig:
              nyulas medál + nyaklánc
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className={smallButtonClass}
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                RABBIT-?
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                minden pénzügyi beszálló kap egy nyúl azonosítót
              </span>
            </div>
          </div>
        </section>

        <section className="w-full max-w-3xl text-left">
          <SupportersTicker names={SUPPORTER_NAMES} label="Nyulak nevei" />
        </section>

        <Footer />
      </main>
    </MainContent>
  )
}

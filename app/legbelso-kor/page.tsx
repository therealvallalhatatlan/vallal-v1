"use client"

import { useState } from "react"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

const MIN_AMOUNT_HUF = 10000
const MAX_AMOUNT_HUF = 1000000
const CURRENT_HUF = 128000
const TARGET_HUF = 255000

function formatHuf(value: number) {
  return new Intl.NumberFormat("hu-HU").format(value)
}

export default function LegbelsoKorPage() {
  const [name, setName] = useState("")
  const [publishName, setPublishName] = useState(false)
  const [message, setMessage] = useState("")
  const [amount, setAmount] = useState(50000)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName) {
      setError("Írd be a neved.")
      return
    }

    if (amount < MIN_AMOUNT_HUF) {
      setError(`A legkisebb beszállás ${formatHuf(MIN_AMOUNT_HUF)} Ft.`)
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/legbelso-kor/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          supporter_name: trimmedName,
          publish_name: publishName,
          message: trimmedMessage,
        }),
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

  const progress = Math.min(100, (CURRENT_HUF / TARGET_HUF) * 100)

  return (
    <MainContent>
      <main className="min-h-screen bg-black text-zinc-200">
        <section className="mx-auto w-full max-w-3xl px-5 pb-20 sm:px-6">
          <div className="border-y border-zinc-800 py-3">
            <div className="flex items-center justify-between gap-4">
              <span
                className="text-[10px] uppercase tracking-[0.18em] text-zinc-500"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                KOMMUNIKÁCIÓS CSATORNA - LEG BELSŐ KÖR
              </span>
              <span
                className="shrink-0 text-[9px] tracking-[0.12em] text-zinc-700"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                2026.10.26 17:10
              </span>
            </div>
          </div>

          <article className="py-12 sm:py-16">
            <p className="text-sm text-zinc-400">Szia,</p>

            <h1 className="mt-3 max-w-2xl text-5xl font-black uppercase italic leading-[0.92] tracking-[-0.04em] text-zinc-100 sm:text-7xl">
              már vártalak.
            </h1>

            <div className="mt-8 max-w-2xl space-y-5 text-[17px] leading-8 text-zinc-300 sm:text-lg">
              <p>
                Kérsz egy kávét vagy sört öö... bocs semmivel nem tudlak megkínálni.
              </p>

              <p className="text-zinc-100">
                De adok valami sokkal jobbat.
              </p>

              <p>
                Alapítói Részvételt ebben a{" "}
                <span className="italic text-lime-200">„nagyon mai, és nagyon eredeti dologban”</span>,
                ami élőben tárul fel a szemünk előtt, és szippant magába tömegeket.
              </p>

              <p>
                Add meg a neved, hogy feltüntethetlek-e a támogatóim között, és írj pár sort ha van kedved.
              </p>

              <p>
                Ha beszállsz, a sikereken is osztozunk. És ezek a sikerek erősen közelednek.
              </p>
            </div>

            <p
              className="mt-10 text-sm text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              V
            </p>
          </article>

          <section className="border-t border-zinc-800 pt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  CÉL
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-100">
                  100 könyv + 5 nagyváros
                </p>
              </div>

              <div className="text-right">
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  JELENLEGI ÁLLAPOT
                </p>
                <p
                  className="mt-2 text-lg font-semibold text-lime-200"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {formatHuf(CURRENT_HUF)} / {formatHuf(TARGET_HUF)} Ft
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden border border-zinc-800 bg-zinc-950">
              <div
                className="h-full bg-lime-300 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </section>

          <form
            onSubmit={handleSubmit}
            className="mt-10 border border-zinc-800 bg-zinc-950/60 p-5 sm:p-7"
          >
            <div className="space-y-6">
              <label className="block">
                <span
                  className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  NEVED
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="Hogy szólíthatlak?"
                  className="h-12 w-full border border-zinc-800 bg-black px-3 text-base text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-lime-300/60"
                />
              </label>

              <label className="flex items-start gap-3 border-t border-zinc-900 pt-5">
                <input
                  type="checkbox"
                  checked={publishName}
                  onChange={(event) => setPublishName(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-lime-300"
                />
                <span className="text-sm leading-6 text-zinc-400">
                  Feltüntethetlek a támogatók között a neveddel.
                </span>
              </label>

              <label className="block border-t border-zinc-900 pt-5">
                <span
                  className="mb-2 block text-[10px] uppercase tracking-[0.18em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  PÁR SOR, HA VAN KEDVED
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={500}
                  rows={5}
                  placeholder="Írhatsz pár sort. Nem kötelező."
                  className="w-full resize-none border border-zinc-800 bg-black px-3 py-3 text-base leading-7 text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-lime-300/60"
                />
              </label>

              <div className="border-t border-zinc-900 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <label
                    className="text-[10px] uppercase tracking-[0.18em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    BESZÁLLÁS / FT
                  </label>
                  <span
                    className="text-xs text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    minimum {formatHuf(MIN_AMOUNT_HUF)} Ft
                  </span>
                </div>

                <div className="mt-2 flex items-center border border-zinc-800 bg-black">
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
                    className="h-14 w-full bg-transparent px-3 text-right text-xl font-semibold text-zinc-100 outline-none"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  />
                  <span
                    className="pr-4 text-xs text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    HUF
                  </span>
                </div>
              </div>

              {error && (
                <div
                  className="border border-red-500/30 bg-red-500/[0.04] px-3 py-3 text-xs leading-5 text-red-300"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  [ ERROR ] {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="flex min-h-14 w-full items-center justify-between border-2 border-lime-200/80 bg-lime-300/[0.03] px-4 transition hover:bg-lime-300/[0.09] hover:shadow-[0_0_30px_rgba(163,230,53,0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                <span className="text-sm uppercase tracking-[0.18em] text-lime-100">
                  {isLoading ? "PILLANAT..." : "BESZÁLLOK"}
                </span>
                <span className="text-sm text-lime-300">
                  {formatHuf(amount)} Ft ↗
                </span>
              </button>
            </div>
          </form>

          <p
            className="mt-4 text-center text-[9px] uppercase tracking-[0.14em] text-zinc-700"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Stripe / biztonságos fizetés
          </p>
        </section>

        <Footer />
      </main>
    </MainContent>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const MESSAGES = [
  "A valóság hajlítható. Üdv a fedélzeten.",
  "Nem véletlen, hogy te találtad meg.",
  "A város tele van jelekkel. Te észrevetted az egyiket.",
  "Nem reklám. Meghívó.",
  "Szia, idegen. Jó helyen jársz.",
  "A rendszer nem tudja, mit keresel. Mi sem mindig.",
]

const DESTINATION = "/fooldal-4"
const REDIRECT_AFTER_MS = 5200

export default function MatricaQrPage() {
  const [message, setMessage] = useState(MESSAGES[0])
  const [seconds, setSeconds] = useState(5)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])
    setReady(true)

    const startedAt = Date.now()
    const tick = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((REDIRECT_AFTER_MS - (Date.now() - startedAt)) / 1000),
      )
      setSeconds(remaining)
    }, 200)

    const redirectTimer = window.setTimeout(() => {
      window.location.assign(DESTINATION)
    }, REDIRECT_AFTER_MS)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(redirectTimer)
    }
  }, [])

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-black px-4 py-8 text-lime-300 selection:bg-lime-300 selection:text-black">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(163,230,53,0.045) 0 1px, transparent 1px 4px)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(30,50,12,0.18) 0%, rgba(0,0,0,0.88) 75%)",
        }}
      />

      <section className="relative z-10 mx-auto w-full max-w-xl border border-lime-400/25 bg-black/85 p-5 font-mono shadow-[0_0_60px_rgba(163,230,53,0.06)] sm:p-8">
        <header className="mb-10 flex items-center justify-between gap-4 border-b border-lime-400/15 pb-3 text-[10px] uppercase tracking-[0.22em] text-lime-500/65 sm:text-xs">
          <span>V-INT // BEJÖVŐ JEL</span>
          <span className="shrink-0">MAT-QR / 001</span>
        </header>

        <div className="min-h-[260px]">
          <p className="mb-5 text-xs uppercase tracking-[0.18em] text-lime-500/65">
            &gt; kapcsolat felépítése
          </p>
          <div className="space-y-2 text-sm leading-6 text-lime-500/80 sm:text-base">
            <p className={ready ? "animate-[fadeIn_0.45s_ease-out_both]" : ""}>
              &gt; jel fogadva
            </p>
            <p className={ready ? "animate-[fadeIn_0.7s_ease-out_both]" : ""}>
              &gt; a valóság ellenőrzése kihagyva
            </p>
            <p className={ready ? "animate-[fadeIn_0.9s_ease-out_both]" : ""}>
              &gt; vendég azonosítása: nem szükséges
            </p>
          </div>

          <div className="mt-9 animate-[fadeIn_0.8s_ease-out_both]">
            <p className="text-xs uppercase tracking-[0.18em] text-lime-500/75">
              ÜZENET V.-TŐL
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-lime-200 sm:text-4xl">
              TE MEGTALÁLTAD.
            </h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-lime-100/80 sm:text-base">
              {message}
            </p>
            <p className="mt-5 text-xs leading-6 text-lime-500/60">
              Nem mindenki veszi észre a jeleket. Te most észrevettél egyet.
            </p>
          </div>
        </div>

        <div className="mt-7 border-t border-lime-400/15 pt-5">
          <Link
            href={DESTINATION}
            className="flex min-h-12 w-full items-center justify-center border border-lime-300/55 bg-lime-300/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-lime-200 transition hover:border-lime-200 hover:bg-lime-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-200 sm:text-sm"
          >
            Belépek a hálózatba <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
          <div className="mt-4 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.12em] text-lime-500/50 sm:text-xs">
            <span>Automatikus belépés</span>
            <span aria-live="polite">{seconds > 0 ? `${seconds} mp` : "INDULÁS..."}</span>
          </div>
          <div className="mt-3 h-px overflow-hidden bg-lime-400/10">
            <div
              aria-hidden="true"
              className="h-full origin-left bg-lime-300/65 transition-transform duration-200"
              style={{ transform: `scaleX(${Math.max(0, (REDIRECT_AFTER_MS - (5 - seconds) * 1000) / REDIRECT_AFTER_MS)})` }}
            />
          </div>
        </div>

        <footer className="mt-8 border-t border-lime-400/10 pt-3 text-[9px] uppercase tracking-[0.18em] text-lime-500/30">
          V-INT // DEAD DROP PROTOCOL // ONLINE
        </footer>
      </section>
    </main>
  )
}

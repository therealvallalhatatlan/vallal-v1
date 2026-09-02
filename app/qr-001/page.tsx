"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

const MESSAGES = [
  'A valóság hajlítható. Üdv a fedélzeten.',
  'Nem véletlen, hogy te találtad meg.',
  'Tarts velem testvérem.',
  'Jól csinálod, és büszke vagyok rád.',
]

const SIGNAL_USERNAME = "vallalhatatlan.01"

function createDropId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const values = new Uint32Array(6)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => chars[value % chars.length]).join("")
}

export default function Qr001Page() {
  const [dropId, setDropId] = useState("------")
  const [message, setMessage] = useState("")
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    setDropId(createDropId())
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

    const timers = [
      window.setTimeout(() => setPhase(1), 650),
      window.setTimeout(() => setPhase(2), 1500),
      window.setTimeout(() => setPhase(3), 2350),
      window.setTimeout(() => setPhase(4), 3250),
    ]

    return () => timers.forEach(window.clearTimeout)
  }, [])

  const signalUrl = useMemo(() => "https://signal.me", [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-lime-300">
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
            "radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      <section className="content-above mx-auto flex min-h-screen w-full max-w-3xl items-center px-5 py-12 sm:px-8">
        <div className="w-full border border-lime-400/25 bg-black/80 p-5 font-mono shadow-[0_0_50px_rgba(163,230,53,0.05)] sm:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-lime-400/15 pb-3 text-[10px] uppercase tracking-[0.28em] text-lime-500/60 sm:text-xs">
            <span>V // UNAUTHORIZED ACCESS</span>
            <span>QR-001</span>
          </div>

          <div className="min-h-[380px] text-sm leading-7 sm:text-base sm:leading-8">
            {phase >= 0 && (
              <p className="animate-[fadeIn_0.45s_ease-out_both] text-lime-500/70">
                &gt; establishing connection...
              </p>
            )}

            {phase >= 1 && (
              <p className="mt-2 animate-[fadeIn_0.45s_ease-out_both] text-lime-500/70">
                &gt; signal acquired
              </p>
            )}

            {phase >= 2 && (
              <p className="mt-2 animate-[fadeIn_0.45s_ease-out_both] text-lime-500/70">
                &gt; decrypting dead drop<span className="cursor">_</span>
              </p>
            )}

            {phase >= 3 && (
              <div className="mt-8 animate-[fadeIn_0.65s_ease-out_both]">
                <div className="text-xl font-semibold tracking-[0.16em] text-lime-300 sm:text-2xl">
                  DEAD DROP {dropId}
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.14em] text-lime-500/70 sm:text-sm">
                  Megtalálva ekkor: 2026. 08.02. 07:43
                </div>
              </div>
            )}

            {phase >= 4 && (
              <div className="mt-9 animate-[fadeIn_0.8s_ease-out_both]">
                <p className="text-lime-500/75">Vállalhatatlan itt járt, és ezt üzeni neked:</p>
                <blockquote className="mt-5 border-l border-lime-400/35 pl-4 text-lg leading-8 text-lime-200 sm:pl-5 sm:text-xl">
                  &quot;{message}&quot;
                </blockquote>
                <div className="mt-3 text-sm uppercase tracking-[0.22em] text-lime-500/70">
                  V.
                </div>

                <div className="mt-12 grid gap-3 border-t border-lime-400/15 pt-5 sm:grid-cols-2">
                  <Link
                    href="https://www.vallalhatatlan.online/"
                    className="group border border-lime-400/25 px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-lime-300 transition hover:border-lime-300 hover:bg-lime-300/10 hover:text-lime-100"
                  >
                    &gt; ENTER VÁLLALHATATLAN
                  </Link>

                  <a
                    href={signalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border border-lime-400/25 px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-lime-300 transition hover:border-lime-300 hover:bg-lime-300/10 hover:text-lime-100"
                  >
                    &gt; SIGNAL / {SIGNAL_USERNAME}
                  </a>
                </div>

                <p className="mt-5 text-[10px] leading-5 tracking-[0.12em] text-lime-500/45">
                  A rendszer minden megnyitáskor új üzenetet generál.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-lime-400/10 pt-3 text-[9px] uppercase tracking-[0.2em] text-lime-500/30">
            V-INT // DEAD DROP PROTOCOL // ONLINE
          </div>
        </div>
      </section>
    </main>
  )
}

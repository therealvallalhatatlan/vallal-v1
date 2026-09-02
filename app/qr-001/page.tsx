"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import VHSTrackingLines from "@/components/VHSTrackingLines"

const MESSAGES = [
  "A valóság hajlítható. Üdv a fedélzeten.",
  "Nem véletlen, hogy te találtad meg.",
  "Tarts velem testvérem.",
  "Jól csinálod, és büszke vagyok rád.",
]

const SIGNAL_URL =
  "https://signal.me/#eu/ZyslIrELnciM82jQeo3L_WHrgE5wCxPl478bJ6diwOxAsksYK0dDj6NyWZMtNeak"

function createDropId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const values = new Uint32Array(6)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => chars[value % chars.length]).join("")
}

function formatTimestamp(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date)
}

export default function Qr001Page() {
  const [dropId, setDropId] = useState("------")
  const [timestamp, setTimestamp] = useState("")
  const [message, setMessage] = useState("")
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    setDropId(createDropId())
    setTimestamp(formatTimestamp(new Date()))
    setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)])

    const timers = [
      window.setTimeout(() => setPhase(1), 500),
      window.setTimeout(() => setPhase(2), 1250),
      window.setTimeout(() => setPhase(3), 2050),
      window.setTimeout(() => setPhase(4), 2850),
      window.setTimeout(() => setPhase(5), 3750),
    ]

    const clock = window.setInterval(() => {
      setTimestamp(formatTimestamp(new Date()))
    }, 1000)

    return () => {
      timers.forEach(window.clearTimeout)
      window.clearInterval(clock)
    }
  }, [])

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-black text-green-200"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
        fontFamily: "var(--font-mono-tech)",
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-40 fx-stripes"
        aria-hidden="true"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            rgba(0,0,0,.28) 0 1px,
            rgba(0,0,0,0) 3px 4px
          )`,
          opacity: 0.55,
          mixBlendMode: "multiply",
        }}
      />

      <div className="pointer-events-none fixed inset-0 z-50 fx-vhs" aria-hidden="true" />
      <VHSTrackingLines />

      <div className="relative z-20 min-h-screen px-6 pb-12 pt-6 sm:px-8 sm:pt-8">
        <header className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-lime-100/75 sm:text-xs">
          <span>DROP {dropId}</span>
          <time>{timestamp || "----. --. --. --:--"}</time>
        </header>

        <section className="mt-10 max-w-3xl text-sm leading-[1.9] sm:mt-14 sm:text-base">
          {phase >= 0 && (
            <p className="animate-[fadeIn_0.45s_ease-out_both] text-lime-100/65">
              &gt; establishing connection...
            </p>
          )}

          {phase >= 1 && (
            <p
              className="animate-[fadeIn_0.45s_ease-out_both] mt-1 text-lime-100/65"
              style={{ animationDelay: "80ms" }}
            >
              &gt; signal acquired
            </p>
          )}

          {phase >= 2 && (
            <p
              className="animate-[fadeIn_0.45s_ease-out_both] mt-1 text-lime-100/65"
              style={{ animationDelay: "80ms" }}
            >
              &gt; decrypting dead drop<span className="cursor">_</span>
            </p>
          )}

          {phase >= 3 && (
            <div
              className="mt-8 animate-[fadeIn_0.5s_ease-out_both]"
              style={{ animationDelay: "100ms" }}
            >
              <p className="font-semibold tracking-[0.08em] text-lime-100">
                &gt;DEAD DROP {dropId}
              </p>
            </div>
          )}

          {phase >= 4 && (
            <div
              className="mt-1 animate-[fadeIn_0.55s_ease-out_both]"
              style={{ animationDelay: "100ms" }}
            >
              <p className="text-lime-100/75">
                &gt;Megtalálva ekkor: {timestamp || "----. --. --. --:--"}
              </p>
              <p className="mt-1 text-lime-100/75">
                &gt;Vállalhatatlan itt járt, nem sokkal előtted.
              </p>
              <p className="mt-5 max-w-2xl text-lime-100/90">
                &gt;&quot;{message}&quot;
              </p>
              <p className="mt-1 text-lime-100/55">&gt;V.</p>
            </div>
          )}

          {phase >= 5 && (
            <div
              className="mt-12 flex flex-col gap-4 animate-[fadeIn_0.55s_ease-out_both] sm:flex-row sm:items-center"
              style={{ animationDelay: "120ms" }}
            >
              <Link
                href="https://www.vallalhatatlan.online/"
                className="inline-flex w-fit items-center text-xs uppercase tracking-[0.18em] text-lime-100/80 transition-colors hover:text-lime-100"
              >
                &gt; ENTER VÁLL.
              </Link>

              <a
                href={SIGNAL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center text-xs uppercase tracking-[0.18em] text-lime-100/80 transition-colors hover:text-lime-100"
              >
                &gt; SIGNAL / vallalhatatlan.01
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

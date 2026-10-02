"use client"

import { useEffect } from "react"
import Link from "next/link"
import confetti from "canvas-confetti"
import MainContent from "@/components/MainContent"
import Footer from "@/components/Footer"

const CHEERS_SFX_SRC = "/audio/cheers2.wav"

export default function LegbelsoKorKoszonomPage() {
  useEffect(() => {
    const playCelebration = () => {
      void confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 32,
        scalar: 0.9,
        origin: { y: 0.65 },
      })

      window.setTimeout(() => {
        void confetti({
          particleCount: 55,
          angle: 60,
          spread: 55,
          startVelocity: 26,
          origin: { x: 0, y: 0.72 },
        })
      }, 160)

      window.setTimeout(() => {
        void confetti({
          particleCount: 55,
          angle: 120,
          spread: 55,
          startVelocity: 26,
          origin: { x: 1, y: 0.72 },
        })
      }, 260)

      const audio = new Audio(CHEERS_SFX_SRC)
      audio.volume = 0.9
      void audio.play().catch(() => {
        window.addEventListener(
          "pointerdown",
          () => {
            void audio.play().catch(() => undefined)
          },
          { once: true, passive: true },
        )
      })

      if ("vibrate" in navigator) {
        navigator.vibrate([45, 35, 90])
      }
    }

    const raf = window.requestAnimationFrame(playCelebration)
    return () => window.cancelAnimationFrame(raf)
  }, [])

  return (
    <MainContent>
      <main className="min-h-screen bg-black text-zinc-200">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center px-5 py-16 sm:px-6">
          <div className="w-full border-y border-zinc-800 py-10 sm:py-14">
            <div
              className="text-[10px] uppercase tracking-[0.22em] text-lime-300/75"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              KOMMUNIKÁCIÓS CSATORNA / VISSZAIGAZOLÁS
            </div>

            <h1 className="mt-5 text-6xl font-black uppercase italic leading-[0.9] tracking-[-0.04em] text-zinc-100 sm:text-8xl">
              Rendben.
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-300">
              Köszönöm. Most már tényleg együtt csináljuk.
            </p>

            <div className="mt-10 border-t border-zinc-900 pt-6">
              <p className="text-base leading-7 text-zinc-500">
                A beszállásod beérkezett. És igen, ezt most megünnepeljük.
              </p>
            </div>

            <Link
              href="/"
              className="mt-8 inline-flex min-h-12 items-center justify-between gap-10 border border-zinc-800 px-4 text-[11px] uppercase tracking-[0.16em] text-zinc-500 transition hover:border-lime-300/50 hover:text-lime-200"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              VISSZA A HÁLÓZATBA ↗
            </Link>
          </div>
        </section>

        <Footer />
      </main>
    </MainContent>
  )
}

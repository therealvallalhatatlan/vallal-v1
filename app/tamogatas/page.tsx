'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { SupportersTicker } from '@/components/supporters/SupportersTicker'
import { SUPPORTER_NAMES } from '@/data/supporters'

const MIN_AMOUNT_HUF = 1000
const MAX_AMOUNT_HUF = 1000000
const SLIDER_STEP_HUF = 1000
const DEFAULT_AMOUNT_HUF = 5000
const CHEERS_SFX_SRC = '/audio/cheers.wav'
const CHEERS2_SFX_SRC = '/audio/cheers2.wav'

function formatHuf(value: number) {
  return `${new Intl.NumberFormat('hu-HU').format(value)} Ft`
}

export default function TamogatasPage() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT_HUF)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cheersAudioRef = useRef<HTMLAudioElement | null>(null)
  const cheers2AudioRef = useRef<HTMLAudioElement | null>(null)
  const didPlayCheersRef = useRef(false)

  useEffect(() => {
    const cheers = new Audio(CHEERS_SFX_SRC)
    cheers.preload = 'auto'
    cheers.volume = 0.95
    cheersAudioRef.current = cheers

    const cheers2 = new Audio(CHEERS2_SFX_SRC)
    cheers2.preload = 'auto'
    cheers2.volume = 0.95
    cheers2AudioRef.current = cheers2

    const playCheersOnFirstInteraction = () => {
      if (didPlayCheersRef.current) return
      didPlayCheersRef.current = true

      const current = cheersAudioRef.current
      if (!current) return

      current.currentTime = 0
      void current.play().catch(() => {
        // Ignore blocked playback attempts.
      })

      window.removeEventListener('pointerdown', playCheersOnFirstInteraction)
      window.removeEventListener('keydown', playCheersOnFirstInteraction)
    }

    window.addEventListener('pointerdown', playCheersOnFirstInteraction, { passive: true })
    window.addEventListener('keydown', playCheersOnFirstInteraction)

    return () => {
      window.removeEventListener('pointerdown', playCheersOnFirstInteraction)
      window.removeEventListener('keydown', playCheersOnFirstInteraction)
      cheers.pause()
      cheers.currentTime = 0
      cheersAudioRef.current = null
      cheers2.pause()
      cheers2.currentTime = 0
      cheers2AudioRef.current = null
    }
  }, [])

  const handleSliderPointerDown = () => {
    const cheers2 = cheers2AudioRef.current
    if (!cheers2) return

    cheers2.currentTime = 0
    void cheers2.play().catch(() => {
      // Ignore blocked playback attempts.
    })
  }

  const progress = useMemo(() => {
    const ratio = (amount - MIN_AMOUNT_HUF) / (MAX_AMOUNT_HUF - MIN_AMOUNT_HUF)
    return Math.min(100, Math.max(0, ratio * 100))
  }, [amount])

  const setAmountSafe = (nextValue: number) => {
    const clamped = Math.max(MIN_AMOUNT_HUF, Math.min(MAX_AMOUNT_HUF, Math.round(nextValue)))
    setAmount(clamped)
  }

  const handleSubmit = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const res = await fetch('/api/tamogatas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || 'Nem sikerult letrehozni a fizetest.')
      }

      if (!data?.url) {
        throw new Error('Hianyzik a Stripe atiranyitasi URL.')
      }

      window.location.href = data.url
    } catch (err: any) {
      setError(err?.message || 'Varatlan hiba tortent.')
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080c] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(87,255,143,0.14),transparent_40%),radial-gradient(circle_at_78%_15%,rgba(61,225,255,0.1),transparent_36%),radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.8),rgba(0,0,0,1))]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_3px]" />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-14 pt-12 sm:px-7">
        <SupportersTicker names={SUPPORTER_NAMES} label="Tamogatok nevei" />

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="border border-zinc-700/60 bg-black/45 p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-400">01 :: SHOP CHANNEL</p>
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">Termekek a /shop alatt</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300/85">
              Polo, taska, konyv es egyeb cuccok. Ha targyi tamogatassal lepnel be, itt tudsz vasarolni.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-flex border border-emerald-400/55 bg-emerald-400/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-200 transition hover:bg-emerald-400/20 hover:text-emerald-100"
            >
              [ SHOP MEGNYITASA ]
            </Link>
          </article>

          <article className="border border-zinc-700/60 bg-black/45 p-5 sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-400">02 :: DIRECT FUNDING</p>
            <h2 className="mt-3 text-xl font-semibold text-zinc-100">Tetszoleges osszeg Stripe fizetessel</h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-400">
                  <span>Tamogatasi osszeg</span>
                  <span className="text-emerald-300">{formatHuf(amount)}</span>
                </div>
                <input
                  type="range"
                  min={MIN_AMOUNT_HUF}
                  max={MAX_AMOUNT_HUF}
                  step={SLIDER_STEP_HUF}
                  value={amount}
                  onPointerDown={handleSliderPointerDown}
                  onChange={(event) => setAmountSafe(Number(event.target.value))}
                  className="tamogatas-range h-2 w-full cursor-pointer accent-emerald-300"
                />
                <div className="mt-2 h-1 w-full overflow-hidden bg-zinc-800">
                  <div className="h-full bg-gradient-to-r from-emerald-400/70 to-cyan-300/60" style={{ width: `${progress}%` }} />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-zinc-400">Kezi osszeg (Ft)</span>
                <input
                  type="number"
                  min={MIN_AMOUNT_HUF}
                  max={MAX_AMOUNT_HUF}
                  step={SLIDER_STEP_HUF}
                  value={amount}
                  onChange={(event) => setAmountSafe(Number(event.target.value || MIN_AMOUNT_HUF))}
                  className="w-full border border-zinc-700 bg-black px-3 py-2 text-zinc-100 outline-none transition focus:border-emerald-400/70"
                />
              </label>
            </div>

            {error && <p className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="mt-5 w-full border border-emerald-400/65 bg-emerald-400/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-emerald-200 transition hover:bg-emerald-400/20 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '[ ATIRANYITAS STRIPE... ]' : '[ STRIPE FIZETES INDITASA ]'}
            </button>
          </article>
        </div>
      </section>
    </main>
  )
}

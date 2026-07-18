'use client'

import { motion } from 'framer-motion'

interface SupportersTickerProps {
  names: string[]
  label?: string
  speedSeconds?: number
  className?: string
}

export function SupportersTicker({
  names,
  label = 'Tamogatok',
  speedSeconds = 38,
  className,
}: SupportersTickerProps) {
  if (!names.length) return null

  return (
    <section className={`relative overflow-hidden border border-zinc-700/0 bg-black/0 p-3 sm:p-4 ${className ?? ''}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#07080c] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#07080c] to-transparent" />

      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300/80">{label}</p>

      <div className="overflow-hidden">
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: speedSeconds, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex shrink-0 items-center gap-8 pr-8">
            {names.map((name, index) => (
              <span key={`a-${name}-${index}`} className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-300/90">
                {name}
              </span>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden>
            {names.map((name, index) => (
              <span key={`b-${name}-${index}`} className="font-mono text-md uppercase tracking-[0.22em] text-zinc-300/90">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

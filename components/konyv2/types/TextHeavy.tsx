'use client'

import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: text-heavy
 * A focused, dark, long-form reading layout.
 * Owns its own background, typography, and spacing — no external layout imposed.
 */
export default function TextHeavy({ title, content }: Konyv2PageProps) {
  return (
    <main className="min-h-screen bg-[#0c0c0c] text-white">
      <article className="mx-auto max-w-[680px] px-5 py-24">
        <h1 className="mb-10 text-3xl font-bold leading-tight tracking-tight">{title}</h1>
        {content ? (
          <div className="whitespace-pre-wrap text-[1.05rem] leading-[1.85] text-white/80">
            {content}
          </div>
        ) : (
          <p className="italic text-white/30">Tartalom hamarosan…</p>
        )}
      </article>
    </main>
  )
}

'use client'

import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: glitch-gallery
 * A monospaced, high-contrast, broken-aesthetic layout.
 * Replace internals freely — this is a placeholder shell.
 */
export default function GlitchGallery({ title, content }: Konyv2PageProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="relative z-10 px-4 py-20">
        <h1 className="mb-12 text-center font-mono text-2xl uppercase tracking-[0.5em] text-white/70">
          {title}
        </h1>
        {content ? (
          <pre className="mx-auto max-w-2xl whitespace-pre-wrap font-mono text-sm leading-relaxed text-white/50">
            {content}
          </pre>
        ) : (
          <p className="text-center font-mono text-sm text-white/20">{'[ adat betöltése... ]'}</p>
        )}
      </div>
    </main>
  )
}

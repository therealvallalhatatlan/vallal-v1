'use client'

import { useEffect, useRef, useState } from 'react'
import type { Konyv3Entry } from '@/data/konyv3Bejegyzesek'
import { formatKonyv3Date } from '@/data/konyv3Bejegyzesek'
import { ReadingFooter } from '@/components/konyv3/ReadingFooter'
import { VideoIntro } from '@/components/konyv3/VideoIntro'

interface Konyv3ExperienceProps {
  entry: Konyv3Entry
  content: string | null
}

export default function Konyv3Experience({ entry, content }: Konyv3ExperienceProps) {
  const [showArticle, setShowArticle] = useState(false)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (showArticle) {
      articleRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [showArticle])

  if (!showArticle) {
    return (
      <VideoIntro
        src={entry.videoSrc}
        posterSrc={entry.posterSrc}
        title={entry.title}
        onContinue={() => setShowArticle(true)}
      />
    )
  }

  const paragraphs = (content ?? '')
    .split(/\r?\n\s*\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <main className="min-h-[100svh] bg-[#0c0c0c] text-[#f4f4f2]">
      <article
        ref={articleRef}
        tabIndex={-1}
        aria-labelledby="konyv3-entry-title"
        className="mx-auto max-w-[680px] px-5 pb-16 pt-12 outline-none sm:px-8 sm:pb-20 sm:pt-20"
      >
        <header className="mb-9 border-b border-white/10 pb-7 sm:mb-11 sm:pb-9">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.17em] text-lime-200/70">
            {formatKonyv3Date(entry.date)} <span aria-hidden="true">·</span> Vállalhatatlan III.
          </p>
          <h1
            id="konyv3-entry-title"
            className="break-words text-[2rem] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-[2.75rem] sm:leading-[1.08]"
          >
            {entry.title}
          </h1>
        </header>

        {paragraphs.length > 0 ? (
          <div className="space-y-6 text-[1.125rem] leading-[1.85] text-white/80 sm:text-[1.1875rem] sm:leading-[1.9]">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line [overflow-wrap:anywhere]">
                {paragraph}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-base italic leading-relaxed text-white/40">
            A bejegyzés szövege hamarosan érkezik.
          </p>
        )}

        <ReadingFooter links={entry.links} />
      </article>
    </main>
  )
}

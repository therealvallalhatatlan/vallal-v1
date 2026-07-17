'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: szamuraj
 * Digital installation version with entry gate, audio layers, and story lock interaction.
 */
const DEFAULT_BG_NOISE = '/audio/bg-cybercafe.wav'
const DEFAULT_ACID_LOOP = '/audio/acid-climax.wav'
const DEFAULT_CLICK_SFX = '/audio/ui-click.wav'
const DEFAULT_GLITCH_SFX = '/audio/sfx-glitch.wav'
const DEFAULT_LIGHTER_SFX = '/audio/sfx-lighter.wav'
const DEFAULT_TRAFFIC_SFX = '/audio/sfx-traffic.wav'

const INTERAKCIO_QUESTIONS = [
  'Mennyi ido alatt puhul meg egy galamb?',
  'Kinyomtatnad nekem ezt a halotti bizonyitvanyt?',
  'Alairnad ezt az okiratot?',
  'Tudnal rakni erre egy pecsetet?',
  'Ekitek van?',
  'Le tudod masolni ezt a lakatkulcsot A4-ben?',
]
const CUE_CENTER_TOLERANCE_RATIO = 0.18

type CueType = 'lighter' | 'horn' | 'acid' | 'internetezni'
type StorySection = 'before-lock' | 'after-lock'

interface StoryParagraph {
  id: string
  section: StorySection
  text: string
  cueType: CueType | null
}

const CUE_PHRASES: Record<CueType, string[]> = {
  lighter: ['egy cigaretta landol'],
  horn: ['nincs idom tiltakozni'],
  acid: ['dolgozik bennem az lsd', 'pixi a nappali muszakos'],
  internetezni: ['fenymasolni szeretnek'],
}

interface SplitStory {
  beforeLock: StoryParagraph[]
  afterLock: StoryParagraph[]
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickCueType(line: string): CueType | null {
  const normalized = normalizeForMatch(line)

  const cueMatches = Object.entries(CUE_PHRASES).find(([cueType, phrase]) => {
    return phrase.some((candidate) => normalized.includes(normalizeForMatch(candidate)))
  })

  if (cueMatches) return cueMatches[0] as CueType
  return null
}

function toStoryParagraphs(lines: string[], section: StorySection): StoryParagraph[] {
  const paragraphs: StoryParagraph[] = []

  lines.forEach((text, paragraphIndex) => {
    const subLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    subLines.forEach((lineText, lineIndex) => {
      const cueType = pickCueType(lineText)

      paragraphs.push({
        id: `${section}-${paragraphIndex}-${lineIndex}`,
        section,
        text: lineText,
        cueType,
      })
    })
  })

  return paragraphs
}

function splitStoryContent(content: string | null): SplitStory {
  if (!content) return { beforeLock: [], afterLock: [] }

  const paragraphs = content
    // Support both LF and CRLF line endings when splitting paragraphs.
    .split(/\r?\n\s*\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (paragraphs.length <= 2) {
    return { beforeLock: toStoryParagraphs(paragraphs, 'before-lock'), afterLock: [] }
  }

  const markerIndex = paragraphs.findIndex((paragraph) => {
    const normalized = paragraph.toLowerCase()
    return normalized.includes('mercedes') || normalized.includes('20 000') || normalized.includes('20000')
  })

  if (markerIndex >= 0 && markerIndex < paragraphs.length - 1) {
    return {
      beforeLock: toStoryParagraphs(paragraphs.slice(0, markerIndex + 1), 'before-lock'),
      afterLock: toStoryParagraphs(paragraphs.slice(markerIndex + 1), 'after-lock'),
    }
  }

  const fallbackCut = Math.max(1, Math.floor(paragraphs.length * 0.7))
  return {
    beforeLock: toStoryParagraphs(paragraphs.slice(0, fallbackCut), 'before-lock'),
    afterLock: toStoryParagraphs(paragraphs.slice(fallbackCut), 'after-lock'),
  }
}

async function safePlay(audio: HTMLAudioElement | null) {
  if (!audio) return
  try {
    await audio.play()
  } catch {
    // Ignore blocked playback attempts.
  }
}

function playClick(audio: HTMLAudioElement | null) {
  if (!audio) return
  audio.currentTime = 0
  void safePlay(audio)
}

function playOneShot(audio: HTMLAudioElement | null, volume = 0.55) {
  if (!audio) return
  audio.loop = false
  audio.volume = volume
  audio.currentTime = 0
  void safePlay(audio)
}

function fadeInAudio(audio: HTMLAudioElement | null, durationMs = 1500, targetVolume = 0.45, loop = false) {
  if (!audio) return

  audio.volume = 0
  audio.loop = loop
  audio.currentTime = 0
  void safePlay(audio)

  const start = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / durationMs)
    audio.volume = targetVolume * progress
    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

function EntryGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.18),_transparent_45%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.08),_transparent_40%)]" />
      <div className="relative w-full max-w-lg border border-green-500/60 bg-black/90 p-6 font-mono text-green-500 shadow-[0_0_35px_rgba(34,197,94,0.25)]">
        <p className="mb-2 text-xs uppercase tracking-[0.35em] text-green-400/80">Terminal 06</p>
        <p className="mb-8 text-sm leading-relaxed text-green-300/90">SESSION EXPIRED. [ INITIALIZE RESTART ]</p>
        <button
          type="button"
          onClick={onEnter}
          className="w-full border border-green-400 px-4 py-3 text-left text-sm tracking-[0.28em] text-green-300 transition hover:bg-green-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
        >
          [ INITIALIZE RESTART ]
        </button>
      </div>
    </div>
  )
}

export default function Szamuraj({ title, content }: Konyv2PageProps) {
  const [hasEntered, setHasEntered] = useState(false)
  const [isBootFlicker, setIsBootFlicker] = useState(false)
  const [interakcioStep, setInterakcioStep] = useState(0)
  const [isInterakcioCrashed, setIsInterakcioCrashed] = useState(false)
  const [networkId, setNetworkId] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const bgNoiseRef = useRef<HTMLAudioElement | null>(null)
  const acidLoopRef = useRef<HTMLAudioElement | null>(null)
  const sfxClickRef = useRef<HTMLAudioElement | null>(null)
  const sfxGlitchRef = useRef<HTMLAudioElement | null>(null)
  const sfxLighterRef = useRef<HTMLAudioElement | null>(null)
  const sfxTrafficRef = useRef<HTMLAudioElement | null>(null)
  const cueInCenterZoneRef = useRef<Record<CueType, boolean>>({
    lighter: false,
    horn: false,
    acid: false,
    internetezni: false,
  })
  const acidIsPlayingRef = useRef(false)
  const cueNodeMapRef = useRef<Map<CueType, Set<HTMLElement>>>(new Map())
  const rafRef = useRef<number | null>(null)

  const splitStory = useMemo(() => splitStoryContent(content), [content])
  const hasLockGate = splitStory.afterLock.length > 0
  const revealAfterLock = !hasLockGate || isUnlocked

  const { scrollYProgress } = useScroll()
  const tripAmount = useTransform(scrollYProgress, [0, 0.35, 1], [0, 1.5, 4.8])
  const textBlur = useTransform(scrollYProgress, [0, 1], [0, 1.6])

  const startAcidLoop = () => {
    const audio = acidLoopRef.current
    if (!audio) return

    if (acidIsPlayingRef.current) return

    audio.pause()
    audio.loop = true
    audio.currentTime = 0
    acidIsPlayingRef.current = true
    fadeInAudio(audio, 1400, 0.252, true)
  }

  const stopAcidLoop = () => {
    const audio = acidLoopRef.current
    if (!audio || !acidIsPlayingRef.current) return

    acidIsPlayingRef.current = false
    audio.pause()
    audio.currentTime = 0
    audio.loop = false
    audio.volume = 0
  }

  const triggerCue = (cueType: CueType) => {
    if (cueType === 'lighter') {
      playOneShot(sfxLighterRef.current, 0.6)
      return
    }

    if (cueType === 'horn') {
      playOneShot(sfxTrafficRef.current, 0.1875)
      return
    }

    if (cueType === 'acid') {
      if (bgNoiseRef.current) bgNoiseRef.current.volume = 0.14
      startAcidLoop()
    }

    if (cueType === 'internetezni') {
      playOneShot(sfxGlitchRef.current, 0.45)
    }
  }

  const updateCueFromNode = (node: HTMLElement, isIntersecting?: boolean) => {
    const cueType = node.dataset.cueType as CueType | undefined
    if (!cueType) return

    const rect = node.getBoundingClientRect()
    const elementCenter = rect.top + rect.height / 2
    const viewportCenter = window.innerHeight / 2
    const tolerance = window.innerHeight * CUE_CENTER_TOLERANCE_RATIO
    const isInCenterZone = Math.abs(elementCenter - viewportCenter) <= tolerance
    const wasInCenterZone = cueInCenterZoneRef.current[cueType]

    if (cueType === 'acid') {
      const isVisible = typeof isIntersecting === 'boolean'
        ? isIntersecting
        : rect.bottom > 0 && rect.top < window.innerHeight

      const anyAcidVisible = Array.from(document.querySelectorAll<HTMLElement>('[data-cue-type="acid"]'))
        .some((candidate) => {
          if (candidate === node) return isVisible

          const candidateRect = candidate.getBoundingClientRect()
          return candidateRect.bottom > 0 && candidateRect.top < window.innerHeight
        })

      if (isVisible && !acidIsPlayingRef.current) {
        startAcidLoop()
      }

      if (!anyAcidVisible && acidIsPlayingRef.current) {
          stopAcidLoop()
      }

      cueInCenterZoneRef.current[cueType] = isInCenterZone
      return
    }

    if (isInCenterZone && !wasInCenterZone) {
      triggerCue(cueType)
    }

    cueInCenterZoneRef.current[cueType] = isInCenterZone
  }

  useEffect(() => {
    if (bgNoiseRef.current) {
      bgNoiseRef.current.loop = true
      bgNoiseRef.current.volume = 0.28
    }
    if (acidLoopRef.current) {
      acidLoopRef.current.loop = true
      acidLoopRef.current.volume = 0
    }
  }, [])

  useEffect(() => {
    if (!hasEntered) return
    void safePlay(bgNoiseRef.current)
  }, [hasEntered])

  useEffect(() => {
    return () => {
      if (bgNoiseRef.current) bgNoiseRef.current.pause()
      if (acidLoopRef.current) {
        acidLoopRef.current.pause()
      }
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    if (!hasEntered) return

    const cueNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-cue-type]'))
    cueNodeMapRef.current.clear()
    cueNodes.forEach((node) => {
      const cueType = node.dataset.cueType as CueType | undefined
      if (!cueType) return

      const nodesForType = cueNodeMapRef.current.get(cueType) ?? new Set<HTMLElement>()
      nodesForType.add(node)
      cueNodeMapRef.current.set(cueType, nodesForType)
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          updateCueFromNode(entry.target as HTMLElement, entry.isIntersecting)
        })
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-20% 0px -20% 0px',
      },
    )

    cueNodes.forEach((node) => observer.observe(node))

    const handleScroll = () => {
      if (rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        cueNodeMapRef.current.forEach((nodes) => {
          nodes.forEach((node) => {
            updateCueFromNode(node)
          })
        })
        rafRef.current = null
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [hasEntered, isUnlocked, splitStory.beforeLock.length, splitStory.afterLock.length])

  const handleEnter = () => {
    playClick(sfxClickRef.current)

    try {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        void ctx.resume().then(() => ctx.close())
      }
    } catch {
      // AudioContext unlock can fail silently on some browsers.
    }

    void safePlay(bgNoiseRef.current)

    setIsBootFlicker(true)
    setHasEntered(true)
    window.setTimeout(() => setIsBootFlicker(false), 260)
  }

  const handleParancsolj = () => {
    if (isInterakcioCrashed) return

    playClick(sfxClickRef.current)

    setInterakcioStep((currentStep) => {
      const nextStep = Math.min(currentStep + 1, INTERAKCIO_QUESTIONS.length)
      if (nextStep >= INTERAKCIO_QUESTIONS.length) {
        setIsInterakcioCrashed(true)
        playOneShot(sfxGlitchRef.current, 0.55)
      }
      return nextStep
    })
  }

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!networkId || isUnlocking || isUnlocked) return

    playClick(sfxClickRef.current)
    playClick(sfxGlitchRef.current)
    setIsUnlocking(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsUnlocking(false)
    setIsUnlocked(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
      <audio ref={bgNoiseRef} src={DEFAULT_BG_NOISE} preload="auto" />
      <audio ref={acidLoopRef} src={DEFAULT_ACID_LOOP} preload="auto" />
      <audio ref={sfxClickRef} src={DEFAULT_CLICK_SFX} preload="auto" />
      <audio ref={sfxGlitchRef} src={DEFAULT_GLITCH_SFX} preload="auto" />
      <audio ref={sfxLighterRef} src={DEFAULT_LIGHTER_SFX} preload="auto" />
      <audio ref={sfxTrafficRef} src={DEFAULT_TRAFFIC_SFX} preload="auto" />

      {!hasEntered && <EntryGate onEnter={handleEnter} />}

      <div className="pointer-events-none fixed inset-0 z-10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:100%_4px] opacity-20" />
      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_10%,rgba(34,197,94,0.15),transparent_58%),radial-gradient(circle_at_50%_120%,rgba(59,130,246,0.12),transparent_52%)]" />

      <AnimatePresence>
        {isBootFlicker && (
          <motion.div
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed inset-0 z-20 bg-white"
          />
        )}
      </AnimatePresence>

      {hasEntered && (
        <motion.article
          style={
            {
              '--trip': tripAmount,
              '--trip-blur': textBlur,
            } as React.CSSProperties
          }
          className="relative z-20 mx-auto max-w-3xl px-5 pb-20 pt-14 sm:px-7 sm:pt-20"
        >
        <header className="mb-10 border border-green-500/35 bg-black/60 p-4 sm:p-6">
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-green-500">terminal_06.log</p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">{title}</h1>
        </header>

        <section className="mb-12 border border-green-500/25 bg-black/65 p-4 font-mono text-green-400 sm:p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-green-500/85">Interakcio</p>
          <div className="mt-3 space-y-2 text-sm leading-7">
            {INTERAKCIO_QUESTIONS.slice(0, interakcioStep).map((line, idx) => (
              <p key={`${idx}-${line}`}>- {line}</p>
            ))}
          </div>
          {isInterakcioCrashed ? (
            <div className="mt-4 border border-red-500/60 bg-red-950/20 p-3 text-xs tracking-[0.12em] text-red-300">
              [ INTERAKCIO MODUL HIBA ]
              <br />
              ERROR_0x06: KERDESEK_SZAMA_TULCSORDULT
            </div>
          ) : (
            <button
              type="button"
              onClick={handleParancsolj}
              className="mt-4 border border-green-400 px-4 py-2 text-xs tracking-[0.22em] transition hover:bg-green-500/10"
            >
              [ PARANCSOLJ! ]
            </button>
          )}
        </section>

        {splitStory.beforeLock.length > 0 ? (
          <div className="space-y-7 text-[1.03rem] leading-8 text-zinc-100/90 [text-shadow:calc(var(--trip)*0.45px)_0_0_rgba(255,0,68,0.65),calc(var(--trip)*-0.45px)_0_0_rgba(34,197,94,0.6),0_0_calc(var(--trip-blur)*1px)_rgba(255,255,255,0.55)]">
            {splitStory.beforeLock.map((paragraph, idx) => (
              <motion.p
                key={paragraph.id}
                data-para-id={paragraph.id}
                data-paragraph-order={idx}
                data-cue-type={paragraph.cueType ?? undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.03 }}
                className="whitespace-pre-wrap"
              >
                {paragraph.text}
              </motion.p>
            ))}
          </div>
        ) : (
          <p className="italic text-zinc-400">Tartalom hamarosan...</p>
        )}

        {hasLockGate && !isUnlocked && (
          <section className="relative mt-12 overflow-hidden border border-green-400/40 bg-black/85 p-5 sm:p-7">
            {isUnlocking && (
              <motion.div
                initial={{ opacity: 0.15 }}
                animate={{ opacity: [0.1, 0.3, 0.14, 0.36, 0.2] }}
                transition={{ repeat: Infinity, duration: 0.35 }}
                className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.13)_0px,rgba(255,255,255,0.13)_1px,transparent_1px,transparent_3px)]"
              />
            )}

            <p className="font-mono text-xs uppercase tracking-[0.25em] text-green-500/90">CRITICAL ANOMALY</p>
            <p className="mt-2 font-mono text-sm tracking-[0.08em] text-green-300">
              [ ENTER NETWORK ID (EMAIL) TO DECRYPT FEED ]
            </p>

            <form onSubmit={handleUnlock} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                required
                type="email"
                value={networkId}
                onChange={(event) => setNetworkId(event.target.value)}
                placeholder="network.id@domain"
                className="w-full border border-green-500/60 bg-black px-3 py-2 font-mono text-sm text-green-300 placeholder:text-green-600/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              />
              <button
                type="submit"
                disabled={isUnlocking}
                className="border border-green-400 px-4 py-2 font-mono text-xs tracking-[0.22em] text-green-200 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUnlocking ? '[ DECRYPTING... ]' : '[ DECRYPT FEED ]'}
              </button>
            </form>
          </section>
        )}

        <AnimatePresence>
          {revealAfterLock && splitStory.afterLock.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="mt-10 space-y-7 border-t border-green-500/30 pt-8 text-[1.03rem] leading-8 text-zinc-100/90 [text-shadow:calc(var(--trip)*0.55px)_0_0_rgba(255,0,68,0.68),calc(var(--trip)*-0.55px)_0_0_rgba(34,197,94,0.68),0_0_calc(var(--trip-blur)*1.2px)_rgba(255,255,255,0.62)]"
            >
              {splitStory.afterLock.map((paragraph, idx) => (
                <motion.p
                  key={paragraph.id}
                  data-para-id={paragraph.id}
                  data-paragraph-order={splitStory.beforeLock.length + idx}
                  data-cue-type={paragraph.cueType ?? undefined}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="whitespace-pre-wrap"
                >
                  {paragraph.text}
                </motion.p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.article>
      )}
    </main>
  )
}

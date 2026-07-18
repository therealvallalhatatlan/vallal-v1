'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: pali
 * Dedicated Pali page with its own audio phase system.
 */

const HOESES_LOOP_SRC = '/audio/hoeses.WAV'
const SONG_LOOP_SRC = '/audio/song.wav'
const SONG2_LOOP_SRC = '/audio/song2.wav'
const HOUSE_LOOP_SRC = '/audio/house.wav'
const CNN_LOOP_SRC = '/audio/cnn.wav'
const TENSION_LOOP_SRC = '/audio/tension.wav'
const TENSION2_LOOP_SRC = '/audio/tension2.wav'
const CHRISTMAS_LOOP_SRC = '/audio/christmas2.WAV'
const ACCESS_SFX_SRC = '/audio/access.wav'

const HOESES_STOP_PHRASE = normalizeForMatch('Beletúrok az oldalzsebes gatyám zsebébe')
const SONG_START_PHRASE = HOESES_STOP_PHRASE
const SONG_STOP_PHRASE = normalizeForMatch('Mormogok valamit, hogy bocs')
const SONG2_START_PHRASE = normalizeForMatch('magamról a havat, és a faszi felhúzott')
const SONG2_STOP_PHRASE = normalizeForMatch('Nem ismerjük egymást,')
const HOUSE_START_PHRASE = normalizeForMatch('egy tizessel öregebb legalább')
const HOUSE_STOP_PHRASE = normalizeForMatch('Másnap már hívott is')
const CNN_START_PHRASE = normalizeForMatch('hazabotorkáltam, megetettem')
const CNN_STOP_PHRASE = normalizeForMatch('Előpenderül egy fiatal lány')
const TENSION_START_PHRASE = normalizeForMatch('Az ágyban is csak fekszünk a plafont bámulva')
const TENSION_STOP_PHRASE = normalizeForMatch('Becsapom az apartman ajtaját és magamban szitkozódva')
const TENSION2_START_PHRASE = normalizeForMatch('Körbenézve látok egy ilyen')
const TENSION2_STOP_PHRASE = normalizeForMatch('Hazafelé a szokottnál is borúsabb')
const CHRISTMAS_START_PHRASE = normalizeForMatch('Persze, bazdmeg.')

const HOESES_VOLUME = 0.7
const SONG_VOLUME = 0.72
const SONG2_VOLUME = 0.52
const HOUSE_VOLUME = 0.72
const CNN_VOLUME = 0.72
const TENSION_VOLUME = 0.72
const TENSION2_VOLUME = 0.72
const CHRISTMAS_VOLUME = 0.72

type AudioPhase = 'hoeses' | 'song' | 'song2' | 'house' | 'cnn' | 'tension' | 'tension2' | 'christmas' | 'silent'

type StorySection = 'before-lock' | 'after-lock'

interface StoryParagraph {
  id: string
  section: StorySection
  text: string
}

interface SplitStory {
  beforeLock: StoryParagraph[]
  afterLock: StoryParagraph[]
}

const CHRISTMAS_BOKEH_LIGHTS = [
  { left: '6%', top: '14%', size: 240, color: 'rgba(118, 168, 255, 0.18)', duration: 11, delay: 0 },
  { left: '22%', top: '66%', size: 210, color: 'rgba(129, 204, 255, 0.16)', duration: 13, delay: 1.4 },
  { left: '42%', top: '28%', size: 300, color: 'rgba(106, 145, 232, 0.2)', duration: 12, delay: 0.7 },
  { left: '63%', top: '16%', size: 260, color: 'rgba(132, 179, 255, 0.16)', duration: 14, delay: 2.1 },
  { left: '78%', top: '58%', size: 230, color: 'rgba(159, 231, 255, 0.15)', duration: 10, delay: 0.4 },
  { left: '91%', top: '34%', size: 190, color: 'rgba(100, 142, 224, 0.15)', duration: 12, delay: 1.8 },
]

const WINTER_SNOWFLAKES = Array.from({ length: 34 }, (_, index) => ({
  id: index,
  left: `${((index * 17) % 100) + 0.5}%`,
  size: 1 + (index % 4) * 0.9,
  duration: 8 + (index % 7) * 1.35,
  delay: (index % 9) * 0.55,
  drift: -18 + (index % 8) * 5,
  opacity: 0.18 + (index % 5) * 0.1,
}))

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toStoryParagraphs(blocks: string[], section: StorySection): StoryParagraph[] {
  const paragraphs: StoryParagraph[] = []

  blocks.forEach((block, paragraphIndex) => {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const sourceLines = lines.length > 0 ? lines : [block.trim()].filter(Boolean)

    sourceLines.forEach((lineText, lineIndex) => {
      paragraphs.push({
        id: `${section}-${paragraphIndex}-${lineIndex}`,
        section,
        text: lineText,
      })
    })
  })

  return paragraphs
}

function splitStoryContent(content: string | null): SplitStory {
  if (!content) return { beforeLock: [], afterLock: [] }

  const paragraphBlocks = content
    .split(/\r?\n\s*\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const blocks = paragraphBlocks.length > 1
    ? paragraphBlocks
    : content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  if (blocks.length <= 2) {
    return { beforeLock: toStoryParagraphs(blocks, 'before-lock'), afterLock: [] }
  }

  const markerIndex = blocks.findIndex((block) => {
    const normalized = normalizeForMatch(block)
    return normalized.includes('mercedes') || normalized.includes('20000') || normalized.includes('20 000')
  })

  if (markerIndex >= 0 && markerIndex < blocks.length - 1) {
    return {
      beforeLock: toStoryParagraphs(blocks.slice(0, markerIndex + 1), 'before-lock'),
      afterLock: toStoryParagraphs(blocks.slice(markerIndex + 1), 'after-lock'),
    }
  }

  const fallbackCut = Math.max(1, Math.floor(blocks.length * 0.7))
  return {
    beforeLock: toStoryParagraphs(blocks.slice(0, fallbackCut), 'before-lock'),
    afterLock: toStoryParagraphs(blocks.slice(fallbackCut), 'after-lock'),
  }
}

function ChristmasBokehBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#040812]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(64,120,208,0.18),transparent_42%),radial-gradient(circle_at_76%_16%,rgba(90,168,255,0.12),transparent_44%),radial-gradient(circle_at_54%_76%,rgba(114,132,186,0.12),transparent_50%)]" />

      {CHRISTMAS_BOKEH_LIGHTS.map((light, index) => (
        <motion.div
          key={`${light.left}-${light.top}-${index}`}
          className="absolute rounded-full blur-[48px]"
          style={{
            left: light.left,
            top: light.top,
            width: `${light.size}px`,
            height: `${light.size}px`,
            background: light.color,
          }}
          animate={{
            x: [0, 16, -12, 0],
            y: [0, -10, 8, 0],
            scale: [1, 1.08, 0.96, 1],
            opacity: [0.18, 0.3, 0.2, 0.18],
          }}
          transition={{
            duration: light.duration,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
            delay: light.delay,
          }}
        />
      ))}

      <div className="absolute inset-0">
        {WINTER_SNOWFLAKES.map((flake) => (
          <motion.span
            key={`bg-snow-${flake.id}`}
            className="absolute top-[-12%] rounded-full bg-[#d6edff]"
            style={{
              left: flake.left,
              width: `${flake.size * 1.18}px`,
              height: `${flake.size * 1.18}px`,
              opacity: flake.opacity * 0.95,
              filter: 'drop-shadow(0 0 5px rgba(170,213,255,0.58))',
            }}
            animate={{
              y: ['0vh', '120vh'],
              x: [0, flake.drift, flake.drift * -0.35, 0],
            }}
            transition={{
              duration: flake.duration,
              delay: flake.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
        {WINTER_SNOWFLAKES.map((flake) => (
          <motion.span
            key={`bg-snow-foreground-${flake.id}`}
            className="absolute top-[-16%] rounded-full bg-[#e7f4ff]"
            style={{
              left: `calc(${flake.left} + 0.9%)`,
              width: `${flake.size * 1.65}px`,
              height: `${flake.size * 1.65}px`,
              opacity: Math.min(0.85, flake.opacity * 0.9),
              filter: 'drop-shadow(0 0 6px rgba(208,234,255,0.62))',
            }}
            animate={{
              y: ['0vh', '122vh'],
              x: [0, flake.drift * 1.35, flake.drift * -0.5, 0],
            }}
            transition={{
              duration: Math.max(5.8, flake.duration * 0.72),
              delay: flake.delay * 0.7,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 opacity-12 [background-image:linear-gradient(to_bottom,rgba(196,226,255,0.12)_1px,transparent_1px)] [background-size:100%_4px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_112%,rgba(10,18,36,0.2),rgba(2,6,14,0.9))]" />
    </div>
  )
}

function EntryGate({ onEnter }: { onEnter: () => void }) {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const schedule = () => {
      const delay = 1800 + Math.random() * 2800
      return window.setTimeout(() => {
        setIsGlitching(true)
        window.setTimeout(() => setIsGlitching(false), 140 + Math.random() * 120)
        timer = schedule()
      }, delay)
    }

    let timer = schedule()

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex min-h-screen items-center justify-center overflow-hidden bg-[#020612] px-4 text-[#b8dbff] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(88,146,224,0.22),transparent_34%),radial-gradient(circle_at_45%_118%,rgba(70,126,208,0.16),transparent_36%),linear-gradient(180deg,rgba(230,241,255,0.04),transparent_22%,rgba(1,4,10,0.64))]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_bottom,rgba(202,225,255,0.08)_1px,transparent_1px)] [background-size:100%_2px]" />

      <div className="pointer-events-none absolute inset-0">
        {WINTER_SNOWFLAKES.map((flake) => (
          <motion.span
            key={flake.id}
            className="absolute top-[-12%] rounded-full bg-[#d6edff]"
            style={{
              left: flake.left,
              width: `${flake.size}px`,
              height: `${flake.size}px`,
              opacity: flake.opacity,
              filter: 'drop-shadow(0 0 4px rgba(182,220,255,0.55))',
            }}
            animate={{
              y: ['0vh', '120vh'],
              x: [0, flake.drift, flake.drift * -0.35, 0],
            }}
            transition={{
              duration: flake.duration,
              delay: flake.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md overflow-hidden border border-[#2a3d5f] bg-[#060d1d] shadow-[0_0_0_1px_rgba(0,0,0,0.85),0_0_90px_rgba(0,5,20,0.75)]">
        <div className="flex items-center justify-between border-b border-[#1d2d46] bg-[#0b1426] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#93c8ff]">
          <span>private link internetcafe</span>
          <span>internal network</span>
        </div>

        <div className="relative bg-[#070d19] px-5 py-6 sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:repeating-linear-gradient(180deg,rgba(154,210,255,0.07)_0px,rgba(154,210,255,0.07)_1px,transparent_1px,transparent_4px)]" />
          <div className="relative mx-auto w-full max-w-sm border border-[#20314d] bg-[#050b16] px-4 py-5 font-mono text-[#b8dcff]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#6c8fb9]">login prompt</p>

            <div className="mt-4 space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#78a7d8]">user name</span>
                <input
                  type="text"
                  defaultValue="Vállalhatatlan"
                  readOnly
                  className="w-full border border-[#20314d] bg-[#0b1527] px-3 py-2 text-[#d8ebff] outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#78a7d8]">password</span>
                <input
                  type="password"
                  defaultValue="vault-entry"
                  readOnly
                  className="w-full border border-[#20314d] bg-[#0b1527] px-3 py-2 text-[#d8ebff] outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onEnter}
              className="mt-6 w-full border border-[#3a5e8d] bg-[#0f1d34] px-4 py-3 text-xs uppercase tracking-[0.3em] text-[#d8ecff] transition hover:bg-[#173055] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#98ceff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050b16]"
              style={
                isGlitching
                  ? {
                      boxShadow: '0 0 0 1px rgba(98,166,255,0.4), 0 0 20px rgba(116,199,255,0.24), 0 0 28px rgba(126,152,255,0.16)',
                      transform: 'translate3d(0,0,0) skewX(-1deg)',
                      textShadow: '1px 0 0 rgba(81,145,255,0.85), -1px 0 0 rgba(148,230,255,0.8), 0 0 8px rgba(173,220,255,0.4)',
                    }
                  : undefined
              }
            >
              <span className={isGlitching ? 'relative inline-block animate-pulse' : 'relative inline-block'}>
                login
                {isGlitching && (
                  <>
                    <span className="pointer-events-none absolute inset-0 -translate-x-[1px] text-[#78a9ff] opacity-70">login</span>
                    <span className="pointer-events-none absolute inset-0 translate-x-[1px] text-[#8de7ff] opacity-70">login</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Pali({ title, content }: Konyv2PageProps) {
  const [hasEntered, setHasEntered] = useState(false)
  const [isBootFlicker, setIsBootFlicker] = useState(false)
  const [isTitleGlitching, setIsTitleGlitching] = useState(false)
  const [networkId, setNetworkId] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  const accessAudioRef = useRef<HTMLAudioElement | null>(null)
  const hoesesAudioRef = useRef<HTMLAudioElement | null>(null)
  const songAudioRef = useRef<HTMLAudioElement | null>(null)
  const song2AudioRef = useRef<HTMLAudioElement | null>(null)
  const houseAudioRef = useRef<HTMLAudioElement | null>(null)
  const cnnAudioRef = useRef<HTMLAudioElement | null>(null)
  const tensionAudioRef = useRef<HTMLAudioElement | null>(null)
  const tension2AudioRef = useRef<HTMLAudioElement | null>(null)
  const christmasAudioRef = useRef<HTMLAudioElement | null>(null)

  const hoesesFadeTimerRef = useRef<number | null>(null)
  const songFadeTimerRef = useRef<number | null>(null)
  const song2FadeTimerRef = useRef<number | null>(null)
  const houseFadeTimerRef = useRef<number | null>(null)
  const cnnFadeTimerRef = useRef<number | null>(null)
  const tensionFadeTimerRef = useRef<number | null>(null)
  const tension2FadeTimerRef = useRef<number | null>(null)
  const christmasFadeTimerRef = useRef<number | null>(null)

  const desiredAudioPhaseRef = useRef<AudioPhase>('hoeses')
  const activeAudioPhaseRef = useRef<AudioPhase | null>(null)

  const splitStory = useMemo(() => splitStoryContent(content), [content])
  const hasLockGate = splitStory.afterLock.length > 0
  const revealAfterLock = !hasLockGate || isUnlocked

  const { scrollYProgress } = useScroll()
  const tripAmount = useTransform(scrollYProgress, [0, 0.35, 1], [0, 1.5, 4.8])
  const textBlur = useTransform(scrollYProgress, [0, 1], [0, 1.6])
  const glitchBoost = useTransform(scrollYProgress, [0, 0.8, 0.94, 1], [0, 0.12, 0.55, 0.9])

  useEffect(() => {
    const access = new Audio(ACCESS_SFX_SRC)
    access.preload = 'auto'
    access.volume = 0.9
    accessAudioRef.current = access

    return () => {
      access.pause()
      access.currentTime = 0
      accessAudioRef.current = null
    }
  }, [])

  useEffect(() => {
    const hoeses = new Audio(HOESES_LOOP_SRC)
    hoeses.loop = true
    hoeses.preload = 'auto'
    hoeses.volume = HOESES_VOLUME

    const song = new Audio(SONG_LOOP_SRC)
    song.loop = true
    song.preload = 'auto'
    song.volume = SONG_VOLUME

    const song2 = new Audio(SONG2_LOOP_SRC)
    song2.loop = true
    song2.preload = 'auto'
    song2.volume = SONG2_VOLUME

    const house = new Audio(HOUSE_LOOP_SRC)
    house.loop = true
    house.preload = 'auto'
    house.volume = HOUSE_VOLUME

    const cnn = new Audio(CNN_LOOP_SRC)
    cnn.loop = true
    cnn.preload = 'auto'
    cnn.volume = CNN_VOLUME

    const tension = new Audio(TENSION_LOOP_SRC)
    tension.loop = true
    tension.preload = 'auto'
    tension.volume = TENSION_VOLUME

    const tension2 = new Audio(TENSION2_LOOP_SRC)
    tension2.loop = true
    tension2.preload = 'auto'
    tension2.volume = TENSION2_VOLUME

    const christmas = new Audio(CHRISTMAS_LOOP_SRC)
    christmas.loop = true
    christmas.preload = 'auto'
    christmas.volume = CHRISTMAS_VOLUME

    hoesesAudioRef.current = hoeses
    songAudioRef.current = song
    song2AudioRef.current = song2
    houseAudioRef.current = house
    cnnAudioRef.current = cnn
    tensionAudioRef.current = tension
    tension2AudioRef.current = tension2
    christmasAudioRef.current = christmas

    const clearFadeTimer = (timerRef: React.MutableRefObject<number | null>) => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const safePlay = (audio: HTMLAudioElement) => {
      void audio.play().catch(() => {
        // Ignore autoplay blocks; user interaction handlers retry playback.
      })
    }

    const playFromStart = (audio: HTMLAudioElement, volume: number, timerRef: React.MutableRefObject<number | null>) => {
      clearFadeTimer(timerRef)
      audio.volume = volume
      audio.currentTime = 0
      safePlay(audio)
    }

    const stopWithFade = (audio: HTMLAudioElement, volume: number, timerRef: React.MutableRefObject<number | null>, durationMs = 120) => {
      if (audio.paused) {
        clearFadeTimer(timerRef)
        audio.currentTime = 0
        audio.volume = volume
        return
      }

      clearFadeTimer(timerRef)

      const startVolume = audio.volume
      const steps = 6
      const stepDuration = Math.max(10, Math.floor(durationMs / steps))
      let step = 0

      timerRef.current = window.setInterval(() => {
        step += 1
        const progress = Math.min(1, step / steps)
        audio.volume = Math.max(0, startVolume * (1 - progress))

        if (progress >= 1) {
          clearFadeTimer(timerRef)
          audio.pause()
          audio.currentTime = 0
          audio.volume = volume
        }
      }, stepDuration)
    }

    const applyAudioPhase = (nextPhase: AudioPhase) => {
      desiredAudioPhaseRef.current = nextPhase
      if (activeAudioPhaseRef.current === nextPhase) return

      const currentHoeses = hoesesAudioRef.current
      const currentSong = songAudioRef.current
      const currentSong2 = song2AudioRef.current
      const currentHouse = houseAudioRef.current
      const currentCnn = cnnAudioRef.current
      const currentTension = tensionAudioRef.current
      const currentTension2 = tension2AudioRef.current
      const currentChristmas = christmasAudioRef.current

      if (!currentHoeses || !currentSong || !currentSong2 || !currentHouse || !currentCnn || !currentTension || !currentTension2 || !currentChristmas) {
        return
      }

      if (nextPhase !== 'hoeses') stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
      if (nextPhase !== 'song') stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
      if (nextPhase !== 'song2') stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
      if (nextPhase !== 'house') stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
      if (nextPhase !== 'cnn') stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
      if (nextPhase !== 'tension') stopWithFade(currentTension, TENSION_VOLUME, tensionFadeTimerRef)
      if (nextPhase !== 'tension2') stopWithFade(currentTension2, TENSION2_VOLUME, tension2FadeTimerRef)
      if (nextPhase !== 'christmas') stopWithFade(currentChristmas, CHRISTMAS_VOLUME, christmasFadeTimerRef)

      if (nextPhase === 'hoeses') playFromStart(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
      if (nextPhase === 'song') playFromStart(currentSong, SONG_VOLUME, songFadeTimerRef)
      if (nextPhase === 'song2') playFromStart(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
      if (nextPhase === 'house') playFromStart(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
      if (nextPhase === 'cnn') playFromStart(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
      if (nextPhase === 'tension') playFromStart(currentTension, TENSION_VOLUME, tensionFadeTimerRef)
      if (nextPhase === 'tension2') playFromStart(currentTension2, TENSION2_VOLUME, tension2FadeTimerRef)
      if (nextPhase === 'christmas') playFromStart(currentChristmas, CHRISTMAS_VOLUME, christmasFadeTimerRef)

      activeAudioPhaseRef.current = nextPhase
    }

    const updatePhaseFromViewport = () => {
      if (!hasEntered) {
        applyAudioPhase('hoeses')
        return
      }

      const viewportCenter = window.innerHeight / 2

      const songStartLine = document.querySelector<HTMLElement>('[data-song-start="true"]')
      if (!songStartLine) {
        applyAudioPhase('hoeses')
        return
      }

      const hasReachedSongStart = songStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedSongStart) {
        applyAudioPhase('hoeses')
        return
      }

      const songStopLine = document.querySelector<HTMLElement>('[data-song-stop="true"]')
      if (!songStopLine) {
        applyAudioPhase('song')
        return
      }

      const hasReachedSongStop = songStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedSongStop) {
        applyAudioPhase('song')
        return
      }

      const song2StartLine = document.querySelector<HTMLElement>('[data-song2-start="true"]')
      if (!song2StartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedSong2Start = song2StartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedSong2Start) {
        applyAudioPhase('silent')
        return
      }

      const song2StopLine = document.querySelector<HTMLElement>('[data-song2-stop="true"]')
      if (!song2StopLine) {
        applyAudioPhase('song2')
        return
      }

      const hasReachedSong2Stop = song2StopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedSong2Stop) {
        applyAudioPhase('song2')
        return
      }

      const houseStartLine = document.querySelector<HTMLElement>('[data-house-start="true"]')
      if (!houseStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedHouseStart = houseStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedHouseStart) {
        applyAudioPhase('silent')
        return
      }

      const houseStopLine = document.querySelector<HTMLElement>('[data-house-stop="true"]')
      if (!houseStopLine) {
        applyAudioPhase('house')
        return
      }

      const hasReachedHouseStop = houseStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedHouseStop) {
        applyAudioPhase('house')
        return
      }

      const cnnStartLine = document.querySelector<HTMLElement>('[data-cnn-start="true"]')
      if (!cnnStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedCnnStart = cnnStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedCnnStart) {
        applyAudioPhase('silent')
        return
      }

      const cnnStopLine = document.querySelector<HTMLElement>('[data-cnn-stop="true"]')
      if (!cnnStopLine) {
        applyAudioPhase('cnn')
        return
      }

      const hasReachedCnnStop = cnnStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedCnnStop) {
        applyAudioPhase('cnn')
        return
      }

      const tensionStartLine = document.querySelector<HTMLElement>('[data-tension-start="true"]')
      if (!tensionStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedTensionStart = tensionStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTensionStart) {
        applyAudioPhase('silent')
        return
      }

      const tensionStopLine = document.querySelector<HTMLElement>('[data-tension-stop="true"]')
      if (!tensionStopLine) {
        applyAudioPhase('tension')
        return
      }

      const hasReachedTensionStop = tensionStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTensionStop) {
        applyAudioPhase('tension')
        return
      }

      const tension2StartLine = document.querySelector<HTMLElement>('[data-tension2-start="true"]')
      if (!tension2StartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedTension2Start = tension2StartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTension2Start) {
        applyAudioPhase('silent')
        return
      }

      const tension2StopLine = document.querySelector<HTMLElement>('[data-tension2-stop="true"]')
      if (!tension2StopLine) {
        applyAudioPhase('tension2')
        return
      }

      const hasReachedTension2Stop = tension2StopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTension2Stop) {
        applyAudioPhase('tension2')
        return
      }

      const christmasStartLine = document.querySelector<HTMLElement>('[data-christmas-start="true"]')
      if (!christmasStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedChristmasStart = christmasStartLine.getBoundingClientRect().top <= viewportCenter
      applyAudioPhase(hasReachedChristmasStart ? 'christmas' : 'silent')
    }

    applyAudioPhase('hoeses')
    updatePhaseFromViewport()

    const retryOnUserInteraction = () => {
      applyAudioPhase(desiredAudioPhaseRef.current)
    }

    window.addEventListener('pointerdown', retryOnUserInteraction, { passive: true })
    window.addEventListener('keydown', retryOnUserInteraction)
    window.addEventListener('scroll', updatePhaseFromViewport, { passive: true })
    window.addEventListener('resize', updatePhaseFromViewport)

    return () => {
      window.removeEventListener('pointerdown', retryOnUserInteraction)
      window.removeEventListener('keydown', retryOnUserInteraction)
      window.removeEventListener('scroll', updatePhaseFromViewport)
      window.removeEventListener('resize', updatePhaseFromViewport)

      ;[
        hoesesFadeTimerRef,
        songFadeTimerRef,
        song2FadeTimerRef,
        houseFadeTimerRef,
        cnnFadeTimerRef,
        tensionFadeTimerRef,
        tension2FadeTimerRef,
        christmasFadeTimerRef,
      ].forEach((timerRef) => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      })

      ;[hoeses, song, song2, house, cnn, tension, tension2, christmas].forEach((audio) => {
        audio.pause()
        audio.currentTime = 0
      })

      hoesesAudioRef.current = null
      songAudioRef.current = null
      song2AudioRef.current = null
      houseAudioRef.current = null
      cnnAudioRef.current = null
      tensionAudioRef.current = null
      tension2AudioRef.current = null
      christmasAudioRef.current = null
      activeAudioPhaseRef.current = null
    }
  }, [hasEntered, revealAfterLock, splitStory.afterLock.length, splitStory.beforeLock.length])

  useEffect(() => {
    const schedule = () => {
      const delay = 1400 + Math.random() * 2600
      return window.setTimeout(() => {
        setIsTitleGlitching(true)
        window.setTimeout(() => setIsTitleGlitching(false), 120 + Math.random() * 120)
        timer = schedule()
      }, delay)
    }

    let timer = schedule()

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  const handleEnter = () => {
    setIsBootFlicker(true)
    setHasEntered(true)
    window.setTimeout(() => setIsBootFlicker(false), 260)
  }

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!networkId || isUnlocking || isUnlocked) return

    const access = accessAudioRef.current
    if (access) {
      access.currentTime = 0
      void access.play().catch(() => {
        // Ignore blocked playback attempts.
      })
    }

    setIsUnlocking(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsUnlocking(false)
    setIsUnlocked(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030811] text-zinc-100">
      {!hasEntered && <EntryGate onEnter={handleEnter} />}

      <ChristmasBokehBackground />

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
              '--glitch-boost': glitchBoost,
            } as React.CSSProperties
          }
          className="relative z-20 mx-auto w-full max-w-[24rem] px-5 pb-20 pt-14 sm:max-w-[31.2rem] sm:px-7 sm:pt-20"
        >
          <header className="mb-8">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-[#7db9ff]">terminal_06.log</p>
            <h1
              className="text-[2.65rem] font-bold leading-[0.95] tracking-[-0.03em] text-[#ece7dc] sm:text-[3.65rem]"
              style={{ fontFamily: 'Trebuchet MS, Verdana, Arial, sans-serif' }}
            >
              <span
                className="relative inline-block"
                style={
                  isTitleGlitching
                    ? {
                        textShadow: '1px 0 0 rgba(255,0,70,0.7), -1px 0 0 rgba(0,255,255,0.65), 0 0 7px rgba(255,255,255,0.18)',
                        transform: 'translate3d(0,0,0) skewX(-1deg)',
                      }
                    : undefined
                }
              >
                {title}
                {isTitleGlitching && (
                  <>
                    <span className="pointer-events-none absolute inset-0 -translate-x-[1px] text-[#ff2d55] opacity-70">{title}</span>
                    <span className="pointer-events-none absolute inset-0 translate-x-[1px] text-[#00e5ff] opacity-70">{title}</span>
                  </>
                )}
              </span>
            </h1>
          </header>

          {splitStory.beforeLock.length > 0 ? (
            <div className="mx-auto w-full max-w-[20rem] space-y-7 text-left text-[1.13rem] leading-8 text-zinc-400/80 sm:max-w-[30.5rem] [text-shadow:0_0_calc(var(--trip-blur)*(0.78+var(--glitch-boost)*0.3)*1px)_rgba(255,255,255,0.2),calc(var(--trip)*(0.23+var(--glitch-boost)*0.18)*1px)_0_0_rgba(255,0,68,0.36),calc(var(--trip)*(-0.23-var(--glitch-boost)*0.18)*1px)_0_0_rgba(34,197,94,0.33)]">
              {splitStory.beforeLock.map((paragraph, idx) => (
                <motion.p
                  key={paragraph.id}
                  data-para-id={paragraph.id}
                  data-paragraph-order={idx}
                  data-song-start={isSongStartLine(paragraph.text) ? 'true' : undefined}
                  data-song-stop={isSongStopLine(paragraph.text) ? 'true' : undefined}
                  data-song2-start={isSong2StartLine(paragraph.text) ? 'true' : undefined}
                  data-song2-stop={isSong2StopLine(paragraph.text) ? 'true' : undefined}
                  data-house-start={isHouseStartLine(paragraph.text) ? 'true' : undefined}
                  data-house-stop={isHouseStopLine(paragraph.text) ? 'true' : undefined}
                  data-cnn-start={isCnnStartLine(paragraph.text) ? 'true' : undefined}
                  data-cnn-stop={isCnnStopLine(paragraph.text) ? 'true' : undefined}
                  data-tension-start={isTensionStartLine(paragraph.text) ? 'true' : undefined}
                  data-tension-stop={isTensionStopLine(paragraph.text) ? 'true' : undefined}
                  data-tension2-start={isTension2StartLine(paragraph.text) ? 'true' : undefined}
                  data-tension2-stop={isTension2StopLine(paragraph.text) ? 'true' : undefined}
                  data-christmas-start={isChristmasStartLine(paragraph.text) ? 'true' : undefined}
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
            <p className="italic text-zinc-500/70">Tartalom hamarosan...</p>
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

              <p className="font-mono text-xs uppercase tracking-[0.25em] text-green-500/90">...FOLYTATÓDIK</p>
              <p className="mt-2 font-mono text-sm tracking-[0.08em] text-green-300">[ ADD MEG AZ EMAILCÍMED A TITKOSÍTÁS FELOLDÁSÁHOZ. ]</p>

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
                  {isUnlocking ? 'FELOLDÁS...' : 'FELOLDÁS'}
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
                className="mx-auto mt-10 w-full max-w-[18rem] space-y-7 pt-8 text-left text-[1.13rem] leading-8 text-zinc-400/78 sm:max-w-[30.5rem] [text-shadow:0_0_calc(var(--trip-blur)*(0.86+var(--glitch-boost)*0.34)*1px)_rgba(255,255,255,0.2),calc(var(--trip)*(0.24+var(--glitch-boost)*0.2)*1px)_0_0_rgba(88,150,255,0.34),calc(var(--trip)*(-0.24-var(--glitch-boost)*0.2)*1px)_0_0_rgba(120,232,255,0.28)]"
              >
                {splitStory.afterLock.map((paragraph, idx) => (
                  <motion.p
                    key={paragraph.id}
                    data-para-id={paragraph.id}
                    data-paragraph-order={splitStory.beforeLock.length + idx}
                    data-song-start={isSongStartLine(paragraph.text) ? 'true' : undefined}
                    data-song-stop={isSongStopLine(paragraph.text) ? 'true' : undefined}
                    data-song2-start={isSong2StartLine(paragraph.text) ? 'true' : undefined}
                    data-song2-stop={isSong2StopLine(paragraph.text) ? 'true' : undefined}
                    data-house-start={isHouseStartLine(paragraph.text) ? 'true' : undefined}
                    data-house-stop={isHouseStopLine(paragraph.text) ? 'true' : undefined}
                    data-cnn-start={isCnnStartLine(paragraph.text) ? 'true' : undefined}
                    data-cnn-stop={isCnnStopLine(paragraph.text) ? 'true' : undefined}
                    data-tension-start={isTensionStartLine(paragraph.text) ? 'true' : undefined}
                    data-tension-stop={isTensionStopLine(paragraph.text) ? 'true' : undefined}
                    data-tension2-start={isTension2StartLine(paragraph.text) ? 'true' : undefined}
                    data-tension2-stop={isTension2StopLine(paragraph.text) ? 'true' : undefined}
                    data-christmas-start={isChristmasStartLine(paragraph.text) ? 'true' : undefined}
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

          {isUnlocked && (
            <section className="mx-auto mt-48 w-full max-w-[20rem] sm:max-w-[30.5rem]">
              <div className="relative overflow-hidden border border-zinc-700/55 bg-[#05070b]/95 p-4 font-mono shadow-[0_14px_50px_rgba(0,0,0,0.6)] sm:p-5">
                <div className="pointer-events-none absolute inset-0 opacity-16 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:100%_3px]" />

                <div className="relative flex items-center justify-between border-b border-zinc-700/60 pb-2">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-300/90">PROJECT FINANCE TERMINAL</p>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-red-300">
                    KRITIKUS
                    <span className="relative inline-flex h-3.5 w-6 items-center rounded-[2px] border border-red-400/85 px-[1px]">
                      <span className="h-[6px] w-[1%] min-w-[1px] rounded-[1px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.75)]" />
                      <span className="absolute -right-[3px] top-1/2 h-1.5 w-[2px] -translate-y-1/2 rounded-r-[1px] bg-red-300/90" />
                    </span>
                  </div>
                </div>

                <table className="relative mt-3 w-full border-collapse text-left text-xs text-zinc-300/85">
                  <tbody>
                    <tr className="border-b border-zinc-800/80">
                      <th className="py-2 font-normal uppercase tracking-[0.14em] text-zinc-500">Állapot</th>
                      <td className="py-2 text-red-300">Kritikus finanszírozási szint</td>
                    </tr>
                    <tr className="border-b border-zinc-800/80">
                      <th className="py-2 font-normal uppercase tracking-[0.14em] text-zinc-500">Kampány cél</th>
                      <td className="py-2">III. Évad + Könyv + Film fejlesztés</td>
                    </tr>
                  </tbody>
                </table>

                <p className="relative mt-3 text-[11px] leading-5 text-zinc-400/90">
                  Rendszerüzenet: a projekt stabilizálásához azonnali külső támogatás szükséges.
                </p>

                <a
                  href="/tamogatas"
                  className="group w-full relative mt-4 inline-flex items-center justify-center overflow-hidden border border-green-500/65 bg-green-500/10 px-4 py-4 text-xs uppercase tracking-[0.24em] text-green-200 transition hover:bg-green-500/20 hover:text-green-100"
                >
                  <span className="relative inline-block text-center">
                    [ TÁMOGATÁSI LEHETŐSÉGEK ]
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-[1px] text-[#ff4fd8]/70 opacity-0 transition-opacity duration-200 group-hover:opacity-90"
                    >
                      [ TÁMOGATÁSI LEHETŐSÉGEK ]
                    </span>
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 translate-x-[1px] text-[#42f5ff]/75 opacity-0 transition-opacity duration-200 group-hover:opacity-90"
                    >
                      [ TÁMOGATÁSI LEHETŐSÉGEK ]
                    </span>
                  </span>
                </a>
              </div>
            </section>
          )}
        </motion.article>
      )}
    </main>
  )
}

function isSongStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(SONG_START_PHRASE)
}

function isSongStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(SONG_STOP_PHRASE)
}

function isSong2StartLine(text: string): boolean {
  return normalizeForMatch(text).includes(SONG2_START_PHRASE)
}

function isSong2StopLine(text: string): boolean {
  return normalizeForMatch(text).includes(SONG2_STOP_PHRASE)
}

function isHouseStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(HOUSE_START_PHRASE)
}

function isHouseStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(HOUSE_STOP_PHRASE)
}

function isCnnStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(CNN_START_PHRASE)
}

function isCnnStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(CNN_STOP_PHRASE)
}

function isTensionStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(TENSION_START_PHRASE)
}

function isTensionStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(TENSION_STOP_PHRASE)
}

function isTension2StartLine(text: string): boolean {
  return normalizeForMatch(text).includes(TENSION2_START_PHRASE)
}

function isTension2StopLine(text: string): boolean {
  return normalizeForMatch(text).includes(TENSION2_STOP_PHRASE)
}

function isChristmasStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(CHRISTMAS_START_PHRASE)
}

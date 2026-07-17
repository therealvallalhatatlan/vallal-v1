'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import type { Konyv2PageProps } from '@/components/konyv2/props'

/**
 * UI type: pali
 * Szamuraj-alapú oldal hangok nélkül, jelenleg csak a vizuális és narratív kerettel.
 */

const INTERAKCIO_QUESTIONS = [
  'Mennyi ido alatt puhul meg egy galamb?',
  'Kinyomtatnad nekem ezt a halotti bizonyitvanyt?',
  'Alairnad ezt az okiratot?',
  'Tudnal rakni erre egy pecsetet?',
  'Ekitek van?',
  'Le tudod masolni ezt a lakatkulcsot A4-ben?',
]

const HOESES_LOOP_SRC = '/audio/hoeses.WAV'
const SONG_LOOP_SRC = '/audio/song.wav'
const SONG2_LOOP_SRC = '/audio/song2.wav'
const HOUSE_LOOP_SRC = '/audio/house.wav'
const CNN_LOOP_SRC = '/audio/cnn.wav'
const HOESES_STOP_PHRASE = normalizeForMatch('Beletúrok az oldalzsebes gatyám zsebébe')
const SONG_START_PHRASE = HOESES_STOP_PHRASE
const SONG_STOP_PHRASE = normalizeForMatch('Mormogok valamit, hogy bocs')
const SONG2_START_PHRASE = normalizeForMatch('magamról a havat, és a faszi felhúzott')
const SONG2_STOP_PHRASE = normalizeForMatch('Nem ismerjük egymást,')
const HOUSE_START_PHRASE = normalizeForMatch('egy tizessel öregebb legalább')
const HOUSE_STOP_PHRASE = normalizeForMatch('Másnap már hívott is')
const CNN_START_PHRASE = HOUSE_STOP_PHRASE
const CNN_STOP_PHRASE = normalizeForMatch('Előpenderül egy fiatal lány')
const HOESES_VOLUME = 0.7
const SONG_VOLUME = 0.72
const SONG2_VOLUME = 0.52
const HOUSE_VOLUME = 0.72
const CNN_VOLUME = 0.72

type AudioPhase = 'hoeses' | 'song' | 'song2' | 'house' | 'cnn' | 'silent'

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
    <div className="fixed inset-0 z-40 flex min-h-screen items-center justify-center overflow-hidden bg-[#040507] px-4 text-[#93ff8a] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(34,197,94,0.12),transparent_28%),radial-gradient(circle_at_50%_115%,rgba(14,165,233,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_18%,rgba(0,0,0,0.26))]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:100%_2px]" />

      <div className="relative w-full max-w-md overflow-hidden border border-[#2a3a2f] bg-[#060806] shadow-[0_0_0_1px_rgba(0,0,0,0.8),0_0_80px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-[#1d2a21] bg-[#0b100d] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#76ff70]">
          <span>private link internetcafe</span>
          <span>internal network</span>
        </div>

        <div className="relative bg-[#090b09] px-5 py-6 sm:px-6 sm:py-7">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(180deg,rgba(118,255,112,0.08)_0px,rgba(118,255,112,0.08)_1px,transparent_1px,transparent_4px)]" />
          <div className="relative mx-auto w-full max-w-sm border border-[#223127] bg-[#050705] px-4 py-5 font-mono text-[#92ff8a]">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#5f8b61]">login prompt</p>

            <div className="mt-4 space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#6db06f]">user name</span>
                <input
                  type="text"
                  defaultValue="Vállalhatatlan"
                  readOnly
                  className="w-full border border-[#223127] bg-[#091009] px-3 py-2 text-[#d8ffd8] outline-none"
                />
              </label>

              <label className="block space-y-1">
                <span className="block text-[10px] uppercase tracking-[0.22em] text-[#6db06f]">password</span>
                <input
                  type="password"
                  defaultValue="vault-entry"
                  readOnly
                  className="w-full border border-[#223127] bg-[#091009] px-3 py-2 text-[#d8ffd8] outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={onEnter}
              className="mt-6 w-full border border-[#2f7a39] bg-[#0e1a10] px-4 py-3 text-xs uppercase tracking-[0.3em] text-[#b8ffb8] transition hover:bg-[#133017] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7bff7b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050705]"
              style={
                isGlitching
                  ? {
                      boxShadow: '0 0 0 1px rgba(255,0,64,0.25), 0 0 16px rgba(0,255,255,0.18), 0 0 22px rgba(255,0,128,0.12)',
                      transform: 'translate3d(0,0,0) skewX(-1deg)',
                      textShadow: '1px 0 0 rgba(255,0,70,0.8), -1px 0 0 rgba(0,255,255,0.75), 0 0 8px rgba(123,255,123,0.35)',
                    }
                  : undefined
              }
            >
              <span className={isGlitching ? 'relative inline-block animate-pulse' : 'relative inline-block'}>
                login
                {isGlitching && (
                  <>
                    <span className="pointer-events-none absolute inset-0 -translate-x-[1px] text-[#ff2d55] opacity-70">login</span>
                    <span className="pointer-events-none absolute inset-0 translate-x-[1px] text-[#00e5ff] opacity-70">login</span>
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
  const [interakcioStep, setInterakcioStep] = useState(0)
  const [interakcioDisplay, setInterakcioDisplay] = useState('')
  const [isInterakcioTyping, setIsInterakcioTyping] = useState(false)
  const [isInterakcioCrashed, setIsInterakcioCrashed] = useState(false)
  const [networkId, setNetworkId] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const hoesesAudioRef = useRef<HTMLAudioElement | null>(null)
  const songAudioRef = useRef<HTMLAudioElement | null>(null)
  const song2AudioRef = useRef<HTMLAudioElement | null>(null)
  const houseAudioRef = useRef<HTMLAudioElement | null>(null)
  const cnnAudioRef = useRef<HTMLAudioElement | null>(null)
  const hoesesFadeTimerRef = useRef<number | null>(null)
  const songFadeTimerRef = useRef<number | null>(null)
  const song2FadeTimerRef = useRef<number | null>(null)
  const houseFadeTimerRef = useRef<number | null>(null)
  const cnnFadeTimerRef = useRef<number | null>(null)
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

    hoesesAudioRef.current = hoeses
    songAudioRef.current = song
    song2AudioRef.current = song2
    houseAudioRef.current = house
    cnnAudioRef.current = cnn

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
      if (!currentHoeses || !currentSong || !currentSong2 || !currentHouse || !currentCnn) return

      if (nextPhase === 'hoeses') {
        stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
        stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
        stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
        stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
        playFromStart(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
      } else if (nextPhase === 'song') {
        stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
        stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
        stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
        stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
        playFromStart(currentSong, SONG_VOLUME, songFadeTimerRef)
      } else if (nextPhase === 'song2') {
        stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
        stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
        stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
        stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
        playFromStart(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
      } else if (nextPhase === 'house') {
        stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
        stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
        stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
        stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
        playFromStart(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
      } else if (nextPhase === 'cnn') {
        stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
        stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
        stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
        stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
        playFromStart(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
      } else {
        stopWithFade(currentHoeses, HOESES_VOLUME, hoesesFadeTimerRef)
        stopWithFade(currentSong, SONG_VOLUME, songFadeTimerRef)
        stopWithFade(currentSong2, SONG2_VOLUME, song2FadeTimerRef)
        stopWithFade(currentHouse, HOUSE_VOLUME, houseFadeTimerRef)
        stopWithFade(currentCnn, CNN_VOLUME, cnnFadeTimerRef)
      }

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
      applyAudioPhase(hasReachedCnnStop ? 'silent' : 'cnn')
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
      clearFadeTimer(hoesesFadeTimerRef)
      clearFadeTimer(songFadeTimerRef)
      clearFadeTimer(song2FadeTimerRef)
      clearFadeTimer(houseFadeTimerRef)
      clearFadeTimer(cnnFadeTimerRef)
      hoeses.pause()
      song.pause()
      song2.pause()
      house.pause()
      cnn.pause()
      hoeses.currentTime = 0
      song.currentTime = 0
      song2.currentTime = 0
      house.currentTime = 0
      cnn.currentTime = 0
      hoesesAudioRef.current = null
      songAudioRef.current = null
      song2AudioRef.current = null
      houseAudioRef.current = null
      cnnAudioRef.current = null
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

  useEffect(() => {
    if (isInterakcioCrashed) return

    const currentQuestion = INTERAKCIO_QUESTIONS[interakcioStep]
    if (!currentQuestion) {
      setInterakcioDisplay('')
      return
    }

    setIsInterakcioTyping(true)
    setInterakcioDisplay('')

    let index = 0
    const tick = () => {
      index += 1
      setInterakcioDisplay(currentQuestion.slice(0, index))

      if (index < currentQuestion.length) {
        window.setTimeout(tick, 18 + Math.random() * 28)
      } else {
        setIsInterakcioTyping(false)
      }
    }

    const timer = window.setTimeout(tick, 130)

    return () => {
      window.clearTimeout(timer)
    }
  }, [interakcioStep, isInterakcioCrashed])

  const handleEnter = () => {
    setIsBootFlicker(true)
    setHasEntered(true)
    window.setTimeout(() => setIsBootFlicker(false), 260)
  }

  const handleParancsolj = () => {
    if (isInterakcioCrashed) return

    setInterakcioStep((currentStep) => {
      const nextStep = Math.min(currentStep + 1, INTERAKCIO_QUESTIONS.length)
      if (nextStep >= INTERAKCIO_QUESTIONS.length) {
        setIsInterakcioCrashed(true)
      }
      return nextStep
    })
  }

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!networkId || isUnlocking || isUnlocked) return

    setIsUnlocking(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsUnlocking(false)
    setIsUnlocked(true)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
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
              '--glitch-boost': glitchBoost,
            } as React.CSSProperties
          }
          className="relative z-20 mx-auto w-full max-w-[24rem] px-5 pb-20 pt-14 sm:max-w-[31.2rem] sm:px-7 sm:pt-20"
        >
          <header className="mb-8">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-green-500">terminal_06.log</p>
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

          <section className="mb-12 border border-green-500/25 bg-black/65 p-4 font-mono text-green-400 sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-green-500/85">SZIMULÁTOR</p>
            <div className="mt-3 min-h-[2.2rem] text-sm leading-7 text-green-300/90">
              {interakcioDisplay ? <p className="whitespace-pre-wrap">{interakcioDisplay}{isInterakcioTyping ? '▍' : ''}</p> : <p>&nbsp;</p>}
            </div>
            {isInterakcioCrashed ? (
              <div className="mt-4 border border-red-500/60 bg-red-950/20 p-3 text-xs tracking-[0.12em] text-red-300">
                [ SZIMULÁTOR ]
                <br />
                ERROR_0x06: FASZOM_KIVAN
              </div>
            ) : (
              <button
                type="button"
                onClick={handleParancsolj}
                className="mt-4 border border-green-400 px-4 py-2 text-xs tracking-[0.22em] transition hover:bg-green-500/10"
              >
                {isInterakcioTyping ? '[ BETOLT...' : '[ PARANCSOLJ! ]'}
              </button>
            )}
          </section>

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
                className="mx-auto mt-10 w-full max-w-[18rem] space-y-7 pt-8 text-left text-[1.13rem] leading-8 text-zinc-400/78 sm:max-w-[30.5rem] [text-shadow:0_0_calc(var(--trip-blur)*(0.86+var(--glitch-boost)*0.34)*1px)_rgba(255,255,255,0.2),calc(var(--trip)*(0.24+var(--glitch-boost)*0.2)*1px)_0_0_rgba(255,0,68,0.38),calc(var(--trip)*(-0.24-var(--glitch-boost)*0.2)*1px)_0_0_rgba(34,197,94,0.34)]"
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
            <section className="mx-auto mt-24 w-full max-w-[20rem] sm:max-w-[30.5rem]">
              <div className="shadow-neutral-950 relative overflow-hidden border border-green-500/0 bg-black/75 p-4 font-mono shadow-xl sm:p-5">
                <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:100%_3px]" />

                <a href="/" className="relative inline-block hover:opacity-85 transition-opacity" aria-label="Vissza a főoldalra">
                  <img src="/img/logo.png" alt="Vállalhatatlan" className="h-8 w-auto" />
                </a>

                <h2 className="relative mt-3 text-sm uppercase tracking-[0.24em] text-green-300/95">Támogasd ezt a faszt !</h2>

                <p className="relative mt-2 text-sm italic leading-6 text-zinc-300/80">
                  Megírni egy korszak regényét, filmet rendezni belőle és szanaszét hajlítani a valóságot.
                </p>

                <div className="relative mt-4 space-y-3 text-sm leading-6 text-zinc-300/85">
                  <a
                    href="https://vallalhatatlan.substack.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-green-500/25 bg-black/45 px-3 py-2 transition hover:border-green-400/50 hover:bg-green-500/10"
                  >
                    <span className="text-green-500/85">Substack:</span> vallalhatatlan.substack.com
                  </a>

                  <a
                    href="https://buy.stripe.com/bJe9ATenoaR23C70RV8Ra0o"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-green-500/25 bg-black/45 px-3 py-2 transition hover:border-green-400/50 hover:bg-green-500/10"
                  >
                    <span className="text-green-500/85">Stripe Donate:</span> Tetszőleges
                  </a>

                  <div className="border border-green-500/25 bg-black/45 px-3 py-3">
                    <p>
                      <span className="text-green-500/85">Revolut:</span> @vallalhatatlan
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=164x164&data=https%3A%2F%2Frevolut.me%2Fvallalhatatlan"
                        alt="Revolut QR - @vallalhatatlan"
                        className="h-28 w-28 border border-green-500/30 bg-white p-1"
                        loading="lazy"
                      />
                      <a
                        href="https://revolut.me/vallalhatatlan"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border border-green-500/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-green-200 transition hover:border-green-400/60 hover:bg-green-500/10"
                      >
                        Revolut megnyitása
                      </a>
                    </div>
                  </div>
                </div>
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
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Konyv2PageProps } from '@/components/konyv2/props'
import { EmailUnlockGate } from '@/components/konyv2/EmailUnlockGate'
import { SupportersTicker } from '@/components/supporters/SupportersTicker'
import { SUPPORTER_NAMES } from '@/data/supporters'

/**
 * UI type: balaton
 * Dedicated Balaton page with its own audio phase system.
 */

const ETTEREM_LOOP_SRC = '/audio/etterem.WAV'
const TUCSOK_LOOP_SRC = '/audio/tucsok.WAV'
const PHONE_LOOP_SRC = '/audio/phone.wav'
const DRAMA_LOOP_SRC = '/audio/drama.wav'
const DRAMA2_SFX_SRC = '/audio/drama2.wav'
const DRAMA3_SFX_SRC = '/audio/drama3.wav'
const BALATON_NIGHT_LOOP_SRC = '/audio/balaton-night.WAV'
const BALATON_DAY_LOOP_SRC = '/audio/balaton-day.WAV'
const BOAT_LOOP_SRC = '/audio/boat.WAV'
const HULLAM_LOOP_SRC = '/audio/hullam.wav'
const KIDS_SFX_SRC = '/audio/kids.wav'
const KIDS2_SFX_SRC = '/audio/kids2.wav'
const REGGAE_SFX_SRC = '/audio/reggae.wav'
const SPLASH_SFX_SRC = '/audio/splash.wav'

const ETTEREM_START_PHRASE = normalizeForMatch('Hozhatok még egy bloody maryt?')
const ETTEREM_STOP_PHRASE = normalizeForMatch('Nem vagyunk éhesek Hans.')
const TUCSOK_START_PHRASE = normalizeForMatch('rendben? - szól oda és maga után húz.')
const PHONE_CUE_PHRASE = normalizeForMatch('Azt hoztam igen. Felhívom a Rasztát.')
const TUCSOK_STOP_PHRASE = normalizeForMatch('nagyszülők mögött visszasétálunk a szállodába.')
const DRAMA_START_PHRASE = normalizeForMatch('Nem szólunk egymáshoz amíg az egymásba karolt')
const DRAMA_STOP_PHRASE = normalizeForMatch('-Ahova akarsz leszarom!')
const DRAMA2_CUE_PHRASE = normalizeForMatch('-Bazd meg akkor!')
const DRAMA3_CUE1_PHRASE = normalizeForMatch('Mondd! Te ráhajtottál a csajomra bazdmeg?')
const DRAMA3_CUE2_PHRASE = normalizeForMatch('Nem hajtottam rá senkire, mi a faszról beszélsz?')
const BALATON_NIGHT_START_PHRASE = normalizeForMatch('Becsapom az apartman ajtaját és magamban szitkozódva')
const BALATON_NIGHT_STOP_PHRASE = normalizeForMatch('Már világos van amikor a')
const BALATON_DAY_START_PHRASE = normalizeForMatch('Zsúfolt strand, a szülők méregetnek,')
const BALATON_DAY_STOP_PHRASE = normalizeForMatch('Nem gondoltam ezt végig teljesen,')
const KIDS_CUE_PHRASE = BALATON_DAY_START_PHRASE
const BOAT_START_PHRASE = normalizeForMatch('Felpattanok a vizibiciklire,')
const BOAT_STOP_PHRASE = normalizeForMatch('-Testvérem! - kiáltozza messziről.')
const HULLAM_START_PHRASE = normalizeForMatch('Feldobja a hátizsákját a vizibiciklire')
const HULLAM_STOP_PHRASE = normalizeForMatch('Hátranézek Beára de elfordítja a fejét,')
const BOAT_RETURN_START_PHRASE = normalizeForMatch('Tekerni kezdjük a vizibiciklit hogy eltávolodjunk')
const KIDS2_CUE_PHRASE = normalizeForMatch('kapkodom a levegőt mire végre besiklok')
const REGGAE_CUE_PHRASE = normalizeForMatch('Rögtön kiszúrom Bea rozsdavörös felhőszerű')
const SPLASH_CUE_PHRASE = normalizeForMatch('A kurva anyádat bazdmeg! - sziszegi a fogai közt,')
const DAWN_TRANSITION_PHRASE = normalizeForMatch('Már világos van amikor a telefonom csörgésére kinyitom')

const ETTEREM_VOLUME = 0.72
const TUCSOK_VOLUME = 0.52
const DRAMA_VOLUME = 0.72
const AMBIENT_VOLUME = 0.72
const REGGAE_VOLUME = 0.86
const STORY_UNLOCK_SLUG = 'a-balatonnal'

type AudioPhase = 'etterem' | 'tucsok' | 'tension2' | 'balaton-night' | 'balaton-day' | 'boat' | 'hullam' | 'silent'

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

const NIGHT_SKY_STARS = Array.from({ length: 54 }, (_, index) => ({
  id: index,
  left: `${((index * 37) % 100) + 0.3}%`,
  top: `${((index * 19) % 100) + 0.2}%`,
  size: 1 + (index % 3),
  duration: 2.8 + (index % 7) * 0.7,
  delay: (index % 10) * 0.2,
  opacityMax: 0.52 + (index % 4) * 0.08,
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

function splitStoryContent(content: string | null, forceSingleSection = false): SplitStory {
  if (!content) return { beforeLock: [], afterLock: [] }

  const paragraphBlocks = content
    .split(/\r?\n\s*\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)

  const blocks = paragraphBlocks.length > 1
    ? paragraphBlocks
    : content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)

  if (forceSingleSection) {
    return { beforeLock: toStoryParagraphs(blocks, 'before-lock'), afterLock: [] }
  }

  const fallbackCut = Math.max(1, Math.floor(blocks.length * 0.7))
  return {
    beforeLock: toStoryParagraphs(blocks.slice(0, fallbackCut), 'before-lock'),
    afterLock: toStoryParagraphs(blocks.slice(fallbackCut), 'after-lock'),
  }
}

function NightToDawnBackground({ dawnProgress }: { dawnProgress: number }) {
  const nightOpacity = Math.max(0, 1 - dawnProgress * 1.6)
  const dawnOpacity = Math.min(1, dawnProgress * 1.45)

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[#040916]" />

      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle_at_50%_122%,rgba(24,88,158,0.36),transparent_52%),radial-gradient(circle_at_18%_8%,rgba(255,240,180,0.08),transparent_34%),radial-gradient(circle_at_82%_14%,rgba(175,205,255,0.11),transparent_30%),linear-gradient(180deg,#02050f_0%,#071227_45%,#10274a_100%)',
          opacity: nightOpacity,
        }}
      />

      {NIGHT_SKY_STARS.map((star) => (
        <motion.div
          key={`sky-star-${star.id}`}
          className="absolute rounded-full bg-white"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            boxShadow: '0 0 10px rgba(255,255,255,0.55)',
          }}
          animate={{
            opacity: [0.08, star.opacityMax * nightOpacity, 0.12],
            scale: [0.9, 1.14, 0.94],
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: star.delay,
          }}
        />
      ))}

      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle_at_50%_108%,rgba(255,221,158,0.9),transparent_42%),linear-gradient(180deg,rgba(255,251,238,0.98)_0%,rgba(223,238,255,0.9)_38%,rgba(176,208,240,0.82)_100%)',
          opacity: dawnOpacity,
        }}
      />

      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0.04)_28%,rgba(255,255,255,0.3)_100%)',
          opacity: dawnOpacity,
        }}
      />

      <div className="absolute inset-0 opacity-12 [background-image:linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_4px]" />
    </div>
  )
}

function EntryGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex min-h-screen items-center justify-center overflow-hidden bg-[#03050d] px-4 text-zinc-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(34,86,138,0.34),transparent_50%),radial-gradient(circle_at_18%_8%,rgba(255,240,180,0.06),transparent_36%),radial-gradient(circle_at_82%_16%,rgba(175,205,255,0.08),transparent_30%),linear-gradient(180deg,#02030a_0%,#040819_45%,#0b1730_100%)]" />

      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 46 }).map((_, index) => {
          const left = ((index * 37) % 100) + 0.3
          const top = ((index * 19) % 100) + 0.2
          const size = 1 + (index % 3)
          const duration = 2.6 + (index % 7) * 0.65
          const delay = (index % 9) * 0.2
          const opacityMax = 0.55 + (index % 4) * 0.08

          return (
            <motion.span
              key={`star-${index}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: '0 0 10px rgba(255,255,255,0.55)',
              }}
              animate={{ opacity: [0.12, opacityMax, 0.2], scale: [0.9, 1.14, 0.94] }}
              transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          )
        })}
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(140deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.08) 36%, rgba(255,255,255,0) 72%)',
          mixBlendMode: 'screen',
        }}
        animate={{ x: ['-18%', '18%'], opacity: [0.08, 0.2, 0.1] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative w-full max-w-md overflow-hidden bg-transparent px-6 py-8 sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute inset-0 " />
        <div className="relative text-center">
          <p className="font-mono text-[14px] uppercase tracking-[0.32em] text-[#c8ddffcc]">Balaton - 2004. 08. 15.</p>
          <h2 className="mt-5 text-2xl font-semibold leading-tight text-[#eef5ff] sm:text-[2rem]">
            Iszol még egy<br/>bloody maryt?
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-1">
            <button
              type="button"
              onClick={onEnter}
              className="rounded-lg border border-[#9dd0ff66] bg-[#13345d99] px-4 py-3 text-sm font-medium text-[#edf6ff] transition hover:bg-[#1a4b83cc] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a6d6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071226]"
            >
              K é r e k
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Balaton({ title, content }: Konyv2PageProps) {
  const [hasEntered, setHasEntered] = useState(false)
  const [isBootFlicker, setIsBootFlicker] = useState(false)
  const [dawnProgress, setDawnProgress] = useState(0)
  const [networkId, setNetworkId] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockSaveMessage, setUnlockSaveMessage] = useState<string | null>(null)

  const etteremAudioRef = useRef<HTMLAudioElement | null>(null)
  const tucsokAudioRef = useRef<HTMLAudioElement | null>(null)
  const dramaLoopAudioRef = useRef<HTMLAudioElement | null>(null)
  const balatonNightAudioRef = useRef<HTMLAudioElement | null>(null)
  const balatonDayAudioRef = useRef<HTMLAudioElement | null>(null)
  const boatAudioRef = useRef<HTMLAudioElement | null>(null)
  const hullamAudioRef = useRef<HTMLAudioElement | null>(null)
  const phoneAudioRef = useRef<HTMLAudioElement | null>(null)
  const drama2AudioRef = useRef<HTMLAudioElement | null>(null)
  const drama3AudioRef = useRef<HTMLAudioElement | null>(null)
  const kidsAudioRef = useRef<HTMLAudioElement | null>(null)
  const kids2AudioRef = useRef<HTMLAudioElement | null>(null)
  const reggaeAudioRef = useRef<HTMLAudioElement | null>(null)
  const splashAudioRef = useRef<HTMLAudioElement | null>(null)

  const etteremFadeTimerRef = useRef<number | null>(null)
  const tucsokFadeTimerRef = useRef<number | null>(null)
  const dramaLoopFadeTimerRef = useRef<number | null>(null)
  const balatonNightFadeTimerRef = useRef<number | null>(null)
  const balatonDayFadeTimerRef = useRef<number | null>(null)
  const boatFadeTimerRef = useRef<number | null>(null)
  const hullamFadeTimerRef = useRef<number | null>(null)
  const reggaeFadeTimerRef = useRef<number | null>(null)

  const desiredAudioPhaseRef = useRef<AudioPhase>('silent')
  const activeAudioPhaseRef = useRef<AudioPhase | null>(null)
  const hasPlayedPhoneCueRef = useRef(false)
  const hasPlayedDrama2CueRef = useRef(false)
  const hasPlayedDrama3Cue1Ref = useRef(false)
  const hasPlayedDrama3Cue2Ref = useRef(false)
  const hasPlayedKidsCueRef = useRef(false)
  const hasPlayedKids2CueRef = useRef(false)
  const hasPlayedReggaeCueRef = useRef(false)
  const hasPlayedSplashCueRef = useRef(false)

  const splitStory = useMemo(() => splitStoryContent(content, true), [content])
  const allParagraphs = splitStory.beforeLock
  const lockParagraphIndex = useMemo(
    () => allParagraphs.findIndex((paragraph) => isDrama3Cue1Line(paragraph.text)),
    [allParagraphs],
  )
  const hasLockGate = lockParagraphIndex >= 0 && lockParagraphIndex < allParagraphs.length - 1
  const beforeLockParagraphs = hasLockGate ? allParagraphs.slice(0, lockParagraphIndex + 1) : allParagraphs
  const afterLockParagraphs = hasLockGate ? allParagraphs.slice(lockParagraphIndex + 1) : []
  const revealAfterLock = !hasLockGate || isUnlocked

  const mixedTextColor = `rgb(${Math.round(164 - 128 * dawnProgress)}, ${Math.round(164 - 118 * dawnProgress)}, ${Math.round(172 - 113 * dawnProgress)})`
  const mixedHeadingColor = `rgb(${Math.round(236 - 136 * dawnProgress)}, ${Math.round(231 - 136 * dawnProgress)}, ${Math.round(220 - 135 * dawnProgress)})`

  useEffect(() => {
    const etterem = new Audio(ETTEREM_LOOP_SRC)
    etterem.loop = true
    etterem.preload = 'auto'
    etterem.volume = ETTEREM_VOLUME

    const tucsok = new Audio(TUCSOK_LOOP_SRC)
    tucsok.loop = true
    tucsok.preload = 'auto'
    tucsok.volume = TUCSOK_VOLUME

    const dramaLoop = new Audio(DRAMA_LOOP_SRC)
    dramaLoop.loop = true
    dramaLoop.preload = 'auto'
    dramaLoop.volume = DRAMA_VOLUME

    const balatonNight = new Audio(BALATON_NIGHT_LOOP_SRC)
    balatonNight.loop = true
    balatonNight.preload = 'auto'
    balatonNight.volume = AMBIENT_VOLUME

    const balatonDay = new Audio(BALATON_DAY_LOOP_SRC)
    balatonDay.loop = true
    balatonDay.preload = 'auto'
    balatonDay.volume = AMBIENT_VOLUME

    const boat = new Audio(BOAT_LOOP_SRC)
    boat.loop = true
    boat.preload = 'auto'
    boat.volume = AMBIENT_VOLUME

    const hullam = new Audio(HULLAM_LOOP_SRC)
    hullam.loop = true
    hullam.preload = 'auto'
    hullam.volume = AMBIENT_VOLUME

    const phone = new Audio(PHONE_LOOP_SRC)
    phone.preload = 'auto'
    phone.volume = 0.9

    const drama2 = new Audio(DRAMA2_SFX_SRC)
    drama2.preload = 'auto'
    drama2.volume = 0.9

    const drama3 = new Audio(DRAMA3_SFX_SRC)
    drama3.preload = 'auto'
    drama3.volume = 0.9

    const kids = new Audio(KIDS_SFX_SRC)
    kids.preload = 'auto'
    kids.volume = 0.88

    const kids2 = new Audio(KIDS2_SFX_SRC)
    kids2.preload = 'auto'
    kids2.volume = 0.92

    const reggae = new Audio(REGGAE_SFX_SRC)
    reggae.preload = 'auto'
    reggae.volume = REGGAE_VOLUME

    const splash = new Audio(SPLASH_SFX_SRC)
    splash.preload = 'auto'
    splash.volume = 0.94

    etteremAudioRef.current = etterem
    tucsokAudioRef.current = tucsok
    dramaLoopAudioRef.current = dramaLoop
    balatonNightAudioRef.current = balatonNight
    balatonDayAudioRef.current = balatonDay
    boatAudioRef.current = boat
    hullamAudioRef.current = hullam
    phoneAudioRef.current = phone
    drama2AudioRef.current = drama2
    drama3AudioRef.current = drama3
    kidsAudioRef.current = kids
    kids2AudioRef.current = kids2
    reggaeAudioRef.current = reggae
    splashAudioRef.current = splash

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

    const playPhoneTwice = () => {
      const phoneAudio = phoneAudioRef.current
      if (!phoneAudio) return

      phoneAudio.loop = false
      phoneAudio.currentTime = 0
      phoneAudio.onended = null
      phoneAudio.onended = () => {
        phoneAudio.currentTime = 0
        phoneAudio.onended = null
        void phoneAudio.play().catch(() => {
          // Ignore autoplay blocks.
        })
      }

      void phoneAudio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playDrama2Once = () => {
      const audio = drama2AudioRef.current
      if (!audio) return
      audio.loop = false
      audio.currentTime = 0
      audio.onended = null
      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playDrama3Once = () => {
      const audio = drama3AudioRef.current
      if (!audio) return
      audio.loop = false
      audio.currentTime = 0
      audio.onended = null
      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playKidsOnce = () => {
      const audio = kidsAudioRef.current
      if (!audio) return
      audio.loop = false
      audio.currentTime = 0
      audio.onended = null
      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playKids2Once = () => {
      const audio = kids2AudioRef.current
      if (!audio) return
      audio.loop = false
      audio.currentTime = 0
      audio.onended = null
      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playReggaeFourTimesWithFade = () => {
      const audio = reggaeAudioRef.current
      if (!audio) return

      if (reggaeFadeTimerRef.current !== null) {
        window.clearInterval(reggaeFadeTimerRef.current)
        reggaeFadeTimerRef.current = null
      }

      const fadeWindowSeconds = 3
      let completedRuns = 0
      let isFinalFadeActive = false

      audio.loop = false
      audio.currentTime = 0
      audio.volume = REGGAE_VOLUME
      audio.onended = null
      audio.ontimeupdate = null

      audio.ontimeupdate = () => {
        if (completedRuns !== 3 || isFinalFadeActive || !Number.isFinite(audio.duration) || audio.duration <= 0) return

        const remaining = audio.duration - audio.currentTime
        if (remaining > fadeWindowSeconds) return

        isFinalFadeActive = true
        if (reggaeFadeTimerRef.current !== null) {
          window.clearInterval(reggaeFadeTimerRef.current)
        }

        reggaeFadeTimerRef.current = window.setInterval(() => {
          const nextRemaining = Math.max(0, audio.duration - audio.currentTime)
          const nextVolume = Math.max(0, Math.min(REGGAE_VOLUME, REGGAE_VOLUME * (nextRemaining / fadeWindowSeconds)))
          audio.volume = nextVolume

          if (nextRemaining <= 0.05) {
            if (reggaeFadeTimerRef.current !== null) {
              window.clearInterval(reggaeFadeTimerRef.current)
              reggaeFadeTimerRef.current = null
            }
            audio.volume = 0
          }
        }, 90)
      }

      audio.onended = () => {
        completedRuns += 1
        if (completedRuns < 4) {
          audio.currentTime = 0
          audio.volume = REGGAE_VOLUME
          void audio.play().catch(() => {
            // Ignore autoplay blocks.
          })
          return
        }

        if (reggaeFadeTimerRef.current !== null) {
          window.clearInterval(reggaeFadeTimerRef.current)
          reggaeFadeTimerRef.current = null
        }

        audio.onended = null
        audio.ontimeupdate = null
        audio.currentTime = 0
        audio.volume = REGGAE_VOLUME
      }

      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
    }

    const playSplashOnce = () => {
      const audio = splashAudioRef.current
      if (!audio) return
      audio.loop = false
      audio.currentTime = 0
      audio.onended = null
      void audio.play().catch(() => {
        // Ignore autoplay blocks.
      })
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

      const currentEtterem = etteremAudioRef.current
      const currentTucsok = tucsokAudioRef.current
      const currentDramaLoop = dramaLoopAudioRef.current
      const currentBalatonNight = balatonNightAudioRef.current
      const currentBalatonDay = balatonDayAudioRef.current
      const currentBoat = boatAudioRef.current
      const currentHullam = hullamAudioRef.current

      if (!currentEtterem || !currentTucsok || !currentDramaLoop || !currentBalatonNight || !currentBalatonDay || !currentBoat || !currentHullam) {
        return
      }

      if (nextPhase !== 'etterem') stopWithFade(currentEtterem, ETTEREM_VOLUME, etteremFadeTimerRef)
      if (nextPhase !== 'tucsok') stopWithFade(currentTucsok, TUCSOK_VOLUME, tucsokFadeTimerRef)
      if (nextPhase !== 'tension2') stopWithFade(currentDramaLoop, DRAMA_VOLUME, dramaLoopFadeTimerRef)
      if (nextPhase !== 'balaton-night') stopWithFade(currentBalatonNight, AMBIENT_VOLUME, balatonNightFadeTimerRef)
      if (nextPhase !== 'balaton-day') stopWithFade(currentBalatonDay, AMBIENT_VOLUME, balatonDayFadeTimerRef)
      if (nextPhase !== 'boat') stopWithFade(currentBoat, AMBIENT_VOLUME, boatFadeTimerRef)
      if (nextPhase !== 'hullam') stopWithFade(currentHullam, AMBIENT_VOLUME, hullamFadeTimerRef)

      if (nextPhase === 'etterem') playFromStart(currentEtterem, ETTEREM_VOLUME, etteremFadeTimerRef)
      if (nextPhase === 'tucsok') playFromStart(currentTucsok, TUCSOK_VOLUME, tucsokFadeTimerRef)
      if (nextPhase === 'tension2') playFromStart(currentDramaLoop, DRAMA_VOLUME, dramaLoopFadeTimerRef)
      if (nextPhase === 'balaton-night') playFromStart(currentBalatonNight, AMBIENT_VOLUME, balatonNightFadeTimerRef)
      if (nextPhase === 'balaton-day') playFromStart(currentBalatonDay, AMBIENT_VOLUME, balatonDayFadeTimerRef)
      if (nextPhase === 'boat') playFromStart(currentBoat, AMBIENT_VOLUME, boatFadeTimerRef)
      if (nextPhase === 'hullam') playFromStart(currentHullam, AMBIENT_VOLUME, hullamFadeTimerRef)

      activeAudioPhaseRef.current = nextPhase
    }

    const updatePhaseFromViewport = () => {
      if (!hasEntered) {
        applyAudioPhase('silent')
        return
      }

      const viewportCenter = window.innerHeight / 2

      const kidsCueLine = document.querySelector<HTMLElement>('[data-kids-cue="true"]')
      if (kidsCueLine && !hasPlayedKidsCueRef.current && kidsCueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedKidsCueRef.current = true
        playKidsOnce()
      }

      const kids2CueLine = document.querySelector<HTMLElement>('[data-kids2-cue="true"]')
      if (kids2CueLine && !hasPlayedKids2CueRef.current && kids2CueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedKids2CueRef.current = true
        playKids2Once()
      }

      const reggaeCueLine = document.querySelector<HTMLElement>('[data-reggae-cue="true"]')
      if (reggaeCueLine && !hasPlayedReggaeCueRef.current && reggaeCueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedReggaeCueRef.current = true
        playReggaeFourTimesWithFade()
      }

      const splashCueLine = document.querySelector<HTMLElement>('[data-splash-cue="true"]')
      if (splashCueLine && !hasPlayedSplashCueRef.current && splashCueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedSplashCueRef.current = true
        playSplashOnce()
      }

      const etteremStartLine = document.querySelector<HTMLElement>('[data-etterem-start="true"]')
      if (!etteremStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedEtteremStart = etteremStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedEtteremStart) {
        applyAudioPhase('silent')
        return
      }

      const etteremStopLine = document.querySelector<HTMLElement>('[data-etterem-stop="true"]')
      if (!etteremStopLine) {
        applyAudioPhase('etterem')
        return
      }

      const hasReachedEtteremStop = etteremStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedEtteremStop) {
        applyAudioPhase('etterem')
        return
      }

      const tucsokStartLine = document.querySelector<HTMLElement>('[data-tucsok-start="true"]')
      if (!tucsokStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedTucsokStart = tucsokStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTucsokStart) {
        applyAudioPhase('silent')
        return
      }

      const phoneCueLine = document.querySelector<HTMLElement>('[data-phone-cue="true"]')
      if (phoneCueLine && !hasPlayedPhoneCueRef.current && phoneCueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedPhoneCueRef.current = true
        playPhoneTwice()
      }

      const tucsokStopLine = document.querySelector<HTMLElement>('[data-tucsok-stop="true"]')
      if (!tucsokStopLine) {
        applyAudioPhase('tucsok')
        return
      }

      const hasReachedTucsokStop = tucsokStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedTucsokStop) {
        applyAudioPhase('tucsok')
        return
      }

      const dramaStartLine = document.querySelector<HTMLElement>('[data-drama-start="true"]')
      if (!dramaStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedDramaStart = dramaStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedDramaStart) {
        applyAudioPhase('silent')
        return
      }

      const drama2CueLine = document.querySelector<HTMLElement>('[data-drama2-cue="true"]')
      if (drama2CueLine && !hasPlayedDrama2CueRef.current && drama2CueLine.getBoundingClientRect().top <= viewportCenter) {
        hasPlayedDrama2CueRef.current = true
        playDrama2Once()
      }

      const dramaStopLine = document.querySelector<HTMLElement>('[data-drama-stop="true"]')
      if (!dramaStopLine) {
        applyAudioPhase('tension2')
        return
      }

      const hasReachedDramaStop = dramaStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedDramaStop) {
        applyAudioPhase('tension2')
        return
      }

      const balatonNightStartLine = document.querySelector<HTMLElement>('[data-balaton-night-start="true"]')
      if (!balatonNightStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedBalatonNightStart = balatonNightStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBalatonNightStart) {
        applyAudioPhase('silent')
        return
      }

      const balatonNightStopLine = document.querySelector<HTMLElement>('[data-balaton-night-stop="true"]')
      if (!balatonNightStopLine) {
        applyAudioPhase('balaton-night')
        return
      }

      const hasReachedBalatonNightStop = balatonNightStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBalatonNightStop) {
        applyAudioPhase('balaton-night')
        return
      }

      const balatonDayStartLine = document.querySelector<HTMLElement>('[data-balaton-day-start="true"]')
      if (!balatonDayStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedBalatonDayStart = balatonDayStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBalatonDayStart) {
        applyAudioPhase('silent')
        return
      }

      const balatonDayStopLine = document.querySelector<HTMLElement>('[data-balaton-day-stop="true"]')
      if (!balatonDayStopLine) {
        applyAudioPhase('balaton-day')
        return
      }

      const hasReachedBalatonDayStop = balatonDayStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBalatonDayStop) {
        const boatStartLine = document.querySelector<HTMLElement>('[data-boat-start="true"]')
        if (!boatStartLine) {
          applyAudioPhase('balaton-day')
          return
        }

        const hasReachedBoatStartInner = boatStartLine.getBoundingClientRect().top <= viewportCenter
        applyAudioPhase(hasReachedBoatStartInner ? 'boat' : 'balaton-day')
        return
      }

      const boatStartLine = document.querySelector<HTMLElement>('[data-boat-start="true"]')
      if (!boatStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedBoatStart = boatStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBoatStart) {
        applyAudioPhase('silent')
        return
      }

      const boatStopLine = document.querySelector<HTMLElement>('[data-boat-stop="true"]')
      if (!boatStopLine) {
        applyAudioPhase('boat')
        return
      }

      const hasReachedBoatStop = boatStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedBoatStop) {
        applyAudioPhase('boat')
        return
      }

      const hullamStartLine = document.querySelector<HTMLElement>('[data-hullam-start="true"]')
      if (!hullamStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedHullamStart = hullamStartLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedHullamStart) {
        applyAudioPhase('silent')
        return
      }

      const hullamStopLine = document.querySelector<HTMLElement>('[data-hullam-stop="true"]')
      if (!hullamStopLine) {
        applyAudioPhase('hullam')
        return
      }

      const hasReachedHullamStop = hullamStopLine.getBoundingClientRect().top <= viewportCenter
      if (!hasReachedHullamStop) {
        applyAudioPhase('hullam')
        return
      }

      const boatReturnStartLine = document.querySelector<HTMLElement>('[data-boat-return-start="true"]')
      if (!boatReturnStartLine) {
        applyAudioPhase('silent')
        return
      }

      const hasReachedBoatReturnStart = boatReturnStartLine.getBoundingClientRect().top <= viewportCenter
      if (hasReachedBoatReturnStart) {
        const drama3Cue1Line = document.querySelector<HTMLElement>('[data-drama3-cue1="true"]')
        if (drama3Cue1Line && !hasPlayedDrama3Cue1Ref.current && drama3Cue1Line.getBoundingClientRect().top <= viewportCenter) {
          hasPlayedDrama3Cue1Ref.current = true
          playDrama3Once()
        }

        const drama3Cue2Line = document.querySelector<HTMLElement>('[data-drama3-cue2="true"]')
        if (drama3Cue2Line && !hasPlayedDrama3Cue2Ref.current && drama3Cue2Line.getBoundingClientRect().top <= viewportCenter) {
          hasPlayedDrama3Cue2Ref.current = true
          playDrama3Once()
        }
      }

      applyAudioPhase(hasReachedBoatReturnStart ? 'boat' : 'silent')
    }

    applyAudioPhase('silent')
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

      const timers = [
        etteremFadeTimerRef,
        tucsokFadeTimerRef,
        dramaLoopFadeTimerRef,
        balatonNightFadeTimerRef,
        balatonDayFadeTimerRef,
        boatFadeTimerRef,
        hullamFadeTimerRef,
      ]

      timers.forEach((timerRef) => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current)
          timerRef.current = null
        }
      })

      ;[
        etterem,
        tucsok,
        dramaLoop,
        balatonNight,
        balatonDay,
        boat,
        hullam,
        phone,
        drama2,
        drama3,
        kids,
        kids2,
        reggae,
        splash,
      ].forEach((audio) => {
        audio.pause()
        audio.currentTime = 0
      })

      if (reggaeFadeTimerRef.current !== null) {
        window.clearInterval(reggaeFadeTimerRef.current)
        reggaeFadeTimerRef.current = null
      }

      etteremAudioRef.current = null
      tucsokAudioRef.current = null
      dramaLoopAudioRef.current = null
      balatonNightAudioRef.current = null
      balatonDayAudioRef.current = null
      boatAudioRef.current = null
      hullamAudioRef.current = null
      phoneAudioRef.current = null
      drama2AudioRef.current = null
      drama3AudioRef.current = null
      kidsAudioRef.current = null
      kids2AudioRef.current = null
      reggaeAudioRef.current = null
      splashAudioRef.current = null

      hasPlayedPhoneCueRef.current = false
      hasPlayedDrama2CueRef.current = false
      hasPlayedDrama3Cue1Ref.current = false
      hasPlayedDrama3Cue2Ref.current = false
      hasPlayedKidsCueRef.current = false
      hasPlayedKids2CueRef.current = false
      hasPlayedReggaeCueRef.current = false
      hasPlayedSplashCueRef.current = false
      activeAudioPhaseRef.current = null
    }
  }, [hasEntered, allParagraphs.length, isUnlocked])

  useEffect(() => {
    if (!hasEntered) {
      setDawnProgress(0)
      return
    }

    const updateDawnFromViewport = () => {
      const dawnLine = document.querySelector<HTMLElement>('[data-dawn-trigger="true"]')
      if (!dawnLine) {
        setDawnProgress(0)
        return
      }

      const rect = dawnLine.getBoundingClientRect()
      const viewportCenter = window.innerHeight * 0.56
      const transitionDistance = window.innerHeight * 0.6
      const rawProgress = (viewportCenter - rect.top) / transitionDistance
      const clampedProgress = Math.max(0, Math.min(1, rawProgress))

      setDawnProgress((previous) => (Math.abs(previous - clampedProgress) < 0.01 ? previous : clampedProgress))
    }

    updateDawnFromViewport()
    window.addEventListener('scroll', updateDawnFromViewport, { passive: true })
    window.addEventListener('resize', updateDawnFromViewport)

    return () => {
      window.removeEventListener('scroll', updateDawnFromViewport)
      window.removeEventListener('resize', updateDawnFromViewport)
    }
  }, [hasEntered, beforeLockParagraphs.length, afterLockParagraphs.length, revealAfterLock])

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!networkId || isUnlocking || isUnlocked) return

    setIsUnlocking(true)
    setUnlockSaveMessage(null)

    const trimmedNetworkId = networkId.trim()
    const unlockDelay = new Promise((resolve) => setTimeout(resolve, 800))
    const persistRequest = fetch('/api/konyv/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: trimmedNetworkId,
        storySlug: STORY_UNLOCK_SLUG,
      }),
    })

    try {
      const response = await persistRequest
      if (!response.ok) {
        setUnlockSaveMessage('Az email mentese most nem sikerult, de a feloldas tovabbhalad.')
      }
    } catch {
      setUnlockSaveMessage('Az email mentese most nem sikerult, de a feloldas tovabbhalad.')
    }

    await unlockDelay
    setIsUnlocking(false)
    setIsUnlocked(true)
  }

  const handleEnter = () => {
    setIsBootFlicker(true)
    setHasEntered(true)
    window.setTimeout(() => setIsBootFlicker(false), 260)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
      {!hasEntered && <EntryGate onEnter={handleEnter} />}

      <NightToDawnBackground dawnProgress={dawnProgress} />

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
        <motion.article className="relative z-20 mx-auto w-full max-w-[24rem] px-5 pb-20 pt-14 sm:max-w-[31.2rem] sm:px-7 sm:pt-20">
          <header className="mb-8">
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-green-500">terminal_06.log</p>
            <h1
              className="text-[2.65rem] font-bold leading-[0.95] tracking-[-0.03em] text-[#ece7dc] sm:text-[3.65rem]"
              style={{ fontFamily: 'Trebuchet MS, Verdana, Arial, sans-serif', color: mixedHeadingColor, transition: 'color 450ms ease' }}
            >
              <span className="relative inline-block">{title}</span>
            </h1>
          </header>

          {beforeLockParagraphs.length > 0 ? (
            <div
              className="mx-auto w-full max-w-[20rem] space-y-7 text-left text-[1.13rem] leading-8 sm:max-w-[30.5rem]"
              style={{
                color: mixedTextColor,
                textShadow: dawnProgress < 0.52 ? '0 1px 2px rgba(0,0,0,0.45)' : '0 1px 0 rgba(255,255,255,0.35)',
                transition: 'color 450ms ease, text-shadow 450ms ease',
              }}
            >
              {beforeLockParagraphs.map((paragraph, idx) => (
                <motion.p
                  key={paragraph.id}
                  data-para-id={paragraph.id}
                  data-paragraph-order={idx}
                  data-etterem-start={isEtteremStartLine(paragraph.text) ? 'true' : undefined}
                  data-etterem-stop={isEtteremStopLine(paragraph.text) ? 'true' : undefined}
                  data-tucsok-start={isTucsokStartLine(paragraph.text) ? 'true' : undefined}
                  data-phone-cue={isPhoneCueLine(paragraph.text) ? 'true' : undefined}
                  data-tucsok-stop={isTucsokStopLine(paragraph.text) ? 'true' : undefined}
                  data-drama-start={isDramaStartLine(paragraph.text) ? 'true' : undefined}
                  data-drama-stop={isDramaStopLine(paragraph.text) ? 'true' : undefined}
                  data-drama2-cue={isDrama2CueLine(paragraph.text) ? 'true' : undefined}
                  data-drama3-cue1={isDrama3Cue1Line(paragraph.text) ? 'true' : undefined}
                  data-drama3-cue2={isDrama3Cue2Line(paragraph.text) ? 'true' : undefined}
                  data-kids-cue={isKidsCueLine(paragraph.text) ? 'true' : undefined}
                  data-kids2-cue={isKids2CueLine(paragraph.text) ? 'true' : undefined}
                  data-reggae-cue={isReggaeCueLine(paragraph.text) ? 'true' : undefined}
                  data-splash-cue={isSplashCueLine(paragraph.text) ? 'true' : undefined}
                  data-dawn-trigger={isDawnTransitionLine(paragraph.text) ? 'true' : undefined}
                  data-balaton-night-start={isBalatonNightStartLine(paragraph.text) ? 'true' : undefined}
                  data-balaton-night-stop={isBalatonNightStopLine(paragraph.text) ? 'true' : undefined}
                  data-balaton-day-start={isBalatonDayStartLine(paragraph.text) ? 'true' : undefined}
                  data-balaton-day-stop={isBalatonDayStopLine(paragraph.text) ? 'true' : undefined}
                  data-boat-start={isBoatStartLine(paragraph.text) ? 'true' : undefined}
                  data-boat-stop={isBoatStopLine(paragraph.text) ? 'true' : undefined}
                  data-hullam-start={isHullamStartLine(paragraph.text) ? 'true' : undefined}
                  data-hullam-stop={isHullamStopLine(paragraph.text) ? 'true' : undefined}
                  data-boat-return-start={isBoatReturnStartLine(paragraph.text) ? 'true' : undefined}
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
            <EmailUnlockGate
              value={networkId}
              onChange={setNetworkId}
              onSubmit={handleUnlock}
              isUnlocking={isUnlocking}
              saveMessage={unlockSaveMessage}
              promptText="[ ADD MEG AZ EMAILCÍMED A TITKOSÍTÁS FELOLDÁSÁHOZ. ]"
              helperText="Az emailcim rogzitjuk a novella feloldasi erdeklodeshez."
            />
          )}

          <AnimatePresence>
            {revealAfterLock && afterLockParagraphs.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="mx-auto mt-10 w-full max-w-[18rem] space-y-7 pt-8 text-left text-[1.13rem] leading-8 sm:max-w-[30.5rem]"
                style={{
                  color: mixedTextColor,
                  textShadow: dawnProgress < 0.52 ? '0 1px 2px rgba(0,0,0,0.45)' : '0 1px 0 rgba(255,255,255,0.35)',
                  transition: 'color 450ms ease, text-shadow 450ms ease',
                }}
              >
                {afterLockParagraphs.map((paragraph, idx) => (
                  <motion.p
                    key={paragraph.id}
                    data-para-id={paragraph.id}
                    data-paragraph-order={beforeLockParagraphs.length + idx}
                    data-etterem-start={isEtteremStartLine(paragraph.text) ? 'true' : undefined}
                    data-etterem-stop={isEtteremStopLine(paragraph.text) ? 'true' : undefined}
                    data-tucsok-start={isTucsokStartLine(paragraph.text) ? 'true' : undefined}
                    data-phone-cue={isPhoneCueLine(paragraph.text) ? 'true' : undefined}
                    data-tucsok-stop={isTucsokStopLine(paragraph.text) ? 'true' : undefined}
                    data-drama-start={isDramaStartLine(paragraph.text) ? 'true' : undefined}
                    data-drama-stop={isDramaStopLine(paragraph.text) ? 'true' : undefined}
                    data-drama2-cue={isDrama2CueLine(paragraph.text) ? 'true' : undefined}
                    data-drama3-cue1={isDrama3Cue1Line(paragraph.text) ? 'true' : undefined}
                    data-drama3-cue2={isDrama3Cue2Line(paragraph.text) ? 'true' : undefined}
                    data-kids-cue={isKidsCueLine(paragraph.text) ? 'true' : undefined}
                    data-kids2-cue={isKids2CueLine(paragraph.text) ? 'true' : undefined}
                    data-reggae-cue={isReggaeCueLine(paragraph.text) ? 'true' : undefined}
                    data-splash-cue={isSplashCueLine(paragraph.text) ? 'true' : undefined}
                    data-dawn-trigger={isDawnTransitionLine(paragraph.text) ? 'true' : undefined}
                    data-balaton-night-start={isBalatonNightStartLine(paragraph.text) ? 'true' : undefined}
                    data-balaton-night-stop={isBalatonNightStopLine(paragraph.text) ? 'true' : undefined}
                    data-balaton-day-start={isBalatonDayStartLine(paragraph.text) ? 'true' : undefined}
                    data-balaton-day-stop={isBalatonDayStopLine(paragraph.text) ? 'true' : undefined}
                    data-boat-start={isBoatStartLine(paragraph.text) ? 'true' : undefined}
                    data-boat-stop={isBoatStopLine(paragraph.text) ? 'true' : undefined}
                    data-hullam-start={isHullamStartLine(paragraph.text) ? 'true' : undefined}
                    data-hullam-stop={isHullamStopLine(paragraph.text) ? 'true' : undefined}
                    data-boat-return-start={isBoatReturnStartLine(paragraph.text) ? 'true' : undefined}
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

          {revealAfterLock && (
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

            <div className="relative left-1/2 mt-6 w-screen -translate-x-1/2 sm:left-auto sm:w-full sm:translate-x-0">
              <SupportersTicker names={SUPPORTER_NAMES} label="Tamogatok nevei" className="bg-black/70" />
            </div>
            </section>
          )}
        </motion.article>
      )}
    </main>
  )
}

function isEtteremStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(ETTEREM_START_PHRASE)
}

function isEtteremStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(ETTEREM_STOP_PHRASE)
}

function isTucsokStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(TUCSOK_START_PHRASE)
}

function isPhoneCueLine(text: string): boolean {
  return normalizeForMatch(text).includes(PHONE_CUE_PHRASE)
}

function isTucsokStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(TUCSOK_STOP_PHRASE)
}

function isDramaStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(DRAMA_START_PHRASE)
}

function isDramaStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(DRAMA_STOP_PHRASE)
}

function isDrama2CueLine(text: string): boolean {
  return normalizeForMatch(text).includes(DRAMA2_CUE_PHRASE)
}

function isDrama3Cue1Line(text: string): boolean {
  return normalizeForMatch(text).includes(DRAMA3_CUE1_PHRASE)
}

function isDrama3Cue2Line(text: string): boolean {
  return normalizeForMatch(text).includes(DRAMA3_CUE2_PHRASE)
}

function isKidsCueLine(text: string): boolean {
  return normalizeForMatch(text).includes(KIDS_CUE_PHRASE)
}

function isKids2CueLine(text: string): boolean {
  return normalizeForMatch(text).includes(KIDS2_CUE_PHRASE)
}

function isReggaeCueLine(text: string): boolean {
  return normalizeForMatch(text).includes(REGGAE_CUE_PHRASE)
}

function isSplashCueLine(text: string): boolean {
  return normalizeForMatch(text).includes(SPLASH_CUE_PHRASE)
}

function isDawnTransitionLine(text: string): boolean {
  return normalizeForMatch(text).includes(DAWN_TRANSITION_PHRASE)
}

function isBalatonNightStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(BALATON_NIGHT_START_PHRASE)
}

function isBalatonNightStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(BALATON_NIGHT_STOP_PHRASE)
}

function isBalatonDayStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(BALATON_DAY_START_PHRASE)
}

function isBalatonDayStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(BALATON_DAY_STOP_PHRASE)
}

function isBoatStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(BOAT_START_PHRASE)
}

function isBoatStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(BOAT_STOP_PHRASE)
}

function isHullamStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(HULLAM_START_PHRASE)
}

function isHullamStopLine(text: string): boolean {
  return normalizeForMatch(text).includes(HULLAM_STOP_PHRASE)
}

function isBoatReturnStartLine(text: string): boolean {
  return normalizeForMatch(text).includes(BOAT_RETURN_START_PHRASE)
}

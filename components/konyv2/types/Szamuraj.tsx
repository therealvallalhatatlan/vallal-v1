'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import type { Konyv2PageProps } from '@/components/konyv2/props'
import { EmailUnlockGate } from '@/components/konyv2/EmailUnlockGate'

/**
 * UI type: szamuraj
 * Digital installation version with entry gate, audio layers, and story lock interaction.
 */
const DEFAULT_BG_NOISE = '/audio/bg-cybercafe.wav'
const DEFAULT_ACID_LOOP = '/audio/acid-climax.wav'
const DEFAULT_ACID_LOOP_2 = '/audio/acid-climax2.wav'
const DEFAULT_CLICK_SFX = '/audio/ui-click.wav'
const DEFAULT_GLITCH_SFX = '/audio/sfx-glitch.wav'
const DEFAULT_LIGHTER_SFX = '/audio/sfx-lighter.wav'
const DEFAULT_TRAFFIC_SFX = '/audio/sfx-traffic.wav'
const DEFAULT_ACCESS_SFX = '/audio/access.wav'

const SIMULATOR_STORAGE_KEY = 'konyv2.szamuraj.simulator.v2'
const STORY_UNLOCK_SLUG = 'prezentacio-szamurajkarddal'
const SIM_WARNING_THRESHOLD = 6
const SIM_CRITICAL_THRESHOLD = 9
const SIM_CRASH_THRESHOLD = 12
const SIM_SOFT_CASH_CRASH = -8
const SIM_INEVITABLE_CRASH_ROUND = 10
const SIM_EVENT_LOG_LIMIT = 6
const CUE_CENTER_TOLERANCE_RATIO = 0.18

type SimulatorPhase = 'running' | 'warning' | 'critical' | 'crashed'

interface SimulatorOption {
  id: string
  label: string
  stress: number
  queue: number
  cash: number
  resultLine: string
}

interface SimulatorScenario {
  id: string
  prompt: string
  options: SimulatorOption[]
  rare?: boolean
}

interface SimulatorEventLogItem {
  id: string
  round: number
  line: string
}

interface SimulatorDelta {
  stress: number
  queue: number
  cash: number
}

interface SimulatorSnapshot {
  queueIds: string[]
  queueIndex: number
  round: number
  stress: number
  queue: number
  cash: number
  phase: SimulatorPhase
  crashCode: string | null
  lastDelta: SimulatorDelta | null
  lastResultLine: string
  eventLog: SimulatorEventLogItem[]
}

const SIMULATOR_SCENARIOS: SimulatorScenario[] = [
  {
    id: 'galamb',
    prompt: 'Mennyi ido alatt puhul meg egy galamb?',
    options: [
      { id: 'g-1', label: 'Kamu szakertokent valaszolsz.', stress: 2, queue: 1, cash: 0, resultLine: 'A vendeg bologat, a sor idegesen morog.' },
      { id: 'g-2', label: 'Rovidre zarod: allatkert, kovetkezo.', stress: 1, queue: -1, cash: 1, resultLine: 'A sor halad, de valaki felhaborodik.' },
      { id: 'g-3', label: 'Google-t nyitsz neki, szegyen nelkul.', stress: -1, queue: 2, cash: 0, resultLine: 'Kevesebb a belso panik, nagyobb a sor.' },
    ],
  },
  {
    id: 'halotti',
    prompt: 'Kinyomtatnad nekem ezt a halotti bizonyitvanyt?',
    options: [
      { id: 'h-1', label: 'Kinyomtatod, kerdes nelkul.', stress: 2, queue: 1, cash: 2, resultLine: 'Penz jon, de mar kezded gyulolni a muszakot.' },
      { id: 'h-2', label: 'Elkuldesz mindenkit az onkormanyzathoz.', stress: 1, queue: -2, cash: -1, resultLine: 'Feszultseg marad, de urul a pult.' },
      { id: 'h-3', label: 'Folyosora iranyitod, hatha elfelejti.', stress: 0, queue: 1, cash: 0, resultLine: 'A problema csak arrabb sodrodik.' },
    ],
  },
  {
    id: 'okirat',
    prompt: 'Alairnad ezt az okiratot?',
    options: [
      { id: 'o-1', label: 'Alairsz valami olvashatatlant.', stress: 3, queue: 1, cash: 0, resultLine: 'A gyomrod osszerandul, valami itt nagyon nem tiszta.' },
      { id: 'o-2', label: 'Hivataloskodsz: pecset nelkul nem lehet.', stress: 1, queue: 0, cash: 1, resultLine: 'Az ugyfel duzzog, de fizet egy fel orat.' },
      { id: 'o-3', label: 'Kibujasz: nem te vagy illetekes.', stress: 0, queue: -1, cash: 0, resultLine: 'Egy gonddal kevesebb, masik mar jon is.' },
    ],
  },
  {
    id: 'pecset',
    prompt: 'Tudnal rakni erre egy pecsetet?',
    options: [
      { id: 'p-1', label: 'Belyegzot rajzolsz filccel.', stress: 2, queue: 1, cash: 1, resultLine: 'A kreativitasod torvenyi szurkezonaba csuszik.' },
      { id: 'p-2', label: 'Kersz extra dijat a semmiert.', stress: 1, queue: 1, cash: 2, resultLine: 'Kassza no, lelkiismeret csokken.' },
      { id: 'p-3', label: 'Visszautasitod udvariasan.', stress: 0, queue: -1, cash: -1, resultLine: 'A helyzet csillapodik, a bevetel nem.' },
    ],
  },
  {
    id: 'eki',
    prompt: 'Ekitek van?',
    options: [
      { id: 'e-1', label: 'Viccelodsz, hogy USB-ben igen.', stress: -1, queue: 1, cash: 0, resultLine: 'Nevetes hallatszik, de a sor nem fogy.' },
      { id: 'e-2', label: 'Szigoruan kiterelsz mindenkit.', stress: 1, queue: -1, cash: 0, resultLine: 'Rend lesz, de mindenki utal egy kicsit.' },
      { id: 'e-3', label: 'Ugy teszel, mintha nem ertened.', stress: 0, queue: 2, cash: 0, resultLine: 'A zavar kozos, a nyomas no.' },
    ],
  },
  {
    id: 'kulcsmasolas',
    prompt: 'Le tudod masolni ezt a lakatkulcsot A4-ben?',
    options: [
      { id: 'k-1', label: 'Lefenymasolod 400%-on.', stress: 2, queue: 1, cash: 1, resultLine: 'A papir kijon, a valosag megreped.' },
      { id: 'k-2', label: 'Elmagyarázod, miert abszurd.', stress: 1, queue: -1, cash: 0, resultLine: 'A logika gyoz, de dragan.' },
      { id: 'k-3', label: 'Atkuldöd a szomszed kulcsmasoloba.', stress: -1, queue: -1, cash: -1, resultLine: 'Csend lesz, penz kevesebb.' },
    ],
  },
  {
    id: 'fagyott-nyomtato',
    prompt: 'A nyomtato papirt ker, de tele van papírral.',
    options: [
      { id: 'n-1', label: 'Kirugdosod, mint regi tv-t.', stress: 3, queue: 2, cash: 0, resultLine: 'A gep felzokog, a sor tombol.' },
      { id: 'n-2', label: 'Ujrainditas + ima.', stress: 1, queue: 1, cash: 0, resultLine: 'Par masodperc nyersz, nem tobbet.' },
      { id: 'n-3', label: 'Kezzel irod ki: SZERVIZ.', stress: 0, queue: 3, cash: -2, resultLine: 'A rendszer ved, a sor felrobban.' },
    ],
  },
  {
    id: 'apró',
    prompt: 'Valaki 20 000-esbol ker 80 forint aprot.',
    options: [
      { id: 'a-1', label: 'Kiszórod a kasszat az asztalra.', stress: 2, queue: 1, cash: -2, resultLine: 'A tekintelyed zuhan, a kaosz no.' },
      { id: 'a-2', label: 'Elutasitod, mint banki szolgaltatast.', stress: 1, queue: -1, cash: 0, resultLine: 'A sor tapsol, az ugyfel atkozodik.' },
      { id: 'a-3', label: 'Eladod neki csomagoltan, kezelesi dijjal.', stress: 1, queue: 1, cash: 2, resultLine: 'Profit lett, emberseg kevesebb.' },
    ],
  },
  {
    id: 'lsd-shift',
    prompt: 'A monitor hullamzik, mindenki egyszerre kerdez.',
    options: [
      { id: 'l-1', label: 'Mindenkinek azt mondod: egy perc.', stress: 2, queue: 2, cash: 0, resultLine: 'A "egy perc" mar tobbes szamu igeret.' },
      { id: 'l-2', label: 'Kihangositod: sorban! sorban!', stress: 1, queue: -1, cash: 0, resultLine: 'Par masodpercre katonai rend lesz.' },
      { id: 'l-3', label: 'Vizet iszol es lassitasz.', stress: -2, queue: 1, cash: -1, resultLine: 'Belul jobb, kivul rosszabb.' },
    ],
  },
  {
    id: 'orokbefogadas',
    rare: true,
    prompt: 'Valaki hamis orokbefogadasi papirt akar hitelesiteni.',
    options: [
      { id: 'r-1', label: 'Mereven nemet mondasz.', stress: 1, queue: -1, cash: 0, resultLine: 'Jo dontes, de raz a hideg.' },
      { id: 'r-2', label: 'Megprobalod semlegesen kezelni.', stress: 3, queue: 1, cash: 1, resultLine: 'A semlegesseg most is felfalja az idegeid.' },
      { id: 'r-3', label: 'Kiterelsz mindenkit 2 percre.', stress: 0, queue: 3, cash: -1, resultLine: 'Mindent leallitasz, hogy tulelj.' },
    ],
  },
  {
    id: 'beragadt-ajtó',
    rare: true,
    prompt: 'A bejarati ajto beragad, a sor nem mozog.',
    options: [
      { id: 'b-1', label: 'Labban feszited ki.', stress: 2, queue: 1, cash: 0, resultLine: 'Kinyilik, de te mar remegsz.' },
      { id: 'b-2', label: 'Mindenkit hatrairanyitasz.', stress: 1, queue: 2, cash: -1, resultLine: 'Atmeneti megoldas, tartos idegkar.' },
      { id: 'b-3', label: 'Lakatost hivsz azonnal.', stress: 0, queue: 3, cash: -2, resultLine: 'Profi dontes, draga pillanat.' },
    ],
  },
]

type CueType = 'lighter' | 'horn' | 'acid' | 'acid2' | 'internetezni'
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
  acid: ['pixi a nappali muszakos'],
  acid2: ['dolgozik bennem az lsd'],
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

function shuffle<T>(source: T[]): T[] {
  const cloned = [...source]

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = cloned[i]
    cloned[i] = cloned[j]
    cloned[j] = temp
  }

  return cloned
}

function getSimulatorScenarioById(id: string): SimulatorScenario | undefined {
  return SIMULATOR_SCENARIOS.find((scenario) => scenario.id === id)
}

function buildScenarioQueue(length = 12): string[] {
  const rare = SIMULATOR_SCENARIOS.filter((scenario) => scenario.rare)
  const normal = SIMULATOR_SCENARIOS.filter((scenario) => !scenario.rare)

  const normalIds = shuffle(normal.map((scenario) => scenario.id))
  const selectedNormal = normalIds.slice(0, Math.max(0, length - 1))
  const queue = [...selectedNormal]

  if (rare.length > 0) {
    const rarePick = rare[Math.floor(Math.random() * rare.length)]
    const insertAt = Math.min(queue.length, 2 + Math.floor(Math.random() * Math.max(1, queue.length - 1)))
    queue.splice(insertAt, 0, rarePick.id)
  }

  return queue.slice(0, length)
}

function getSimulatorPhase(stress: number, queue: number, cash: number): SimulatorPhase {
  if (stress >= SIM_CRASH_THRESHOLD || queue >= SIM_CRASH_THRESHOLD || cash <= SIM_SOFT_CASH_CRASH) {
    return 'crashed'
  }

  if (stress >= SIM_CRITICAL_THRESHOLD || queue >= SIM_CRITICAL_THRESHOLD || cash <= -4) {
    return 'critical'
  }

  if (stress >= SIM_WARNING_THRESHOLD || queue >= SIM_WARNING_THRESHOLD || cash <= -1) {
    return 'warning'
  }

  return 'running'
}

function getCrashCode(stress: number, queue: number, cash: number, round: number): string {
  if (round >= SIM_INEVITABLE_CRASH_ROUND) return 'ERROR_0x0A: MUSZAKVEGI_OSSZEOMLAS'
  if (stress >= SIM_CRASH_THRESHOLD) return 'ERROR_0x06: IDEGRENDSZER_TULTERHELT'
  if (queue >= SIM_CRASH_THRESHOLD) return 'ERROR_0x07: SORFAL_TORODAS'
  if (cash <= SIM_SOFT_CASH_CRASH) return 'ERROR_0x08: KASSZA_NEGATIV'
  return 'ERROR_0x09: RENDSZER_HIBA'
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

function playOneShot(audio: HTMLAudioElement | null, volume = 1) {
  if (!audio) return
  audio.loop = false
  audio.volume = volume
  audio.currentTime = 0
  void safePlay(audio)
}

function fadeInAudio(audio: HTMLAudioElement | null, durationMs = 1500, targetVolume = 1, loop = false) {
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

function fadeOutAndStopAudio(audio: HTMLAudioElement | null, durationMs = 900) {
  if (!audio) return

  const startVolume = audio.volume
  if (startVolume <= 0.01) {
    audio.pause()
    audio.currentTime = 0
    audio.loop = false
    audio.volume = 0
    return
  }

  const start = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / durationMs)
    audio.volume = Math.max(0, startVolume * (1 - progress))

    if (progress < 1) {
      requestAnimationFrame(tick)
      return
    }

    audio.pause()
    audio.currentTime = 0
    audio.loop = false
    audio.volume = 0
  }

  requestAnimationFrame(tick)
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

export default function Szamuraj({ title, content }: Konyv2PageProps) {
  const [hasEntered, setHasEntered] = useState(false)
  const [isBootFlicker, setIsBootFlicker] = useState(false)
  const [isTitleGlitching, setIsTitleGlitching] = useState(false)
  const [simQueueIds, setSimQueueIds] = useState<string[]>([])
  const [simQueueIndex, setSimQueueIndex] = useState(0)
  const [simRound, setSimRound] = useState(1)
  const [simStress, setSimStress] = useState(2)
  const [simQueue, setSimQueue] = useState(2)
  const [simCash, setSimCash] = useState(1)
  const [simPhase, setSimPhase] = useState<SimulatorPhase>('running')
  const [simCrashCode, setSimCrashCode] = useState<string | null>(null)
  const [simEventLog, setSimEventLog] = useState<SimulatorEventLogItem[]>([])
  const [simLastResultLine, setSimLastResultLine] = useState('A muszak elindult. A sor mar most furcsan nez.')
  const [simLastDelta, setSimLastDelta] = useState<SimulatorDelta | null>(null)
  const [simPromptDisplay, setSimPromptDisplay] = useState('')
  const [isSimPromptTyping, setIsSimPromptTyping] = useState(false)
  const [isSimulatorCollapsed, setIsSimulatorCollapsed] = useState(false)
  const [networkId, setNetworkId] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [unlockSaveMessage, setUnlockSaveMessage] = useState<string | null>(null)

  const bgNoiseRef = useRef<HTMLAudioElement | null>(null)
  const acidLoopRef = useRef<HTMLAudioElement | null>(null)
  const acidLoop2Ref = useRef<HTMLAudioElement | null>(null)
  const sfxClickRef = useRef<HTMLAudioElement | null>(null)
  const sfxGlitchRef = useRef<HTMLAudioElement | null>(null)
  const sfxLighterRef = useRef<HTMLAudioElement | null>(null)
  const sfxTrafficRef = useRef<HTMLAudioElement | null>(null)
  const sfxAccessRef = useRef<HTMLAudioElement | null>(null)
  const cueInCenterZoneRef = useRef<Record<CueType, boolean>>({
    lighter: false,
    horn: false,
    acid: false,
    acid2: false,
    internetezni: false,
  })
  const acidIsPlayingRef = useRef(false)
  const acid2IsPlayingRef = useRef(false)
  const cueNodeMapRef = useRef<Map<CueType, Set<HTMLElement>>>(new Map())
  const rafRef = useRef<number | null>(null)
  const simulatorHydratedRef = useRef(false)

  const splitStory = useMemo(() => splitStoryContent(content), [content])
  const hasLockGate = splitStory.afterLock.length > 0
  const revealAfterLock = !hasLockGate || isUnlocked
  const currentScenario = useMemo(() => {
    const scenarioId = simQueueIds[simQueueIndex]
    if (!scenarioId) return null
    return getSimulatorScenarioById(scenarioId) ?? null
  }, [simQueueIds, simQueueIndex])

  const { scrollYProgress } = useScroll()
  const tripAmount = useTransform(scrollYProgress, [0, 0.35, 1], [0, 1.5, 4.8])
  const textBlur = useTransform(scrollYProgress, [0, 1], [0, 1.6])
  const glitchBoost = useTransform(scrollYProgress, [0, 0.8, 0.94, 1], [0, 0.12, 0.55, 0.9])

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

  const startAcidLoop = () => {
    const audio = acidLoopRef.current
    if (!audio) return

    if (acid2IsPlayingRef.current) return
    if (acidIsPlayingRef.current) return

    audio.pause()
    audio.loop = true
    audio.currentTime = 0
    acidIsPlayingRef.current = true
    fadeInAudio(audio, 1400, 1, true)
  }

  const stopAcidLoop = () => {
    const audio = acidLoopRef.current
    if (!audio || !acidIsPlayingRef.current) return

    acidIsPlayingRef.current = false
    fadeOutAndStopAudio(audio, 1000)
  }

  const startAcidLoop2 = () => {
    const audio = acidLoop2Ref.current
    if (!audio) return
    if (acid2IsPlayingRef.current) return

    if (acidIsPlayingRef.current) {
      stopAcidLoop()
    }

    audio.pause()
    audio.loop = true
    audio.currentTime = 0
    acid2IsPlayingRef.current = true
    fadeInAudio(audio, 1200, 1, true)
  }

  const stopAcidLoop2 = () => {
    const audio = acidLoop2Ref.current
    if (!audio || !acid2IsPlayingRef.current) return

    acid2IsPlayingRef.current = false
    fadeOutAndStopAudio(audio, 1000)
  }

  const triggerCue = (cueType: CueType) => {
    if (cueType === 'lighter') {
      playOneShot(sfxLighterRef.current, 1)
      return
    }

    if (cueType === 'horn') {
      playOneShot(sfxTrafficRef.current, 1)
      return
    }

    if (cueType === 'acid') {
      startAcidLoop()
    }

    if (cueType === 'internetezni') {
      playOneShot(sfxGlitchRef.current, 1)
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

    if (cueType === 'acid2') {
      const acid2Nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-cue-type="acid2"]'))
      const viewportBottom = window.scrollY + window.innerHeight

      const shouldPlayAcid2 = acid2Nodes.some((candidate) => {
        const candidateStart = candidate.getBoundingClientRect().top + window.scrollY
        return viewportBottom >= candidateStart
      })

      if (shouldPlayAcid2 && !acid2IsPlayingRef.current) {
        startAcidLoop2()
      }

      if (!shouldPlayAcid2 && acid2IsPlayingRef.current) {
        stopAcidLoop2()
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
      bgNoiseRef.current.volume = 1
    }
    if (acidLoopRef.current) {
      acidLoopRef.current.loop = true
      acidLoopRef.current.volume = 0
    }
    if (acidLoop2Ref.current) {
      acidLoop2Ref.current.loop = true
      acidLoop2Ref.current.volume = 0
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
      if (acidLoop2Ref.current) {
        acidLoop2Ref.current.pause()
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

  const applySimulatorSnapshot = (snapshot: SimulatorSnapshot) => {
    setSimQueueIds(snapshot.queueIds)
    setSimQueueIndex(snapshot.queueIndex)
    setSimRound(snapshot.round)
    setSimStress(snapshot.stress)
    setSimQueue(snapshot.queue)
    setSimCash(snapshot.cash)
    setSimPhase(snapshot.phase)
    setSimCrashCode(snapshot.crashCode)
    setSimLastDelta(snapshot.lastDelta)
    setSimLastResultLine(snapshot.lastResultLine)
    setSimEventLog(snapshot.eventLog.slice(0, SIM_EVENT_LOG_LIMIT))
  }

  const createFreshSimulatorSnapshot = (): SimulatorSnapshot => ({
    queueIds: buildScenarioQueue(),
    queueIndex: 0,
    round: 1,
    stress: 2,
    queue: 2,
    cash: 1,
    phase: 'running',
    crashCode: null,
    lastDelta: null,
    lastResultLine: 'A muszak elindult. A sor mar most furcsan nez.',
    eventLog: [
      {
        id: `boot-${Date.now()}`,
        round: 1,
        line: 'BOOT_OK: netcafe pult aktiv. Sor: 2. Stressz: 2.',
      },
    ],
  })

  const resetSimulatorRun = () => {
    const fresh = createFreshSimulatorSnapshot()
    applySimulatorSnapshot(fresh)
    setIsSimulatorCollapsed(false)
    setSimPromptDisplay('')
    setIsSimPromptTyping(false)
  }

  useEffect(() => {
    if (!hasEntered || simulatorHydratedRef.current) return
    simulatorHydratedRef.current = true

    try {
      const raw = window.sessionStorage.getItem(SIMULATOR_STORAGE_KEY)
      if (!raw) {
        resetSimulatorRun()
        return
      }

      const parsed = JSON.parse(raw) as SimulatorSnapshot
      if (!parsed || !Array.isArray(parsed.queueIds) || parsed.queueIds.length === 0) {
        resetSimulatorRun()
        return
      }

      const validQueue = parsed.queueIds.every((id) => Boolean(getSimulatorScenarioById(id)))
      if (!validQueue) {
        resetSimulatorRun()
        return
      }

      applySimulatorSnapshot({
        ...parsed,
        queueIndex: Math.max(0, Math.min(parsed.queueIndex, parsed.queueIds.length - 1)),
      })
    } catch {
      resetSimulatorRun()
    }
  }, [hasEntered])

  useEffect(() => {
    if (!hasEntered || !currentScenario || simPhase === 'crashed') {
      setSimPromptDisplay('')
      setIsSimPromptTyping(false)
      return
    }

    setIsSimPromptTyping(true)
    setSimPromptDisplay('')

    let index = 0
    let timer = 0

    const tick = () => {
      index += 1
      setSimPromptDisplay(currentScenario.prompt.slice(0, index))

      if (index < currentScenario.prompt.length) {
        timer = window.setTimeout(tick, 16 + Math.random() * 24)
      } else {
        setIsSimPromptTyping(false)
      }
    }

    timer = window.setTimeout(tick, 90)

    return () => {
      window.clearTimeout(timer)
    }
  }, [hasEntered, currentScenario, simPhase])

  useEffect(() => {
    if (!hasEntered || simQueueIds.length === 0) return

    const snapshot: SimulatorSnapshot = {
      queueIds: simQueueIds,
      queueIndex: simQueueIndex,
      round: simRound,
      stress: simStress,
      queue: simQueue,
      cash: simCash,
      phase: simPhase,
      crashCode: simCrashCode,
      lastDelta: simLastDelta,
      lastResultLine: simLastResultLine,
      eventLog: simEventLog.slice(0, SIM_EVENT_LOG_LIMIT),
    }

    try {
      window.sessionStorage.setItem(SIMULATOR_STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Ignore storage quota or privacy mode errors.
    }
  }, [
    hasEntered,
    simQueueIds,
    simQueueIndex,
    simRound,
    simStress,
    simQueue,
    simCash,
    simPhase,
    simCrashCode,
    simLastDelta,
    simLastResultLine,
    simEventLog,
  ])

  useEffect(() => {
    if (!hasEntered || !currentScenario || simPhase === 'crashed') return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const hotkey = Number(event.key)
      if (!Number.isInteger(hotkey) || hotkey < 1 || hotkey > currentScenario.options.length) return

      event.preventDefault()
      const picked = currentScenario.options[hotkey - 1]
      if (picked) {
        handleSimulatorChoice(picked)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasEntered, currentScenario, simPhase, simRound, simStress, simQueue, simCash, simQueueIds, simQueueIndex])

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
    simulatorHydratedRef.current = false
    setHasEntered(true)
    window.setTimeout(() => setIsBootFlicker(false), 260)
  }

  function handleSimulatorChoice(option: SimulatorOption) {
    if (simPhase === 'crashed') return
    if (!currentScenario) return

    playClick(sfxClickRef.current)

    const pressure = Math.floor((simRound - 1) / 2)
    const queuePressure = simRound >= 4 ? 1 : 0
    const cashDrain = simRound >= 6 ? 1 : 0

    const delta: SimulatorDelta = {
      stress: option.stress + pressure,
      queue: option.queue + queuePressure,
      cash: option.cash - cashDrain,
    }

    const nextRound = simRound + 1
    const nextStress = Math.max(0, Math.min(14, simStress + delta.stress))
    const nextQueue = Math.max(0, Math.min(14, simQueue + delta.queue))
    const nextCash = Math.max(-10, Math.min(14, simCash + delta.cash))
    const shouldForceCrash = nextRound >= SIM_INEVITABLE_CRASH_ROUND
    const calculatedPhase = getSimulatorPhase(nextStress, nextQueue, nextCash)
    const nextPhase: SimulatorPhase = shouldForceCrash ? 'crashed' : calculatedPhase

    setSimRound(nextRound)
    setSimStress(nextStress)
    setSimQueue(nextQueue)
    setSimCash(nextCash)
    setSimPhase(nextPhase)
    setSimLastDelta(delta)
    setSimLastResultLine(option.resultLine)
    setSimEventLog((prev) => [
      {
        id: `${currentScenario.id}-${option.id}-${Date.now()}`,
        round: simRound,
        line: `R${simRound}: ${option.resultLine}`,
      },
      ...prev,
    ].slice(0, SIM_EVENT_LOG_LIMIT))

    if (nextPhase === 'crashed') {
      setSimCrashCode(getCrashCode(nextStress, nextQueue, nextCash, nextRound))
      playOneShot(sfxGlitchRef.current, 1)
      return
    }

    setSimCrashCode(null)
    setSimQueueIndex((currentIndex) => {
      const nextIndex = currentIndex + 1

      if (nextIndex >= simQueueIds.length - 1) {
        setSimQueueIds((currentQueueIds) => {
          const extension = buildScenarioQueue(8)
          return [...currentQueueIds, ...extension]
        })
      }

      return nextIndex
    })
  }

  const handleSimulatorRestart = () => {
    playClick(sfxClickRef.current)
    resetSimulatorRun()
  }

  const handleSimulatorContinue = () => {
    playClick(sfxClickRef.current)
    setIsSimulatorCollapsed(true)
  }

  const handleUnlock = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!networkId || isUnlocking || isUnlocked) return

    playClick(sfxClickRef.current)
    playClick(sfxGlitchRef.current)
    playOneShot(sfxAccessRef.current, 1)
    setIsUnlocking(true)

    const trimmedNetworkId = networkId.trim()
    setUnlockSaveMessage(null)

    const unlockDelay = new Promise((resolve) => setTimeout(resolve, 1000))
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100">
      <audio ref={bgNoiseRef} src={DEFAULT_BG_NOISE} preload="auto" />
      <audio ref={acidLoopRef} src={DEFAULT_ACID_LOOP} preload="auto" />
      <audio ref={acidLoop2Ref} src={DEFAULT_ACID_LOOP_2} preload="auto" />
      <audio ref={sfxClickRef} src={DEFAULT_CLICK_SFX} preload="auto" />
      <audio ref={sfxGlitchRef} src={DEFAULT_GLITCH_SFX} preload="auto" />
      <audio ref={sfxLighterRef} src={DEFAULT_LIGHTER_SFX} preload="auto" />
      <audio ref={sfxTrafficRef} src={DEFAULT_TRAFFIC_SFX} preload="auto" />
      <audio ref={sfxAccessRef} src={DEFAULT_ACCESS_SFX} preload="auto" />

      {!hasEntered && <EntryGate onEnter={handleEnter} />}

      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_8%,rgba(44,207,120,0.14),transparent_42%),radial-gradient(circle_at_50%_118%,rgba(47,98,255,0.11),transparent_48%),radial-gradient(circle_at_50%_0%,rgba(118,255,178,0.04),transparent_28%)]" />

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10 opacity-42"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(182,255,182,0.14) 0px, rgba(182,255,182,0.14) 1px, rgba(0,0,0,0.14) 1px, rgba(0,0,0,0.14) 3px), repeating-linear-gradient(180deg, rgba(190,255,220,0.04) 0px, rgba(190,255,220,0.04) 2px, transparent 2px, transparent 6px), linear-gradient(90deg, rgba(255,0,70,0.05), rgba(0,255,255,0.02), rgba(108,255,123,0.05))',
          backgroundSize: '100% 3px, 100% 6px, 100% 100%',
          mixBlendMode: 'screen',
        }}
        animate={{ backgroundPositionY: ['0px', '180px'], opacity: [0.34, 0.42, 0.36, 0.4] }}
        transition={{ duration: 4.2, ease: 'linear', repeat: Infinity }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(190,255,190,0) 0%, rgba(190,255,190,0.18) 42%, rgba(190,255,190,0.32) 50%, rgba(190,255,190,0.18) 58%, rgba(190,255,190,0) 100%), linear-gradient(180deg, rgba(120,255,170,0) 0%, rgba(120,255,170,0.22) 45%, rgba(120,255,170,0.3) 50%, rgba(120,255,170,0.22) 55%, rgba(120,255,170,0) 100%)',
          backgroundSize: '100% 28%, 100% 18%',
          backgroundRepeat: 'no-repeat, no-repeat',
          mixBlendMode: 'screen',
        }}
        animate={{
          backgroundPositionY: ['-38%', '130%', '-24%', '118%'],
          opacity: [0.14, 0.25, 0.18, 0.28],
        }}
        transition={{ duration: 4.2, ease: 'linear', repeat: Infinity }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.05), transparent 36%), radial-gradient(circle at 78% 64%, rgba(255,255,255,0.04), transparent 38%), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03), transparent 45%)',
          mixBlendMode: 'overlay',
        }}
        animate={{ opacity: [0.08, 0.16, 0.1, 0.18, 0.09] }}
        transition={{ duration: 0.7, ease: 'linear', repeat: Infinity }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          backgroundImage:
            'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 3px)',
          backgroundSize: '160px 160px',
          mixBlendMode: 'soft-light',
        }}
        animate={{
          opacity: [0.04, 0.08, 0.05],
          backgroundPositionX: ['0px', '14px', '0px'],
          backgroundPositionY: ['0px', '10px', '0px'],
        }}
        transition={{ duration: 3.2, ease: 'linear', repeat: Infinity }}
      />

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.03) 26%, rgba(0,0,0,0.28) 64%, rgba(0,0,0,0.74) 100%), linear-gradient(180deg, rgba(255,255,255,0.015), rgba(0,0,0,0.3) 26%, rgba(0,0,0,0.6) 100%)',
        }}
      />

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
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.28em] text-green-500/60">S02 E02</p>
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

          <section className="mb-12 border border-emerald-500/35 bg-[#020906]/88 p-4 font-mono text-emerald-300 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-emerald-500/25 pb-2">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-400/90">NETCAFE SZIMULÁTOR</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/80">ROUND {simRound}</p>
            </div>

            {isSimulatorCollapsed ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs leading-6 text-emerald-300/85">A pult fut a hatterben. Ha visszaugrasz, ott folytatod ahol abbahagytad.</p>
                <button
                  type="button"
                  onClick={() => {
                    playClick(sfxClickRef.current)
                    setIsSimulatorCollapsed(false)
                  }}
                  className="border border-emerald-400/80 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  [ VISSZA A PULTHOZ ]
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.14em]">
                  <div className={`border px-2 py-2 ${simStress >= SIM_CRITICAL_THRESHOLD ? 'border-red-500/70 text-red-300' : simStress >= SIM_WARNING_THRESHOLD ? 'border-amber-400/70 text-amber-200' : 'border-emerald-500/45 text-emerald-300/90'}`}>
                    <p className="text-[9px] opacity-80">Stressz</p>
                    <p className="mt-1 text-sm tracking-[0.08em]">{simStress}</p>
                  </div>
                  <div className={`border px-2 py-2 ${simQueue >= SIM_CRITICAL_THRESHOLD ? 'border-red-500/70 text-red-300' : simQueue >= SIM_WARNING_THRESHOLD ? 'border-amber-400/70 text-amber-200' : 'border-emerald-500/45 text-emerald-300/90'}`}>
                    <p className="text-[9px] opacity-80">Sor</p>
                    <p className="mt-1 text-sm tracking-[0.08em]">{simQueue}</p>
                  </div>
                  <div className={`border px-2 py-2 ${simCash <= -4 ? 'border-red-500/70 text-red-300' : simCash <= -1 ? 'border-amber-400/70 text-amber-200' : 'border-emerald-500/45 text-emerald-300/90'}`}>
                    <p className="text-[9px] opacity-80">Kassza</p>
                    <p className="mt-1 text-sm tracking-[0.08em]">{simCash}</p>
                  </div>
                </div>

                <div className="mt-4 min-h-[3.8rem] border border-emerald-500/25 bg-black/45 p-3 text-sm leading-6 text-emerald-200/95" aria-live="polite">
                  {currentScenario ? (
                    <p className="whitespace-pre-wrap">{simPromptDisplay || currentScenario.prompt}{isSimPromptTyping ? '▍' : ''}</p>
                  ) : (
                    <p>Muszak inicializalasa...</p>
                  )}
                </div>

                {simPhase === 'crashed' ? (
                  <div className="mt-4 space-y-3 border border-red-500/70 bg-red-950/20 p-3 text-red-200">
                    <p className="text-xs uppercase tracking-[0.18em]">[ PULT RENDSZER LEALLT ]</p>
                    <p className="text-xs tracking-[0.11em]">{simCrashCode ?? 'ERROR_0x09: RENDSZER_HIBA'}</p>
                    <p className="text-xs text-red-200/90">A pultos feladta. A monitor sotet, a sor szetszalad.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleSimulatorRestart}
                        className="border border-red-400 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-500/15"
                      >
                        [ UJ MUSZAK ]
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulatorContinue}
                        className="border border-emerald-400/80 px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/10"
                      >
                        [ TOVABB A TORTENETHEZ ]
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2">
                    {currentScenario?.options.map((option, index) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSimulatorChoice(option)}
                        className="w-full border border-emerald-400/70 bg-transparent px-3 py-2 text-left text-[11px] leading-5 tracking-[0.09em] text-emerald-200 transition hover:bg-emerald-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                        aria-label={`Valasz ${index + 1}`}
                      >
                        [{index + 1}] {option.label}
                      </button>
                    ))}
                    <p className="pt-1 text-[10px] uppercase tracking-[0.16em] text-emerald-500/75">Hotkey: 1 / 2 / 3</p>
                  </div>
                )}

                <div className="mt-4 space-y-2 border-t border-emerald-500/20 pt-3 text-xs">
                  <p className="text-emerald-200/90">{simLastResultLine}</p>
                  {simLastDelta && (
                    <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-500/80">
                      Δ stressz {simLastDelta.stress >= 0 ? '+' : ''}{simLastDelta.stress} / Δ sor {simLastDelta.queue >= 0 ? '+' : ''}{simLastDelta.queue} / Δ kassza {simLastDelta.cash >= 0 ? '+' : ''}{simLastDelta.cash}
                    </p>
                  )}
                </div>

                <div className="mt-3 border border-emerald-500/20 bg-black/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-500/85">Esemenynaplo</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-emerald-200/80" aria-live="polite">
                    {simEventLog.map((item) => (
                      <li key={item.id}>{item.line}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleSimulatorContinue}
                    className="border border-emerald-600/60 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-emerald-400/90 transition hover:bg-emerald-500/10"
                  >
                    [ PANEL MINIMALIZALASA ]
                  </button>
                </div>
              </>
            )}
          </section>

          {splitStory.beforeLock.length > 0 ? (
            <div className="mx-auto w-full max-w-[20rem] space-y-7 text-left text-[1.13rem] leading-8 text-zinc-300/88 sm:max-w-[30.5rem] [text-shadow:0_0_calc(var(--trip-blur)*(0.78+var(--glitch-boost)*0.3)*1px)_rgba(255,255,255,0.2),calc(var(--trip)*(0.23+var(--glitch-boost)*0.18)*1px)_0_0_rgba(255,0,68,0.36),calc(var(--trip)*(-0.23-var(--glitch-boost)*0.18)*1px)_0_0_rgba(34,197,94,0.33)]">
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
            {revealAfterLock && splitStory.afterLock.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="mx-auto mt-10 w-full max-w-[18rem] space-y-7 pt-8 text-left text-[1.13rem] leading-8 text-zinc-300/86 sm:max-w-[30.5rem] [text-shadow:0_0_calc(var(--trip-blur)*(0.86+var(--glitch-boost)*0.34)*1px)_rgba(255,255,255,0.2),calc(var(--trip)*(0.24+var(--glitch-boost)*0.2)*1px)_0_0_rgba(255,0,68,0.38),calc(var(--trip)*(-0.24-var(--glitch-boost)*0.2)*1px)_0_0_rgba(34,197,94,0.34)]"
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

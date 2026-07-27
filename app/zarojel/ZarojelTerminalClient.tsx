'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

type Tone = 'system' | 'ok' | 'warn' | 'critical' | 'prompt'

type BootLine = {
  text: string
  tone?: Tone
  kind?: 'prompt'
}

const SPINNER_FRAMES = ['|', '/', '-', '\\']

const QUICK_RECOVERY_LINES = [
  '> diag.cpu_gate::run',
  '> mem.cleanse --fast',
  '> route.patch /internal/recovery --ok',
]

const PANIC_CAPTURE_LINES = [
  '> panic.writeframe[01] // jitter spike',
  '> panic.writeframe[02] // queue overflow',
  '> panic.flush-cache --force',
  '> panic.retry uplink#3',
  '> panic.retry uplink#4 --lock',
  '> panic.commit --dont-look-back',
]

const ANOMALY_ACCEPT_LINES = [
  '> anomaly.review complete // resistance=0',
  '> anomaly.accepted // buyer_node: doomed',
]

const BOOT_SEQUENCE: BootLine[] = [
  { text: '> WAKE.NODE zarojel::qr-entry', tone: 'system' },
  { text: '> CLOCK 04:03:19 // SYNC +002ms', tone: 'system' },
  { text: '> HALOZAT-LAYER..online // CRC clean', tone: 'system' },
  { text: '> TRACE: visitor beacon accepted', tone: 'system' },
  { text: '> IMG.SCAN init // képek keresése', tone: 'system' },
  { text: '> NET.STATUS::SATURATED // hálózat túlterhelve', tone: 'warn' },
  { text: '> SENSOR ALERT // overload érzékelve', tone: 'warn' },
  { text: '> REC.DEVICE_SCAN // rögzítőszközök keresése', tone: 'system' },
  { text: '> CAPTURE.WRITE target=/kurva-fal // képek rögzítése a kurva falon', tone: 'system' },
  { text: '> CAPTURE.OK // képek rögzítve a kurva falon', tone: 'ok' },
  { text: 'A JEL TISZTA', tone: 'ok' },
  { text: '> HUMAN.NET MONITOR::INIT // jelerősség térkép', tone: 'system' },
  { text: '> nodes=241 spread=87% signal=68% activity=HIGH', tone: 'system' },
  { text: '> cluster-pulse stable // kiterjedtség + aktivitás követve', tone: 'system' },
  { text: 'A VEVŐ MEG VAN BASZÓDVA.', tone: 'critical' },
  { text: '> ANOMALY.LOG appended // buyer_node irrecoverable', tone: 'warn' },
  { text: '> ACCEPTANCE.PROTOCOL acknowledged // status: final', tone: 'system' },
  { text: '> channel handoff complete', tone: 'system' },
  { text: 'A kapcsolat létrejött.', tone: 'ok' },
  { text: 'Kíván továbblépni?', tone: 'prompt', kind: 'prompt' },
]

function clsForTone(tone: Tone | undefined): string {
  if (tone === 'ok') return 'line-ok'
  if (tone === 'warn') return 'line-warn'
  if (tone === 'critical') return 'line-critical'
  if (tone === 'prompt') return 'line-prompt'
  return 'line-system'
}

export default function ZarojelTerminalClient() {
  const [shownCount, setShownCount] = useState(0)
  const [done, setDone] = useState(false)
  const [loaderLabel, setLoaderLabel] = useState<string | null>(null)
  const [loaderFrame, setLoaderFrame] = useState(0)
  const [transientLines, setTransientLines] = useState<BootLine[]>([])
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!loaderLabel) return

    const intervalId = window.setInterval(() => {
      setLoaderFrame((prev) => (prev + 1) % SPINNER_FRAMES.length)
    }, 85)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loaderLabel])

  useEffect(() => {
    let active = true

    const sleep = (ms: number) => new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms)
    })

    const showTransientLines = async (lines: string[], tone: Tone, stepMs: number) => {
      for (const text of lines) {
        if (!active) return
        setTransientLines((prev) => [...prev, { text, tone }])
        await sleep(stepMs)
      }
    }

    const runLoader = async (label: string, durationMs: number) => {
      if (!active) return
      setLoaderFrame(0)
      setLoaderLabel(label)
      await sleep(durationMs)
      if (!active) return
      setLoaderLabel(null)
    }

    const basePause = (line: BootLine, index: number) => {
      if (line.tone === 'critical') return 1000
      if (line.tone === 'ok') return 700
      return 340 + ((index % 3) * 65)
    }

    const runBoot = async () => {
      await sleep(320)

      for (let i = 0; i < BOOT_SEQUENCE.length; i += 1) {
        if (!active) return
        const lineNumber = i + 1
        const line = BOOT_SEQUENCE[i]
        setShownCount(lineNumber)

        if (lineNumber === 5) {
          await runLoader('img.scan indexing packets', 1300)
          continue
        }

        if (lineNumber === 7) {
          await runLoader('overload mitigation sequence', 900)
          await showTransientLines(QUICK_RECOVERY_LINES, 'system', 110)
          continue
        }

        if (lineNumber === 9) {
          await runLoader('capture pipeline writing', 2000)
          await showTransientLines(PANIC_CAPTURE_LINES, 'warn', 95)
          continue
        }

        if (lineNumber === 10) {
          await sleep(230)
          continue
        }

        if (lineNumber === 11) {
          await sleep(620)
          continue
        }

        if (lineNumber === 15) {
          await runLoader('anomaly reconciliation', 860)
          await showTransientLines(ANOMALY_ACCEPT_LINES, 'system', 120)
          continue
        }

        await sleep(basePause(line, i))
      }

      if (!active) return
      setLoaderLabel(null)
      setDone(true)
    }

    runBoot()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight
    }
  }, [shownCount, loaderLabel, loaderFrame, transientLines])

  const visibleLines = useMemo(() => BOOT_SEQUENCE.slice(0, shownCount), [shownCount])

  return (
    <main className="zr-page">
      <div className="zr-bg-noise" aria-hidden="true" />
      <div className="zr-bg-glow" aria-hidden="true" />

      <section className="zr-shell" aria-label="zarojel terminal">
        <header className="zr-header">
          <span className="zr-dot zr-dot-red" />
          <span className="zr-dot zr-dot-amber" />
          <span className="zr-dot zr-dot-green" />
          <p className="zr-title">vallalhatatlan terminal :: zarojel.entry</p>
        </header>

        <div className="zr-viewport" ref={viewportRef}>
          <p className="zr-intro">QR kapcsolat azonosítva. Boot folyamat indul...</p>

          {visibleLines.map((line, index) => (
            <p key={`${line.text}-${index}`} className={`zr-line ${clsForTone(line.tone)}`}>
              <span className="zr-prefix">[{String(index + 1).padStart(2, '0')}]</span>{' '}
              {line.kind === 'prompt' ? (
                <>
                  {line.text} ({' '}
                  <Link href="/auth?from=/halozat&next=/halozat" className="zr-inline-yes">
                    yes
                  </Link>{' '}
                  or <span className="zr-inline-no">no</span>)
                </>
              ) : (
                line.text
              )}
            </p>
          ))}

          {!done && transientLines.map((line, index) => (
            <p key={`transient-${index}-${line.text}`} className={`zr-line zr-line-transient ${clsForTone(line.tone)}`}>
              <span className="zr-prefix">[~~]</span> {line.text}
            </p>
          ))}

          {loaderLabel && (
            <p className="zr-line zr-loader-line">
              <span className="zr-prefix">[..]</span> {SPINNER_FRAMES[loaderFrame]} {loaderLabel}...
            </p>
          )}

          {!done && <p className="zr-cursor">_</p>}
        </div>
      </section>

      <style jsx>{`
        .zr-page {
          --zr-bg: #050707;
          --zr-bg-soft: #0c1010;
          --zr-panel: rgba(6, 9, 8, 0.9);
          --zr-border: rgba(141, 175, 151, 0.34);
          --zr-green: #86ff9f;
          --zr-green-dim: #74bd84;
          --zr-dirty: #a9b1ab;
          --zr-dirty-soft: #78837d;

          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          padding: 14px;
          background:
            radial-gradient(circle at 12% 18%, rgba(111, 255, 145, 0.1), transparent 38%),
            radial-gradient(circle at 88% 84%, rgba(164, 179, 167, 0.08), transparent 44%),
            linear-gradient(180deg, var(--zr-bg-soft) 0%, var(--zr-bg) 100%);
          color: var(--zr-dirty);
          font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
          display: grid;
          align-items: center;
        }

        .zr-bg-noise {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.36;
          background-image: radial-gradient(rgba(255, 255, 255, 0.22) 0.4px, transparent 0.8px);
          background-size: 3px 3px;
          mix-blend-mode: soft-light;
          animation: zr-noise-jump 240ms steps(2, end) infinite;
        }

        .zr-bg-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            repeating-linear-gradient(
              to bottom,
              rgba(20, 42, 26, 0.28) 0px,
              rgba(20, 42, 26, 0.28) 1px,
              rgba(6, 9, 7, 0.08) 2px,
              rgba(6, 9, 7, 0.08) 3px
            ),
            linear-gradient(
              to bottom,
              rgba(140, 255, 176, 0) 0%,
              rgba(140, 255, 176, 0.14) 48%,
              rgba(140, 255, 176, 0) 100%
            );
          opacity: 0.84;
          background-size: 100% 4px, 100% 220px;
          animation: zr-scan 4.2s linear infinite;
        }

        .zr-shell {
          position: relative;
          z-index: 1;
          width: min(100%, 720px);
          margin: 0 auto;
          border: 1px solid var(--zr-border);
          border-radius: 14px;
          background: transparent;
          box-shadow:
            0 0 0 1px rgba(93, 129, 108, 0.28) inset,
            0 14px 38px rgba(0, 0, 0, 0.55),
            0 0 44px rgba(103, 255, 132, 0.12);
          backdrop-filter: blur(0.9px);
          overflow: hidden;
          animation: zr-shell-flicker 5.5s steps(1, end) infinite;
        }

        .zr-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, rgba(124, 255, 162, 0.08), rgba(8, 12, 10, 0.02) 62%);
          mix-blend-mode: screen;
        }

        .zr-shell::after {
          content: '';
          position: absolute;
          inset: -2px;
          pointer-events: none;
          border: 1px solid rgba(124, 255, 162, 0.22);
          border-radius: 14px;
          opacity: 0.22;
          filter: blur(0.6px);
          animation: zr-border-pulse 2.8s ease-in-out infinite;
        }

        .zr-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(140, 173, 151, 0.22);
          background: linear-gradient(180deg, rgba(12, 16, 15, 0.52), rgba(9, 12, 12, 0.4));
        }

        .zr-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }

        .zr-dot-red {
          color: #81938a;
          background: #81938a;
        }

        .zr-dot-amber {
          color: #7f8c85;
          background: #7f8c85;
        }

        .zr-dot-green {
          color: #86ff9f;
          background: #86ff9f;
        }

        .zr-title {
          margin: 0 0 0 6px;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--zr-dirty-soft);
        }

        .zr-viewport {
          height: min(78dvh, 740px);
          overflow: auto;
          padding: 16px 14px 18px;
          background: rgba(5, 8, 7, 0.22);
          scrollbar-width: thin;
          scrollbar-color: rgba(124, 160, 136, 0.4) rgba(17, 22, 20, 0.2);
        }

        .zr-viewport::-webkit-scrollbar {
          width: 8px;
        }

        .zr-viewport::-webkit-scrollbar-track {
          background: rgba(17, 22, 20, 0.2);
        }

        .zr-viewport::-webkit-scrollbar-thumb {
          background: rgba(124, 160, 136, 0.45);
          border-radius: 999px;
        }

        .zr-intro {
          margin: 0 0 12px;
          font-size: 12px;
          color: var(--zr-dirty-soft);
          letter-spacing: 0.04em;
        }

        .zr-line {
          margin: 0;
          font-size: clamp(13px, 3.2vw, 16px);
          line-height: 1.6;
          text-wrap: pretty;
          animation: zr-fade-in 240ms ease-out;
        }

        .zr-prefix {
          color: #6a756f;
          margin-right: 6px;
        }

        .line-system {
          color: var(--zr-dirty);
        }

        .line-ok {
          color: var(--zr-green);
          font-weight: 700;
          text-shadow: 0 0 10px rgba(118, 255, 159, 0.25);
        }

        .line-warn {
          color: #bcc6bf;
        }

        .line-critical {
          color: #c8f7d4;
          font-weight: 800;
          text-shadow:
            0 0 12px rgba(122, 255, 159, 0.2),
            0 0 1px rgba(186, 204, 193, 0.55);
        }

        .line-prompt {
          color: #d8e4dc;
          font-weight: 700;
        }

        .zr-line-transient {
          opacity: 0.92;
        }

        .zr-loader-line {
          color: #90d8a1;
          font-style: italic;
        }

        .zr-inline-yes {
          color: #86ff9f;
          text-decoration: none;
          font-weight: 800;
          text-shadow: 0 0 10px rgba(118, 255, 159, 0.35);
        }

        .zr-inline-yes:hover,
        .zr-inline-yes:focus-visible {
          text-decoration: underline;
          outline: none;
        }

        .zr-inline-no {
          color: #8b958f;
        }

        .zr-cursor {
          margin: 6px 0 0;
          color: var(--zr-green);
          font-size: 18px;
          animation: zr-blink 1.1s steps(1, end) infinite;
        }

        @media (max-width: 460px) {
          .zr-page {
            padding: 8px;
          }

          .zr-shell {
            border-radius: 10px;
          }

          .zr-header {
            padding: 8px 10px;
          }

          .zr-title {
            font-size: 10px;
          }

          .zr-viewport {
            height: min(84dvh, 760px);
            padding: 12px 10px 14px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zr-bg-glow,
          .zr-bg-noise,
          .zr-shell,
          .zr-shell::after,
          .zr-cursor,
          .zr-line {
            animation: none !important;
          }
        }

        @keyframes zr-blink {
          0%,
          44% {
            opacity: 1;
          }
          45%,
          100% {
            opacity: 0;
          }
        }

        @keyframes zr-fade-in {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes zr-scan {
          0% {
            background-position: 0 0, 0 -180px;
          }
          100% {
            background-position: 0 0, 0 620px;
          }
        }

        @keyframes zr-shell-flicker {
          0%,
          6%,
          8%,
          38%,
          40%,
          52%,
          54%,
          100% {
            opacity: 1;
          }
          7%,
          39%,
          53% {
            opacity: 0.94;
          }
        }

        @keyframes zr-noise-jump {
          0% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(-0.4px, 0.2px);
          }
          50% {
            transform: translate(0.3px, -0.2px);
          }
          75% {
            transform: translate(-0.2px, -0.1px);
          }
          100% {
            transform: translate(0, 0);
          }
        }

        @keyframes zr-border-pulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.42;
          }
        }
      `}</style>
    </main>
  )
}

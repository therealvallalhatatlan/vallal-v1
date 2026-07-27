'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/browser'
import { persistAuthReturnTarget } from '@/lib/authRedirect'

type Tone = 'system' | 'ok' | 'warn' | 'critical' | 'prompt'

type BootLine = {
  text: string
  tone?: Tone
  kind?: 'prompt'
}

type AuthStage = 'choice' | 'checking' | 'needs-auth' | 'running' | 'complete'

const supabase = createClient()
const AUTH_RESUME_KEY = 'zarojel-auth-resume'

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

const HALOZAT_LINES: BootLine[] = [
  { text: '> Hálózati támaszpont: Hintaló Iszoda', tone: 'ok' },
  { text: '> Cím: Budapest, Bacsó Béla u. 15, 1081', tone: 'system' },
  { text: '> Kiállítás: Zárójel', tone: 'system' },
  { text: 'MI A HÁLÓZAT?', tone: 'ok' },
  { text: '- Egy titkos hálózat.', tone: 'system' },
  { text: '- Valódi emberekből.', tone: 'system' },
  { text: '- A városban elrejtett nyomokkal.', tone: 'system' },
  { text: '- Fedezd fel.', tone: 'system' },
  { text: '- Mozdulj ki.', tone: 'system' },
  { text: '- Hagyj nyomot.', tone: 'system' },
  { text: '- Találkozz mások nyomaival.', tone: 'system' },
]

const BOOT_SEQUENCE: BootLine[] = [
  { text: '> WAKE.NODE zarojel::qr-entry', tone: 'system' },
  { text: '> CLOCK 04:03:19 // SYNC +002ms', tone: 'system' },
  { text: '> HALOZAT-LAYER.online // CRC clean', tone: 'system' },
  { text: '> HELYSZÍN: Hintaló Iszoda', tone: 'system' },
  { text: '> IMG.SCAN init // képek keresése', tone: 'system' },
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
  const [authStage, setAuthStage] = useState<AuthStage>('choice')
  const [showAuthLayer, setShowAuthLayer] = useState(false)
  const [followupLines, setFollowupLines] = useState<BootLine[]>([])
  const [followupLoaderLabel, setFollowupLoaderLabel] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [declined, setDeclined] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const flowRunningRef = useRef(false)

  useEffect(() => {
    if (!loaderLabel && !followupLoaderLabel) return

    const intervalId = window.setInterval(() => {
      setLoaderFrame((prev) => (prev + 1) % SPINNER_FRAMES.length)
    }, 85)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loaderLabel, followupLoaderLabel])

  const sleep = useCallback((ms: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  }), [])

  const resolveUserLabel = useCallback((user: any): string => {
    const meta = user?.user_metadata ?? {}
    return meta.full_name ?? meta.name ?? meta.user_name ?? user?.email ?? 'ismeretlen'
  }, [])

  const appendFollowupLine = useCallback((line: BootLine) => {
    setFollowupLines((prev) => [...prev, line])
  }, [])

  const runAuthenticatedProcedure = useCallback(async (username: string) => {
    if (flowRunningRef.current) return
    flowRunningRef.current = true

    setShowAuthLayer(false)
    setAuthStage('running')
    setAuthMessage(null)
    setAuthError(null)
    setFollowupLoaderLabel('auth szinkronizáció')
    await sleep(2200)
    setFollowupLoaderLabel(null)

    appendFollowupLine({ text: `> AUTH OK // Üdv ${username}`, tone: 'ok' })
    await sleep(520)

    for (const line of HALOZAT_LINES) {
      appendFollowupLine(line)
      await sleep(line.tone === 'ok' ? 560 : 380)
    }

    setFollowupLoaderLabel('átirányítás folyamatban')
    await sleep(2400)
    setFollowupLoaderLabel(null)
    setAuthStage('complete')
    if (typeof window !== 'undefined') {
      window.location.assign('/halozat')
    }
    flowRunningRef.current = false
  }, [appendFollowupLine, sleep])

  const startAuthProcedure = useCallback(async () => {
    if (!done || flowRunningRef.current || authStage !== 'choice') return

    setDeclined(false)
    setAuthStage('checking')
    setFollowupLines([])
    setAuthMessage(null)
    setAuthError(null)
    setShowAuthLayer(false)
    setFollowupLoaderLabel('auth azonosítás folyamatban')
    await sleep(2100)

    const { data } = await supabase.auth.getUser()
    const user = data?.user ?? null

    if (user) {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_RESUME_KEY)
      }
      setFollowupLoaderLabel(null)
      await runAuthenticatedProcedure(resolveUserLabel(user))
      return
    }

    setFollowupLoaderLabel(null)
    appendFollowupLine({ text: 'Azonosítás szükséges.', tone: 'warn' })
    setAuthStage('needs-auth')
    setShowAuthLayer(true)
  }, [appendFollowupLine, authStage, done, resolveUserLabel, runAuthenticatedProcedure, sleep])

  const handleEmailLogin = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email || authLoading || oauthLoading) return

    setAuthLoading(true)
    setAuthError(null)
    setAuthMessage(null)
    try {
      const target = '/zarojel'
      persistAuthReturnTarget(target)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_RESUME_KEY, '1')
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      })

      if (error) {
        setAuthError(error.message)
      } else {
        setAuthMessage('E-mail elküldve. Nyisd meg a magic linket a folytatáshoz.')
      }
    } finally {
      setAuthLoading(false)
    }
  }, [authLoading, email, oauthLoading])

  const handleGoogleLogin = useCallback(async () => {
    if (authLoading || oauthLoading) return

    setOauthLoading(true)
    setAuthError(null)
    setAuthMessage(null)

    try {
      const target = '/zarojel'
      persistAuthReturnTarget(target)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_RESUME_KEY, '1')
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        setAuthError(error.message)
      }
    } finally {
      setOauthLoading(false)
    }
  }, [authLoading, oauthLoading])

  const handleNo = useCallback(() => {
    if (!done || authStage !== 'choice') return
    setDeclined(true)
  }, [authStage, done])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const user = session?.user
      if (!user) return

      const shouldResume = showAuthLayer || authStage === 'needs-auth'
      if (!shouldResume) return

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_RESUME_KEY)
      }

      void runAuthenticatedProcedure(resolveUserLabel(user))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [authStage, resolveUserLabel, runAuthenticatedProcedure, showAuthLayer])

  useEffect(() => {
    const autoResume = async () => {
      if (!done || authStage !== 'choice') return
      if (typeof window === 'undefined') return
      if (window.localStorage.getItem(AUTH_RESUME_KEY) !== '1') return

      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return

      window.localStorage.removeItem(AUTH_RESUME_KEY)
      setFollowupLines([])
      await runAuthenticatedProcedure(resolveUserLabel(user))
    }

    void autoResume()
  }, [authStage, done, resolveUserLabel, runAuthenticatedProcedure])

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
  }, [shownCount, loaderLabel, loaderFrame, transientLines, followupLoaderLabel, followupLines, authStage, declined])

  const visibleLines = useMemo(() => BOOT_SEQUENCE.slice(0, shownCount), [shownCount])

  return (
    <main className="zr-page">
      <div className="zr-bg-noise" aria-hidden="true" />
      <div className="zr-bg-glow" aria-hidden="true" />
      <div className="zr-rgb-distort" aria-hidden="true" />

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
            line.kind === 'prompt' ? (
              <div key={`${line.text}-${index}`} className={`zr-line ${clsForTone(line.tone)}`}>
                <span className="zr-prefix">[{String(index + 1).padStart(2, '0')}]</span>
                <p className="zr-prompt-text zr-line-body">{line.text}</p>
                <div className="zr-choice-row" role="group" aria-label="Tovabblepes valasztas">
                  <div className="zr-choice-line">
                    <span className="zr-prefix">[20]</span>
                    <button
                      type="button"
                      className="zr-choice-btn zr-choice-yes"
                      onClick={() => void startAuthProcedure()}
                      disabled={authStage !== 'choice'}
                    >
                      &gt; yes
                    </button>
                  </div>
                  {authStage === 'choice' && (
                    <div className="zr-choice-line">
                      <span className="zr-prefix">[20]</span>
                      <button type="button" className="zr-choice-btn zr-choice-no" onClick={handleNo}>
                        &gt; no
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p key={`${line.text}-${index}`} className={`zr-line ${clsForTone(line.tone)}`}>
                <span className="zr-prefix">[{String(index + 1).padStart(2, '0')}]</span>
                <span className="zr-line-body">{line.text}</span>
              </p>
            )
          ))}

          {!done && transientLines.map((line, index) => (
            <p key={`transient-${index}-${line.text}`} className={`zr-line zr-line-transient ${clsForTone(line.tone)}`}>
              <span className="zr-prefix">[~~]</span>
              <span className="zr-line-body">{line.text}</span>
            </p>
          ))}

          {loaderLabel && (
            <p className="zr-line zr-loader-line">
              <span className="zr-prefix">[..]</span>
              <span className="zr-line-body">{SPINNER_FRAMES[loaderFrame]} {loaderLabel}...</span>
            </p>
          )}

          {followupLoaderLabel && (
            <p className="zr-line zr-loader-line">
              <span className="zr-prefix">[..]</span>
              <span className="zr-line-body">{SPINNER_FRAMES[loaderFrame]} {followupLoaderLabel}...</span>
            </p>
          )}

          {followupLines.map((line, index) => (
            <p key={`followup-${index}-${line.text}`} className={`zr-line ${clsForTone(line.tone)}`}>
              <span className="zr-prefix">[{String(21 + index).padStart(2, '0')}]</span>
              <span className="zr-line-body">{line.text}</span>
            </p>
          ))}

          {declined && authStage === 'choice' && (
            <p className="zr-line line-warn">
              <span className="zr-prefix">[21]</span>
              <span className="zr-line-body">&gt; kapcsolat megszakítva // bármikor visszatérhetsz.</span>
            </p>
          )}

          {!done && <p className="zr-cursor">_</p>}
        </div>
      </section>

      {showAuthLayer && (
        <div className="zr-auth-layer" role="dialog" aria-modal="true" aria-label="Azonositas szukseges">
          <div className="zr-auth-card">
            <p className="zr-auth-kicker">AUTH GATEWAY</p>
            <h2 className="zr-auth-title">Azonosítás szükséges</h2>
            <p className="zr-auth-copy">Lépj be emaillel vagy Google fiókkal, és a procedúra automatikusan folytatódik.</p>

            <form className="zr-auth-form" onSubmit={handleEmailLogin}>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="zr-auth-input"
                placeholder="email@pelda.hu"
                autoComplete="email"
              />
              <button type="submit" className="zr-auth-btn zr-auth-btn-email" disabled={authLoading || oauthLoading}>
                {authLoading ? 'Küldés...' : 'Belépés emaillel'}
              </button>
            </form>

            <button type="button" className="zr-auth-btn zr-auth-btn-google" onClick={() => void handleGoogleLogin()} disabled={authLoading || oauthLoading}>
              {oauthLoading ? 'Google auth...' : 'Belépés Google-lel'}
            </button>

            {authMessage && <p className="zr-auth-message">{authMessage}</p>}
            {authError && <p className="zr-auth-error">{authError}</p>}
          </div>
        </div>
      )}

      <style jsx>{`
        .zr-page {
          --zr-bg: #010101;
          --zr-bg-soft: #060606;
          --zr-green: #86ff9f;
          --zr-dirty: #d0d0d0;
          --zr-dirty-soft: #8f8f8f;

          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          padding: 4px;
          background: linear-gradient(180deg, var(--zr-bg-soft) 0%, var(--zr-bg) 100%);
          color: var(--zr-dirty);
          font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
          display: block;
        }

        .zr-page::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(ellipse at 50% 46%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 34%, rgba(0, 0, 0, 0.72) 100%),
            radial-gradient(ellipse at 50% 52%, rgba(0, 0, 0, 0) 42%, rgba(0, 0, 0, 0.84) 100%);
          box-shadow:
            inset 0 0 180px rgba(0, 0, 0, 0.9),
            inset 0 0 42px rgba(0, 0, 0, 0.88),
            inset 0 0 10px rgba(255, 255, 255, 0.07);
          transform: scale(1.015, 0.99);
        }

        .zr-bg-noise {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.2;
          background-image: radial-gradient(rgba(255, 255, 255, 0.18) 0.4px, transparent 0.8px);
          background-size: 3px 3px;
          mix-blend-mode: screen;
          animation: zr-noise-jump 240ms steps(2, end) infinite;
        }

        .zr-bg-glow {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            repeating-linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.18) 0px,
              rgba(255, 255, 255, 0.18) 1px,
              rgba(0, 0, 0, 0.24) 2px,
              rgba(0, 0, 0, 0.24) 3px
            ),
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.15) 48%,
              rgba(255, 255, 255, 0) 100%
            );
          opacity: 0.68;
          background-size: 100% 4px, 100% 220px;
          animation: zr-scan 4.2s linear infinite;
        }

        .zr-shell {
          position: relative;
          z-index: 1;
          width: 100%;
          min-height: 100dvh;
          margin: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          overflow: hidden;
          animation: zr-shell-flicker 5.5s steps(1, end) infinite;
        }

        .zr-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.02) 62%);
          mix-blend-mode: soft-light;
        }

        .zr-shell::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at 50% 48%, rgba(255, 255, 255, 0.03) 0%, rgba(0, 0, 0, 0) 58%);
          mix-blend-mode: screen;
        }

        .zr-rgb-distort {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: screen;
        }

        .zr-rgb-distort::before,
        .zr-rgb-distort::after {
          content: '';
          position: absolute;
          left: -2%;
          width: 104%;
          height: 16%;
          opacity: 0;
          filter: blur(0.45px);
          will-change: transform, opacity;
        }

        .zr-rgb-distort::before {
          background: linear-gradient(
            180deg,
            rgba(255, 0, 72, 0) 0%,
            rgba(255, 0, 72, 0.18) 36%,
            rgba(0, 255, 255, 0.2) 64%,
            rgba(0, 255, 255, 0) 100%
          );
          animation: zr-rgb-sweep-1 11s linear infinite;
        }

        .zr-rgb-distort::after {
          background: linear-gradient(
            180deg,
            rgba(0, 170, 255, 0) 0%,
            rgba(0, 170, 255, 0.15) 40%,
            rgba(255, 40, 120, 0.16) 65%,
            rgba(255, 40, 120, 0) 100%
          );
          animation: zr-rgb-sweep-2 16s linear infinite;
        }

        .zr-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.18);
          background: linear-gradient(180deg, rgba(14, 14, 14, 0.42), rgba(8, 8, 8, 0.18));
        }

        .zr-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }

        .zr-dot-red {
          color: #8e8e8e;
          background: #8e8e8e;
        }

        .zr-dot-amber {
          color: #a3a3a3;
          background: #a3a3a3;
        }

        .zr-dot-green {
          color: #d9d9d9;
          background: #d9d9d9;
        }

        .zr-title {
          margin: 0 0 0 6px;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--zr-dirty-soft);
        }

        .zr-viewport {
          height: calc(100dvh - 42px);
          overflow: auto;
          padding: 10px 8px 12px;
          background: transparent;
          scrollbar-width: thin;
          scrollbar-color: rgba(180, 180, 180, 0.45) rgba(30, 30, 30, 0.24);
        }

        .zr-viewport::-webkit-scrollbar {
          width: 8px;
        }

        .zr-viewport::-webkit-scrollbar-track {
          background: rgba(30, 30, 30, 0.24);
        }

        .zr-viewport::-webkit-scrollbar-thumb {
          background: rgba(180, 180, 180, 0.45);
          border-radius: 999px;
        }

        .zr-intro {
          margin: 0 0 12px;
          font-size: 14px;
          color: var(--zr-dirty-soft);
          letter-spacing: 0.04em;
        }

        .zr-line {
          margin: 0;
          display: grid;
          grid-template-columns: 3.2rem 1fr;
          column-gap: 0.6rem;
          align-items: start;
          font-size: clamp(15px, 3.9vw, 19px);
          line-height: 1.6;
          animation: zr-fade-in 240ms ease-out;
        }

        .zr-prefix {
          color: #6a756f;
          text-align: right;
          white-space: nowrap;
        }

        .zr-line-body {
          min-width: 0;
          word-break: break-word;
        }

        .line-system {
          color: var(--zr-dirty);
        }

        .line-ok {
          color: #86ff9f;
          font-weight: 700;
          text-shadow: 0 0 10px rgba(118, 255, 159, 0.28);
        }

        .line-warn {
          color: #cccccc;
        }

        .line-critical {
          color: #b8ffca;
          font-weight: 800;
          text-shadow:
            0 0 12px rgba(118, 255, 159, 0.24),
            0 0 1px rgba(180, 255, 203, 0.55);
        }

        .line-prompt {
          color: #9affb4;
          font-weight: 700;
        }

        .zr-line-transient {
          opacity: 0.92;
        }

        .zr-loader-line {
          color: #d0d0d0;
          font-style: italic;
        }

        .zr-prompt-text {
          margin: 0;
        }

        .zr-choice-row {
          grid-column: 1 / -1;
          margin-top: 6px;
          display: block;
        }

        .zr-choice-line {
          display: grid;
          grid-template-columns: 3.2rem 1fr;
          column-gap: 0.6rem;
          align-items: center;
        }

        .zr-choice-line + .zr-choice-line {
          margin-top: 6px;
        }

        .zr-choice-btn {
          min-height: 34px;
          min-width: 112px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          text-decoration: none;
          text-transform: lowercase;
          letter-spacing: 0.04em;
          font-size: 13px;
          font-weight: 600;
          border-radius: 0;
          font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
          white-space: nowrap;
          transition: filter 120ms ease, transform 120ms ease;
        }

        .zr-choice-btn:hover,
        .zr-choice-btn:focus-visible {
          filter: brightness(1.06);
          transform: translateY(-1px);
          outline: none;
        }

        .zr-choice-btn:disabled {
          opacity: 0.64;
          transform: none;
          filter: none;
          cursor: wait;
        }

        .zr-choice-yes {
          color: #06220d;
          border: 1px solid #86ff9f;
          background: rgba(134, 255, 159, 0.9);
          box-shadow:
            0 0 16px rgba(118, 255, 159, 0.28),
            inset 0 0 0 1px rgba(4, 42, 14, 0.65);
        }

        .zr-choice-no {
          color: #c4c4c4;
          border: 0;
          background: transparent;
          box-shadow: none;
        }

        .zr-auth-layer {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: 12px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(3px);
        }

        .zr-auth-card {
          width: min(100%, 520px);
          border: 1px solid rgba(134, 255, 159, 0.36);
          background: rgba(6, 8, 7, 0.9);
          box-shadow:
            0 0 0 1px rgba(134, 255, 159, 0.22) inset,
            0 18px 42px rgba(0, 0, 0, 0.6);
          padding: 16px;
        }

        .zr-auth-kicker {
          margin: 0;
          color: #92a298;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .zr-auth-title {
          margin: 8px 0 0;
          color: #86ff9f;
          font-size: clamp(18px, 4.6vw, 24px);
          line-height: 1.2;
        }

        .zr-auth-copy {
          margin: 8px 0 0;
          color: #c7d0cb;
          font-size: 13px;
          line-height: 1.55;
        }

        .zr-auth-form {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .zr-auth-input {
          min-height: 40px;
          border: 1px solid rgba(166, 182, 173, 0.44);
          background: rgba(10, 12, 11, 0.84);
          color: #e3e8e4;
          padding: 0 11px;
          font-size: 14px;
          font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
        }

        .zr-auth-input:focus {
          outline: none;
          border-color: #86ff9f;
        }

        .zr-auth-btn {
          min-height: 38px;
          border: 1px solid rgba(166, 182, 173, 0.44);
          background: rgba(14, 18, 16, 0.92);
          color: #d0d7d2;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', monospace;
          transition: filter 140ms ease;
        }

        .zr-auth-btn:hover,
        .zr-auth-btn:focus-visible {
          filter: brightness(1.08);
          outline: none;
        }

        .zr-auth-btn-email {
          border-color: rgba(134, 255, 159, 0.64);
          color: #86ff9f;
        }

        .zr-auth-btn-google {
          margin-top: 8px;
          width: 100%;
          border-color: rgba(190, 190, 190, 0.54);
          color: #dfdfdf;
        }

        .zr-auth-btn:disabled {
          opacity: 0.62;
          cursor: wait;
          filter: none;
        }

        .zr-auth-message {
          margin: 10px 0 0;
          color: #a7efb8;
          font-size: 12px;
        }

        .zr-auth-error {
          margin: 10px 0 0;
          color: #ff8f8f;
          font-size: 12px;
        }

        .zr-cursor {
          margin: 6px 0 0;
          color: var(--zr-green);
          font-size: 18px;
          animation: zr-blink 1.1s steps(1, end) infinite;
        }

        @media (max-width: 460px) {
          .zr-page {
            padding: 2px;
          }

          .zr-header {
            padding: 7px 4px;
          }

          .zr-title {
            font-size: 11px;
          }

          .zr-viewport {
            height: calc(100dvh - 40px);
            padding: 8px 6px 10px;
          }

          .zr-choice-row {
            grid-column: 1 / -1;
          }

          .zr-choice-line {
            grid-template-columns: 2.8rem 1fr;
            column-gap: 0.5rem;
          }

          .zr-choice-btn {
            min-width: 102px;
            min-height: 32px;
            padding: 0 10px;
            font-size: 12px;
          }

          .zr-auth-card {
            padding: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .zr-bg-glow,
          .zr-bg-noise,
          .zr-rgb-distort::before,
          .zr-rgb-distort::after,
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

        @keyframes zr-rgb-sweep-1 {
          0%,
          71%,
          100% {
            transform: translate3d(0, -24vh, 0);
            opacity: 0;
          }
          73% {
            transform: translate3d(-0.8%, 12vh, 0);
            opacity: 0.34;
          }
          74% {
            transform: translate3d(1%, 31vh, 0);
            opacity: 0.16;
          }
          75% {
            transform: translate3d(-0.5%, 48vh, 0);
            opacity: 0.26;
          }
          77% {
            transform: translate3d(0.4%, 74vh, 0);
            opacity: 0;
          }
        }

        @keyframes zr-rgb-sweep-2 {
          0%,
          82%,
          100% {
            transform: translate3d(0, -20vh, 0);
            opacity: 0;
          }
          84% {
            transform: translate3d(1.1%, 22vh, 0);
            opacity: 0.28;
          }
          85% {
            transform: translate3d(-1.2%, 43vh, 0);
            opacity: 0.12;
          }
          86% {
            transform: translate3d(0.6%, 60vh, 0);
            opacity: 0.22;
          }
          88% {
            transform: translate3d(-0.3%, 85vh, 0);
            opacity: 0;
          }
        }

      `}</style>
    </main>
  )
}

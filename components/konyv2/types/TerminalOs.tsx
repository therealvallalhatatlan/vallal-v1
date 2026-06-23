'use client'

import { useEffect, useRef, useState } from 'react'
import type { Konyv2PageProps } from '@/components/konyv2/props'

/* ─── types ──────────────────────────────────────────────────────── */

type Kind = 'normal' | 'cmd' | 'dim' | 'bright' | 'sep' | 'link' | 'empty' | 'bar'

interface Line {
  id: number
  text: string
  kind: Kind
  href?: string
  typed: boolean // false = still typewriting
}

/* ─── progress bar renderer ──────────────────────────────────────── */

const CELLS = 44

function renderBar(pct: number): string {
  const fill = Math.round((pct / 100) * CELLS)
  return `[${'█'.repeat(fill)}${'░'.repeat(CELLS - fill)}] ${String(pct).padStart(3)}%`
}

/* ─── component ───────────────────────────────────────────────────── */

export default function TerminalOs(_: Konyv2PageProps) {
  const [lines, setLines] = useState<Line[]>([])
  const [done, setDone] = useState(false)
  const uidRef = useRef(0)
  const dead = useRef(false)
  const botRef = useRef<HTMLDivElement>(null)

  /* auto-scroll to bottom as lines appear */
  useEffect(() => {
    botRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  /* animation sequencer — runs once on mount */
  useEffect(() => {
    dead.current = false
    const T: ReturnType<typeof setTimeout>[] = []
    const uid = () => ++uidRef.current

    /* add a fully-visible line */
    const push = (text: string, kind: Kind, href?: string) =>
      setLines(p => [...p, { id: uid(), text, kind, href, typed: true }])

    /* pause */
    const wait = (ms: number) =>
      new Promise<void>(res => { T.push(setTimeout(() => !dead.current && res(), ms)) })

    /* character-by-character typewriter */
    const type = (text: string, kind: Kind, speed = 32) =>
      new Promise<void>(res => {
        const id = uid()
        setLines(p => [...p, { id, text: '', kind, typed: false }])
        let i = 0
        const tick = () => {
          if (dead.current) { res(); return }
          const finished = i >= text.length
          setLines(p => p.map(l =>
            l.id === id ? { ...l, text: text.slice(0, i), typed: finished } : l
          ))
          if (finished) { res(); return }
          i++
          T.push(setTimeout(tick, speed + Math.random() * 14))
        }
        tick()
      })

    /* animated progress bar with irregular steps to feel authentic */
    const progressAnim = () =>
      new Promise<void>(res => {
        const id = uid()
        setLines(p => [...p, { id, text: renderBar(0), kind: 'bar', typed: false }])
        // deliberate stalls at 28–35 % and 68–74 % simulate real index traversal
        const steps = [2, 5, 9, 14, 19, 24, 28, 31, 34, 38, 43, 49, 54, 58, 63, 67, 70, 74, 78, 82, 86, 89, 92, 95, 98, 100]
        let i = 0
        const tick = () => {
          if (dead.current) { res(); return }
          const pct = steps[i]
          const last = pct >= 100
          setLines(p => p.map(l =>
            l.id === id ? { ...l, text: renderBar(pct), typed: last } : l
          ))
          i++
          if (i >= steps.length) { res(); return }
          const delay = (pct >= 28 && pct <= 35) ? 360
            : (pct >= 68 && pct <= 74) ? 310
            : pct < 50 ? 160 : 115
          T.push(setTimeout(tick, delay))
        }
        T.push(setTimeout(tick, 120))
      })

    /* ── terminal script ─────────────────────────────────────────── */
    async function run() {
      // system header
      push('MEMLOOKUP/32 v4.1.2  ──  Vallalhatatlan Archívum Rendszer', 'bright')
      await wait(55)
      push('(C) 1997-1999 Rick&Pam Informatikai Kft.  /  Jogosulatlan hozzáférés tilos.', 'dim')
      await wait(55)
      push('', 'empty')
      await wait(380)

      // boot diagnostics — fast, one by one
      for (const [label, val] of [
        ['Terminál azonosított ...........', 'BAR-NET-0291'],
        ['Rendszer állapot ...............', 'AKTÍV'],
        ['Fizikai memória ................', '48 MB     [ OK ]'],
        ['Virtuális memória ..............', '96 MB     [ OK ]'],
        ['Hálózati csomópont .............', 'ONLINE    [ 194.149.3.2 ]'],
        ['Archív szerver .................', 'ELÉRHETŐ  [ 194.149.1.88 ]'],
      ] as [string, string][]) {
        push(`${label} ${val}`, 'normal')
        await wait(88)
      }
      await wait(420)
      push('', 'empty')

      // user command — typewritten as if someone is entering it live
      await type(
        '> emlekek --kereses="private link netcafe" --adatbazis=ARCHIVUM_99 --melyseg=teljes',
        'cmd',
        27,
      )
      await wait(490)
      push('', 'empty')

      // search process status messages
      for (const [txt, delay] of [
        ['Lokális index betöltése...', 520],
        ['Tükörcsomópont csatlakoztatása: 194.149.3.2...', 730],
        ['Időbélyeg kereszthivatkozás folyamatban...', 640],
        ['Metaadat indexálás...', 430],
      ] as [string, number][]) {
        push(txt, 'dim')
        await wait(delay)
      }
      push('', 'empty')
      await wait(220)

      // centrepiece — deliberately slow typewriter
      await type('Loading memories...', 'bright', 82)
      await wait(520)
      push('', 'empty')

      // progress bar with authentic irregular pacing
      await progressAnim()
      await wait(460)
      push('', 'empty')
      push('Keresés befejezve. 1 rekord feldolgozva.', 'normal')
      await wait(290)
      push('', 'empty')

      // results block
      const SEP = '─'.repeat(64)
      push(SEP, 'sep')
      push('KERESÉSI EREDMÉNYEK: 1 találat', 'bright')
      push(SEP, 'sep')
      await wait(360)
      push('', 'empty')
      push('[001]  FORRÁS : INDEX.HU/TECH/UZLET          DÁTUM: 1999.08.17', 'normal')
      await wait(90)
      push('       CÍM   : "Private Link: a legális és illegális határán"', 'normal')
      await wait(90)
      push('       URL   : https://index.hu/tech/uzlet/privatelink0/', 'dim')
      await wait(310)
      push('', 'empty')
      push('       [ → MEGNYITÁS ]', 'link', 'https://index.hu/tech/uzlet/privatelink0/')
      await wait(110)
      push('', 'empty')
      push(SEP, 'sep')

      if (!dead.current) setDone(true)
    }

    run()
    return () => { dead.current = true; T.forEach(clearTimeout) }
  }, [])

  /* ── colour & phosphor glow map ─────────────────────────────────── */
  const fg: Record<Kind, string> = {
    normal: '#33ff33',
    cmd:    '#ffe44d',
    dim:    '#1e8a1e',
    bright: '#99ff99',
    sep:    '#155215',
    link:   '#00e5ff',
    empty:  'transparent',
    bar:    '#33ff33',
  }
  const glow: Partial<Record<Kind, string>> = {
    bright: '0 0 8px #33ff33, 0 0 2px #33ff33',
    cmd:    '0 0 7px #ffe44d',
    normal: '0 0 4px rgba(51,255,51,.3)',
    bar:    '0 0 5px rgba(51,255,51,.4)',
    link:   '0 0 8px #00e5ff, 0 0 2px #00e5ff',
  }

  return (
    <>
      {/* VT323 — the canonical CRT terminal bitmap font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=VT323&display=swap"
        rel="stylesheet"
      />

      <style>{`
        html,body { background:#000; margin:0; padding:0; }

        @keyframes t-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes t-flicker {
          0%,87%,100% { opacity:1 }
          88%  { opacity:.97 } 90%  { opacity:1 }
          94%  { opacity:.96 } 96%  { opacity:1 }
        }

        /* blinking block cursor */
        .t-cur::after {
          content: '█';
          color: #33ff33;
          text-shadow: 0 0 6px #33ff33;
          animation: t-blink 1.1s step-end infinite;
        }

        /* whole-screen phosphor flicker */
        .t-screen { animation: t-flicker 11s ease-in-out infinite; }

        /* CSS scanlines overlay */
        .t-scan::before {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0,0,0,.07) 0px, rgba(0,0,0,.07) 1px,
            transparent 1px, transparent 3px
          );
          pointer-events: none;
          z-index: 30;
        }

        /* link hover: invert colours — classic terminal block selection */
        .t-link { transition: background .07s, color .07s; }
        .t-link:hover { background:#00e5ff; color:#000!important; text-shadow:none!important; }

        /* minimal scrollbar */
        ::-webkit-scrollbar { width:5px; background:#000; }
        ::-webkit-scrollbar-thumb { background:#1e5a1e; }
      `}</style>

      <div
        className="t-screen t-scan"
        style={{
          minHeight: '100vh',
          background: '#000',
          padding: 'clamp(1.2rem,3vw,2.2rem) clamp(1rem,3.5vw,2.8rem) 4rem',
          fontFamily: "'VT323','Courier New',Courier,monospace",
          fontSize: 'clamp(15px,1.6vw,21px)',
          lineHeight: 1.48,
          letterSpacing: '.04em',
          boxSizing: 'border-box',
        }}
      >
        {/* radial phosphor bloom — subtle green centre glow */}
        <div style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(ellipse 75% 70% at 50% 45%, rgba(0,50,0,.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 20,
        }} />

        <div style={{ position: 'relative', zIndex: 5, maxWidth: 960 }}>
          {lines.map((ln, idx) => {
            const last     = idx === lines.length - 1
            const showCur  = last && !ln.typed          // cursor while typing
            const idleCur  = last && ln.typed && !done  // cursor waiting

            if (ln.kind === 'empty') return <div key={ln.id} style={{ height: '.85em' }} />

            if (ln.kind === 'link') return (
              <a
                key={ln.id}
                href={ln.href}
                target="_blank"
                rel="noopener noreferrer"
                className="t-link"
                style={{
                  display: 'inline-block',
                  color: fg.link,
                  textDecoration: 'none',
                  textShadow: glow.link,
                  border: '1px solid #00e5ff',
                  padding: '0 .35em',
                }}
              >
                {ln.text}
              </a>
            )

            return (
              <div
                key={ln.id}
                style={{
                  color: fg[ln.kind],
                  textShadow: glow[ln.kind],
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {ln.text}
                {(showCur || idleCur) && <span className="t-cur" />}
              </div>
            )
          })}

          {/* final resting cursor after full sequence completes */}
          {done && (
            <div style={{ color: '#33ff33', marginTop: '.5em' }}>
              <span className="t-cur" />
            </div>
          )}

          <div ref={botRef} />
        </div>
      </div>
    </>
  )
}

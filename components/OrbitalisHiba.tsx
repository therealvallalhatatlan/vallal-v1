'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, Volume2, VolumeX } from 'lucide-react'

type Enemy = { x: number; y: number; hp: number; size: number }
type Shot = { x: number; y: number; vy: number; hostile: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number }

const W = 360
const H = 560
const PLAYER_Y = 500
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export default function OrbitalisHiba() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const game = useRef({
    running: false, score: 0, lives: 3, wave: 1, best: 0,
    x: W / 2, direction: 0, tilt: 0, elapsed: 0, lastTime: 0,
    lastShot: 0, lastEnemyShot: 0,
    enemies: [] as Enemy[], shots: [] as Shot[], particles: [] as Particle[],
  })
  const [started, setStarted] = useState(false)
  const [over, setOver] = useState(false)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [lives, setLives] = useState(3)
  const [wave, setWave] = useState(1)
  const [motion, setMotion] = useState<'off' | 'requesting' | 'waiting' | 'active' | 'no-signal' | 'denied'>('off')
  const [sound, setSound] = useState(false)
  const soundRef = useRef(false)
  const audio = useRef<AudioContext | null>(null)
  const baselineGamma = useRef<number | null>(null)
  const lastGamma = useRef<number | null>(null)
  const baselineAccelX = useRef<number | null>(null)
  const lastAccelX = useRef<number | null>(null)
  const lastOrientationAt = useRef(0)
  const lastSensorAt = useRef(0)

  const tone = useCallback((hz: number, duration: number) => {
    if (!soundRef.current) return
    try {
      const AudioContextClass = window.AudioContext
      const ctx = audio.current ?? new AudioContextClass()
      audio.current = ctx
      if (ctx.state === 'suspended') void ctx.resume()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = 'square'
      oscillator.frequency.value = hz
      gain.gain.setValueAtTime(0.035, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Sound is optional. Keep the game playable when audio is unavailable.
    }
  }, [])

  const buildWave = useCallback((level: number) => {
    const g = game.current
    const cols = Math.min(7, 4 + Math.floor((level - 1) / 2))
    const rows = Math.min(4, 2 + Math.floor(level / 3))
    g.enemies = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        g.enemies.push({
          x: 38 + col * (W - 76) / Math.max(1, cols - 1),
          y: 55 + row * 42,
          hp: row === 0 ? 2 : 1,
          size: row === 0 ? 14 : 12,
        })
      }
    }
  }, [])

  const start = useCallback(() => {
    const g = game.current
    g.running = true
    g.score = 0
    g.lives = 3
    g.wave = 1
    g.x = W / 2
    g.direction = 0
    g.elapsed = 0
    g.lastShot = 0
    g.lastEnemyShot = 0
    g.shots = []
    g.particles = []
    buildWave(1)
    try {
      g.best = Number(localStorage.getItem('vh_arcade_orbital_best') || 0) || 0
    } catch { g.best = 0 }
    setBest(g.best)
    setScore(0)
    setLives(3)
    setWave(1)
    setStarted(true)
    setOver(false)
    soundRef.current = true
    setSound(true)
    tone(440, 0.1)
  }, [buildWave, tone])

  const enableMotion = useCallback(async () => {
    if (!window.isSecureContext) {
      setMotion("denied")
      return
    }

    const orientationEvent = typeof DeviceOrientationEvent !== "undefined"
      ? DeviceOrientationEvent as typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<"granted" | "denied">
        }
      : null
    const motionEvent = typeof DeviceMotionEvent !== "undefined"
      ? DeviceMotionEvent as typeof DeviceMotionEvent & {
          requestPermission?: () => Promise<"granted" | "denied">
        }
      : null

    if (!orientationEvent && !motionEvent) {
      setMotion("denied")
      return
    }

    setMotion("requesting")
    baselineGamma.current = null
    baselineAccelX.current = null
    lastGamma.current = null
    lastAccelX.current = null
    lastOrientationAt.current = 0
    lastSensorAt.current = 0

    try {
      // iOS Safari may gate orientation and motion events separately.
      // Start both permission requests directly from this click handler.
      const permissionRequests: Array<Promise<"granted" | "denied">> = []
      let orientationPermissionIndex = -1
      let motionPermissionIndex = -1

      if (orientationEvent && typeof orientationEvent.requestPermission === "function") {
        orientationPermissionIndex = permissionRequests.length
        permissionRequests.push(orientationEvent.requestPermission())
      }
      if (motionEvent && typeof motionEvent.requestPermission === "function") {
        motionPermissionIndex = permissionRequests.length
        permissionRequests.push(motionEvent.requestPermission())
      }

      const permissions = await Promise.all(permissionRequests)
      if (
        orientationPermissionIndex >= 0 &&
        permissions[orientationPermissionIndex] !== "granted"
      ) {
        setMotion("denied")
        return
      }
      if (
        orientationPermissionIndex < 0 &&
        motionPermissionIndex >= 0 &&
        permissions[motionPermissionIndex] !== "granted"
      ) {
        setMotion("denied")
        return
      }

      setMotion("waiting")
    } catch {
      setMotion("denied")
    }
  }, [])

  useEffect(() => {
    if (motion !== "waiting" && motion !== "active" && motion !== "no-signal") return

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.gamma !== "number") return
      lastGamma.current = event.gamma
      lastOrientationAt.current = Date.now()
      lastSensorAt.current = lastOrientationAt.current

      // Use the phone's first stable position as neutral, so small hand
      // placement differences do not immediately steer the ship.
      if (baselineGamma.current === null) baselineGamma.current = event.gamma
      const delta = event.gamma - baselineGamma.current
      const deadZone = 2.5
      const responsiveDelta = Math.abs(delta) <= deadZone
        ? 0
        : Math.sign(delta) * (Math.abs(delta) - deadZone)
      game.current.tilt = clamp(responsiveDelta / 20, -1, 1)

      setMotion(current => current === "active" ? current : "active")
    }

    const onDeviceMotion = (event: DeviceMotionEvent) => {
      // Prefer orientation data when it is available. Acceleration is a
      // fallback for browsers/devices that expose motion but no gamma value.
      if (Date.now() - lastOrientationAt.current < 700) return
      const accelerationX = event.accelerationIncludingGravity?.x
      if (typeof accelerationX !== "number") return

      lastAccelX.current = accelerationX
      lastSensorAt.current = Date.now()
      if (baselineAccelX.current === null) baselineAccelX.current = accelerationX
      game.current.tilt = clamp((accelerationX - baselineAccelX.current) / 5, -1, 1)
      setMotion(current => current === "active" ? current : "active")
    }

    window.addEventListener("deviceorientation", onOrientation, true)
    window.addEventListener("devicemotion", onDeviceMotion, true)

    const noSignalTimer = window.setTimeout(() => {
      if (lastSensorAt.current === 0) setMotion(current => current === "waiting" ? "no-signal" : current)
    }, 2200)

    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true)
      window.removeEventListener("devicemotion", onDeviceMotion, true)
      window.clearTimeout(noSignalTimer)
    }
  }, [motion])

  const toggleMotion = useCallback(() => {
    const enabled = motion === 'requesting' || motion === 'waiting' || motion === 'active' || motion === 'no-signal'
    if (enabled) {
      setMotion('off')
      game.current.tilt = 0
      game.current.direction = 0
    } else {
      void enableMotion()
    }
  }, [enableMotion, motion])

  const calibrateMotion = useCallback(() => {
    if (lastGamma.current !== null) baselineGamma.current = lastGamma.current
    if (lastAccelX.current !== null) baselineAccelX.current = lastAccelX.current
    game.current.tilt = 0
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      if (event.key === ' ' && pressed && !game.current.running) start()
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') game.current.direction = pressed ? -1 : 0
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') game.current.direction = pressed ? 1 : 0
    }
    const down = (event: KeyboardEvent) => onKey(event, true)
    const up = (event: KeyboardEvent) => onKey(event, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [start])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const draw = (time: number) => {
      const g = game.current
      const dt = Math.min(0.034, g.lastTime ? (time - g.lastTime) / 1000 : 0.016)
      g.lastTime = time
      if (g.running) {
        g.elapsed += dt
        const input = Math.abs(g.direction) > 0
          ? g.direction
          : Math.abs(g.tilt) > 0.09 ? g.tilt : 0
        g.x = clamp(g.x + input * 275 * dt, 18, W - 18)
        if (time - g.lastShot > 220) {
          g.shots.push({ x: g.x, y: PLAYER_Y - 20, vy: -470, hostile: false })
          g.lastShot = time
          tone(680, 0.025)
        }
        if (g.enemies.length && time - g.lastEnemyShot > Math.max(620, 1500 - g.wave * 70)) {
          const enemy = g.enemies[Math.floor(Math.random() * g.enemies.length)]
          g.shots.push({ x: enemy.x, y: enemy.y + 10, vy: 155 + g.wave * 9, hostile: true })
          g.lastEnemyShot = time
        }
        const shift = Math.sin(g.elapsed * (0.65 + g.wave * 0.05)) * (18 + g.wave * 2)
        for (const enemy of g.enemies) enemy.y += dt * (8 + g.wave * 2)
        for (const shot of g.shots) shot.y += shot.vy * dt
        g.shots = g.shots.filter(shot => shot.y > -20 && shot.y < H + 20)

        for (let i = g.shots.length - 1; i >= 0; i--) {
          const shot = g.shots[i]
          if (shot.hostile) {
            if (Math.abs(shot.x - g.x) < 17 && Math.abs(shot.y - PLAYER_Y) < 17) {
              g.shots.splice(i, 1)
              g.lives -= 1
              setLives(g.lives)
              tone(120, 0.15)
              if (g.lives <= 0) {
                g.running = false
                setOver(true)
              }
            }
            continue
          }
          const index = g.enemies.findIndex(enemy =>
            Math.abs(enemy.x + shift - shot.x) < enemy.size + 3 &&
            Math.abs(enemy.y - shot.y) < enemy.size + 4
          )
          if (index >= 0) {
            const enemy = g.enemies[index]
            enemy.hp -= 1
            g.shots.splice(i, 1)
            for (let p = 0; p < 6; p++) {
              g.particles.push({
                x: shot.x, y: shot.y,
                vx: (Math.random() - 0.5) * 110,
                vy: (Math.random() - 0.5) * 110, life: 0.32,
              })
            }
            if (enemy.hp <= 0) {
              g.enemies.splice(index, 1)
              g.score += 100 * g.wave
              setScore(g.score)
              tone(300 + Math.random() * 260, 0.05)
            }
          }
        }
        g.particles = g.particles.filter(p => p.life > 0)
        for (const p of g.particles) {
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.life -= dt
        }
        if (g.enemies.some(enemy => enemy.y > PLAYER_Y - 35)) {
          g.running = false
          g.lives = 0
          setLives(0)
          setOver(true)
        }
        if (!g.enemies.length && g.running) {
          g.wave += 1
          setWave(g.wave)
          buildWave(g.wave)
          tone(880, 0.17)
        }
        if (g.score > g.best) {
          g.best = g.score
          setBest(g.best)
          try { localStorage.setItem('vh_arcade_orbital_best', String(g.best)) } catch { /* local score is optional */ }
        }
      }

      ctx.fillStyle = '#030609'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 52; i++) {
        const x = (i * 71 + Math.floor(g.elapsed * (3 + i % 3))) % W
        const y = (i * 97 + Math.floor(g.elapsed * (8 + i % 5))) % H
        ctx.fillStyle = i % 7 === 0 ? 'rgba(190,242,100,.65)' : 'rgba(173,190,190,.35)'
        ctx.fillRect(x, y, i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1)
      }
      for (const enemy of g.enemies) {
        const x = enemy.x + Math.sin(g.elapsed * (0.65 + g.wave * 0.05)) * (18 + g.wave * 2)
        ctx.fillStyle = enemy.hp > 1 ? '#d8f99b' : '#a3e635'
        ctx.fillRect(x - 7, enemy.y - 7, 14, 4)
        ctx.fillRect(x - 11, enemy.y - 3, 22, 7)
        ctx.fillRect(x - 7, enemy.y + 4, 4, 4)
        ctx.fillRect(x + 3, enemy.y + 4, 4, 4)
        ctx.fillStyle = '#071006'
        ctx.fillRect(x - 5, enemy.y - 1, 3, 3)
        ctx.fillRect(x + 2, enemy.y - 1, 3, 3)
      }
      const px = Math.round(g.x)
      ctx.fillStyle = '#f4f4ef'
      ctx.fillRect(px - 3, PLAYER_Y - 20, 6, 7)
      ctx.fillRect(px - 9, PLAYER_Y - 12, 18, 8)
      ctx.fillRect(px - 15, PLAYER_Y - 5, 30, 5)
      ctx.fillRect(px - 5, PLAYER_Y - 25, 3, 8)
      ctx.fillRect(px + 2, PLAYER_Y - 25, 3, 8)
      ctx.fillStyle = '#a3e635'
      ctx.fillRect(px - 2, PLAYER_Y - 15, 4, 2)
      for (const shot of g.shots) {
        ctx.fillStyle = shot.hostile ? '#ff6b6b' : '#bef264'
        ctx.fillRect(Math.round(shot.x) - 1, Math.round(shot.y) - 5, 2, 9)
      }
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.32)
        ctx.fillStyle = '#c5f36a'
        ctx.fillRect(p.x, p.y, 2, 2)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(0,0,0,.22)'
      for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1)
      const vignette = ctx.createRadialGradient(W / 2, H / 2, 130, W / 2, H / 2, 360)
      vignette.addColorStop(0, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,.42)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, W, H)
      frameRef.current = requestAnimationFrame(draw)
    }
    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [buildWave, tone])

  useEffect(() => () => {
    cancelAnimationFrame(frameRef.current)
    if (audio.current) void audio.current.close()
  }, [])

  const move = (direction: number) => { game.current.direction = direction }
  const sensorEnabled = motion === 'requesting' || motion === 'waiting' || motion === 'active' || motion === 'no-signal'

  return (
    <section className="mx-auto w-full max-w-5xl px-3 sm:px-8 mt-12" aria-label="Űrhajós minijáték">
      <div className="mx-auto flex max-h-[76dvh] w-full max-w-[420px] flex-col overflow-hidden border border-lime-200/0 bg-transparent">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500" style={{ fontFamily: 'var(--font-mono-tech)' }}>
          <span>SYS. 1999.08 / SIGNAL LOST</span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-lime-200/90">WAVE {String(wave).padStart(2, '0')}</span>
            <button type="button" onClick={() => setSound(value => {
              soundRef.current = !value
              return !value
            })} aria-label={sound ? 'Hang kikapcsolása' : 'Hang bekapcsolása'} aria-pressed={sound} className="inline-flex h-7 w-7 items-center justify-center border border-lime-200/25 text-zinc-300 transition-colors hover:border-lime-200/70 hover:text-lime-100">
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 border-b border-zinc-800 text-center">
          <div className="border-r border-zinc-800 py-1.5">
            <p className="text-[10px] tracking-widest text-zinc-500">SCORE</p>
            <p className="text-base tabular-nums text-lime-100">{String(score).padStart(6, '0')}</p>
          </div>
          <div className="border-r border-zinc-800 py-1.5">
            <p className="text-[10px] tracking-widest text-zinc-500">BEST</p>
            <p className="text-base tabular-nums text-zinc-300">{String(best).padStart(6, '0')}</p>
          </div>
          <div className="py-1.5">
            <p className="text-[10px] tracking-widest text-zinc-500">LIVES</p>
            <p className="text-base tracking-[0.2em] text-red-300">{'♥ '.repeat(lives).trim() || '—'}</p>
          </div>
        </div>
        <div className="relative mx-auto w-full shrink-0">
          <div className="relative mx-auto w-full" style={{ width: 'min(100%, calc((76dvh - 230px) * 0.642857))' }}>
            <canvas ref={canvasRef} width={W} height={H} className="block aspect-[9/14] h-auto w-full touch-pan-y" aria-label="Űrhajós lövöldözős játék" />
            {(!started || over) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#030609]/85 px-5 text-center backdrop-blur-[2px]">
                <p className="text-[10px] uppercase tracking-[0.24em] text-lime-200/80">{over ? 'SIGNAL TERMINATED' : 'INCOMING TRANSMISSION'}</p>
                <h3 className="mt-2 text-xl font-bold uppercase tracking-[0.12em] text-zinc-100">{over ? 'GAME OVER' : 'INSERT COIN'}</h3>
                <p className="mt-2 max-w-[260px] text-[12px] leading-5 text-zinc-300">
                  {over
                    ? `ELÉRT PONTSZÁM: ${score}`
                    : 'Döntsd balra vagy jobbra a telefont. A mozgásérzékelő az alapértelmezett irányítás, a fegyver automatikusan tüzel.'}
                </p>
                <button type="button" onClick={start} className="mt-4 border border-lime-200/70 bg-lime-200/10 px-7 py-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-lime-100 transition-colors hover:bg-lime-200/20">
                  {over ? 'ÚJRAINDÍTÁS' : 'START GAME'}
                </button>
                {!started && <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">A szenzort alul tudod engedélyezni</p>}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono-tech)' }}>
          <button
            type="button"
            onClick={toggleMotion}
            role="switch"
            aria-checked={sensorEnabled}
            className="inline-flex min-h-9 items-center gap-2.5 text-left text-lime-100"
          >
            <span className="text-[10px] tracking-[0.1em]">ENGEDÉLYEZEM A SZENZORT</span>
            <span className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full border transition-colors ${sensorEnabled ? 'border-lime-200 bg-lime-200/20' : 'border-zinc-600 bg-zinc-900'}`}>
              <span className={`absolute h-3.5 w-3.5 rounded-full transition-transform ${sensorEnabled ? 'translate-x-[21px] bg-lime-200' : 'translate-x-1 bg-zinc-500'}`} />
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              {motion === 'active' ? <Activity size={13} className="text-lime-200" /> : null}
              {motion === 'active' ? 'SENSOR AKTÍV' : motion === 'requesting' ? 'ENGEDÉLYKÉRÉS' : motion === 'waiting' ? 'ÉRZÉKELŐ KERESÉSE' : motion === 'no-signal' ? 'NINCS JEL' : motion === 'denied' ? 'NEM ELÉRHETŐ' : 'KÉZI IRÁNYÍTÁS'}
            </span>
            {motion === 'active' && (
              <button type="button" onClick={calibrateMotion} className="border border-zinc-700 px-2 py-1.5 text-lime-200 hover:border-lime-200/70">KÖZÉPRE ÁLLÍT</button>
            )}
          </div>
        </div>
        {motion !== 'active' && (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-900 px-3 py-2 sm:hidden">
            <button type="button" onPointerDown={() => move(-1)} onPointerUp={() => move(0)} onPointerLeave={() => move(0)} onPointerCancel={() => move(0)} className="min-h-10 border border-zinc-700 bg-zinc-950 text-2xl leading-none text-zinc-200 active:border-lime-200 active:text-lime-100" aria-label="Balra mozgatás">←</button>
            <button type="button" onPointerDown={() => move(1)} onPointerUp={() => move(0)} onPointerLeave={() => move(0)} onPointerCancel={() => move(0)} className="min-h-10 border border-zinc-700 bg-zinc-950 text-2xl leading-none text-zinc-200 active:border-lime-200 active:text-lime-100" aria-label="Jobbra mozgatás">→</button>
          </div>
        )}
      </div>
    </section>
  )
}
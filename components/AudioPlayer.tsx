'use client'

import { useEffect, useRef, useState, forwardRef } from 'react'
import { fmtTime, bandAvg } from '@/utils/audio'

export type Track = { title: string; file: string; durationSec?: number }
export type Props = { tracks: Track[]; images?: string[] }

export default function AudioPlayer({ tracks, images = [] }: Props) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [userInteracted, setUserInteracted] = useState(false)
  const [shouldAutoplay, setShouldAutoplay] = useState(true)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // Robust preloader: only draw fully loaded images (avoid 'broken' state)
const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([])
useEffect(() => {
  let cancelled = false
  setLoadedImgs([])
  images.forEach((src) => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // allow canvas ops if server sends CORS
    ;(img as any).decoding = 'async'
    img.referrerPolicy = 'no-referrer'
    img.onload = () => { if (!cancelled && img.naturalWidth > 0) setLoadedImgs((prev) => [...prev, img]) }
    img.onerror = () => { /* silently skip broken image */ }
    img.src = src
  })
  return () => { cancelled = true }
}, [images])

  // Ensure canvas pixel size matches CSS size
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const resize = () => {
      const rect = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))
      if (c.width !== w) c.width = w
      if (c.height !== h) c.height = h
      if (!ctxRef.current) ctxRef.current = c.getContext('2d')
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(c)
    return () => ro.disconnect()
  }, [])

  // Detect first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true)
      if (shouldAutoplay && !playing) {
        play()
        setShouldAutoplay(false)
      }
    }

    // Listen for any user interaction
    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('keydown', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [shouldAutoplay, playing])

  // Load current track
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const file = tracks[index]?.file
    if (!file) return

    const url = `/api/audio/${file.split('/').map(encodeURIComponent).join('/')}`
    audio.src = url
    audio.load()
    setProgress(0); setCurrentTime(0); setDuration(0)

    const onLoaded = () => {
      setDuration(audio.duration || 0)
      // Try autoplay if user has already interacted
      if (index === 0 && userInteracted && shouldAutoplay) {
        play()
        setShouldAutoplay(false)
      }
    }
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      if (audio.duration) setProgress(audio.currentTime / audio.duration)
    }
    const onEnd = () => next()

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
    }
  }, [index, tracks, userInteracted, shouldAutoplay])

  // Start visualizer automatically when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startViz()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Restart visualizer when audio context becomes available
  useEffect(() => {
    if (analyserRef.current && playing) {
      startViz()
    }
  }, [playing])

  async function ensureAudioNodes() {
    const audio = audioRef.current!
    if (!audio) return
    if (!acRef.current) acRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ac = acRef.current
    if (!srcNodeRef.current) srcNodeRef.current = ac.createMediaElementSource(audio)
    if (!analyserRef.current) {
      const an = ac.createAnalyser()
      an.fftSize = 2048; an.smoothingTimeConstant = 0.85
      analyserRef.current = an
      srcNodeRef.current.connect(an); an.connect(ac.destination)
      // Restart visualizer now that we have audio context
      startViz()
    }
  }

  function play() {
    const audio = audioRef.current; if (!audio) return
    ensureAudioNodes().then(() => { 
      audio.play().catch((err) => {
        console.log('Autoplay prevented:', err)
      })
      setPlaying(true)
    })
  }
  function pause() { const a = audioRef.current; if (!a) return; a.pause(); setPlaying(false) }
  function toggle() { playing ? pause() : play() }
  function next() { setIndex((i) => (i + 1) % tracks.length) }
  function prev() { setIndex((i) => (i - 1 + tracks.length) % tracks.length) }
  function seek(p: number) {
    const a = audioRef.current; if (!a || !a.duration) return
    a.currentTime = p * a.duration; setProgress(p)
  }

  // Glitch visualizer
  const rafRef = useRef<number | null>(null)
  function startViz() {
    cancelViz()
    const c = canvasRef.current, ctx = ctxRef.current
    if (!c || !ctx) return
    
    const buffer = new Uint8Array(1024)

    const draw = () => {
      // Get frequency data if analyser is available, otherwise use fallback animation
      if (analyserRef.current && playing) {
        try {
          analyserRef.current.getByteFrequencyData(buffer)
        } catch {
          // Fallback if analyser fails
          createFallbackAnimation(buffer)
        }
      } else {
        // Create animated fallback when no audio or not playing
        createFallbackAnimation(buffer)
      }

      const bass = bandAvg(buffer, 2, 30)
      const mid = bandAvg(buffer, 31, 90)
      const hi = bandAvg(buffer, 91, Math.min(256, buffer.length - 1))
      const energy = (bass * 1.2 + mid * 0.9 + hi * 0.4) / 3

      const W = c.width, H = c.height
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)

      const j = Math.min(20, energy / 6 + 2) // Add minimum movement
      const sliceH = Math.max(8, 16 + Math.floor((energy / 255) * 24))

      // Draw images with glitch effects
      loadedImgs.forEach((img, idx) => {
        if (!img.complete || img.naturalWidth === 0) return
        const dx = (Math.sin(Date.now() / 300 + idx) * j) | 0
        const dy = (Math.cos(Date.now() / 500 + idx * 2) * j) | 0
        ;(ctx as any).globalCompositeOperation = idx % 2 ? 'lighter' : 'difference'
        try {
          ctx.drawImage(img, dx, dy, W, H)
        } catch { /* ignore rare race conditions */ }
      })

      // Glitch effects
      for (let y = 0; y < H; y += sliceH) {
        const offset = ((Math.random() - 0.5) * j * 4) | 0
        const hgt = Math.min(sliceH, H - y)
        try {
          const imgData = ctx.getImageData(0, y, W, hgt)
          ctx.putImageData(imgData, offset, y)
        } catch { /* ignore if canvas not ready */ }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 0.15
      for (let y = 0; y < H; y += 2) { 
        ctx.fillStyle = '#000'
        ctx.fillRect(0, y, W, 1) 
      }
      ctx.globalAlpha = 1

      rafRef.current = requestAnimationFrame(draw)
    }

    // Helper function for fallback animation
    function createFallbackAnimation(buffer: Uint8Array) {
      const time = Date.now() / 1000
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.max(0, Math.min(255, 
          Math.sin(time * 2 + i / 20) * 40 + 
          Math.cos(time * 3 + i / 30) * 30 + 50
        ))
      }
    }

    rafRef.current = requestAnimationFrame(draw)
  }
  function cancelViz() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null }
  useEffect(() => () => cancelViz(), [])

  const track = tracks[index]
  return (
    <div className="w-full space-y-6">
      <div className="p-4 bg-black/70 rounded-2xl shadow-xl border border-zinc-800">
        {!userInteracted && shouldAutoplay && (
          <div className="mb-4 p-3 bg-lime-600/20 border border-lime-600/50 rounded-xl text-center">
            <p className="text-lime-300 text-sm">Kattints bárhova az automatikus lejátszáshoz</p>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-zinc-200 font-medium text-sm leading-tight mb-2 mt-2">{track.title}</div>
            <div className="text-xs text-zinc-500">{index + 1} / {tracks.length}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={prev} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200">⏮</button>
            <button onClick={toggle} className="px-4 py-2 rounded-xl bg-lime-600 hover:bg-lime-500 text-black font-semibold">{playing ? 'Pause' : 'Play'}</button>
            <button onClick={next} className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200">⏭</button>
          </div>
        </div>

        <input type="range" min={0} max={1000} value={Math.floor(progress * 1000)} onChange={(e) => seek(Number(e.target.value) / 1000)} className="w-full accent-lime-500" />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>

        <div className="mt-4 flex gap-3">
          <a href={`/api/audio/${track.file.split('/').map(encodeURIComponent).join('/')}?download=1`} className="px-3 py-2 rounded-xl text-xs bg-zinc-900 hover:bg-zinc-700 text-zinc-200/50">⬇ Letöltés</a>
        </div>

        <audio ref={audioRef} preload="none" className="hidden" />
      </div>

      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black">
        <CanvasResponsive ref={canvasRef} />
      </div>
    </div>
  )
}

const CanvasResponsive = forwardRef<HTMLCanvasElement, {}>((_props, ref) => (
  <div className="w-full" style={{ aspectRatio: '16/9' }}>
    <canvas ref={ref as any} className="w-full h-full" />
  </div>
))
CanvasResponsive.displayName = 'CanvasResponsive'

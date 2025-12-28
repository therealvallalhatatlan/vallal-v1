'use client'

import { useEffect, useRef, useState, forwardRef, useCallback } from 'react'
import { fmtTime, bandAvg } from '@/utils/audio'

export type Track = { title: string; file: string; durationSec?: number }
export type Props = { tracks: Track[]; images?: string[]; mode?: 'dark' | 'light' }

type Platform = 'youtube' | 'spotify' | 'google'

export default function AudioPlayer3({ tracks, images = [], mode = 'dark' }: Props) {
  const isLight = mode === 'light'
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showTools, setShowTools] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const lastFrameRef = useRef(0)

  // ---- Image preload for visualizer ----
  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([])
  useEffect(() => {
    let cancelled = false
    const imgs: HTMLImageElement[] = []
    setLoadedImgs([])
    images.forEach((src) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      ;(img as any).decoding = 'async'
      img.referrerPolicy = 'no-referrer'
      img.onload = () => {
        if (!cancelled && img.naturalWidth > 0) {
          setLoadedImgs((prev) => [...prev, img])
        }
      }
      img.onerror = () => {}
      img.src = src
      imgs.push(img)
    })
    return () => {
      cancelled = true
      // Force image cleanup
      imgs.forEach(img => {
        img.src = ''
        img.onload = null
        img.onerror = null
      })
      setLoadedImgs([])
    }
  }, [images])

  // ---- Canvas sizing ----
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const resize = () => {
      const rect = c.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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

  // ---- Track betöltése ----
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const file = tracks[index]?.file
    if (!file) return

    const url = `/api/audio/${file.split('/').map(encodeURIComponent).join('/')}`
    audio.src = url
    audio.load()
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)

    const onLoaded = () => {
      setDuration(audio.duration || 0)
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
  }, [index, tracks])

  // ---- Visualizer indulás / cleanup ----
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      startViz()
    }, 100)
    return () => {
      clearTimeout(timer)
      // Memory cleanup
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      // Close AudioContext
      if (acRef.current && acRef.current.state !== 'closed') {
        acRef.current.close().catch(() => {})
        acRef.current = null
      }
      // Clear canvas
      if (canvasRef.current && ctxRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }, [])

  useEffect(() => {
    if (analyserRef.current && playing) {
      startViz()
    }
  }, [playing])

  async function ensureAudioNodes() {
    const audio = audioRef.current
    if (!audio) return
    if (!acRef.current) {
      acRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)()
    }
    const ac = acRef.current
    if (!srcNodeRef.current) {
      srcNodeRef.current = ac.createMediaElementSource(audio)
    }
    if (!analyserRef.current) {
      const an = ac.createAnalyser()
      an.fftSize = 2048
      an.smoothingTimeConstant = 0.85
      analyserRef.current = an
      srcNodeRef.current.connect(an)
      an.connect(ac.destination)
      startViz()
    }
  }

  function play() {
    const audio = audioRef.current
    if (!audio) return
    ensureAudioNodes().then(() => {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch((err) => {
          console.log('Autoplay prevented:', err)
        })
    })
  }

  function pause() {
    const a = audioRef.current
    if (!a) return
    a.pause()
    setPlaying(false)
  }

  function toggle() {
    playing ? pause() : play()
  }
  const toggleTools = () => setShowTools((prev) => !prev)

  function next() {
    setIndex((i) => (i + 1) % tracks.length)
  }

  function prev() {
    setIndex((i) => (i - 1 + tracks.length) % tracks.length)
  }

  function seek(p: number) {
    const a = audioRef.current
    if (!a || !a.duration) return
    a.currentTime = p * a.duration
    setProgress(p)
  }

  function startViz() {
    cancelViz()
    const c = canvasRef.current
    const ctx = ctxRef.current
    if (!c || !ctx) return

    const buffer = new Uint8Array(1024)

    const draw = () => {
      const now = performance.now()
      if (now - lastFrameRef.current < 33) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      lastFrameRef.current = now

      if (analyserRef.current && playing) {
        try {
          analyserRef.current.getByteFrequencyData(buffer)
        } catch {
          createFallbackAnimation(buffer)
        }
      } else {
        createFallbackAnimation(buffer)
      }

      const bass = bandAvg(buffer, 2, 30)
      const mid = bandAvg(buffer, 31, 90)
      const hi = bandAvg(buffer, 91, Math.min(256, buffer.length - 1))
      const energy = (bass * 1.2 + mid * 0.9 + hi * 0.4) / 3

      const W = c.width
      const H = c.height
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      const j = Math.min(20, energy / 6 + 2)
      const sliceH = Math.max(8, 16 + Math.floor((energy / 255) * 24))

      loadedImgs.forEach((img, idx) => {
        if (!img.complete || img.naturalWidth === 0) return
        const dx = (Math.sin(Date.now() / 300 + idx) * j) | 0
        const dy = (Math.cos(Date.now() / 500 + idx * 2) * j) | 0
        ;(ctx as any).globalCompositeOperation =
          idx % 2 ? 'lighter' : 'difference'
        try {
          ctx.drawImage(img, dx, dy, W, H)
        } catch {}
      })

      for (let y = 0; y < H; y += sliceH) {
        const offset = ((Math.random() - 0.5) * j * 4) | 0
        const hgt = Math.min(sliceH, H - y)
        try {
          // drawImage-based slice shift avoids getImageData/putImageData readback
          ctx.drawImage(c, 0, y, W, hgt, offset, y, W, hgt)
        } catch {}
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

    function createFallbackAnimation(buffer: Uint8Array) {
      const time = Date.now() / 1000
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.max(
          0,
          Math.min(
            255,
            Math.sin(time * 2 + i / 20) * 40 +
              Math.cos(time * 3 + i / 30) * 30 +
              50,
          ),
        )
      }
    }

    rafRef.current = requestAnimationFrame(draw)
  }

  function cancelViz() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  useEffect(
    () => () => {
      cancelViz()
    },
    [],
  )

  // ---- UX: cím másolása ----
  const handleCopyTitle = useCallback(async () => {
    const text = tracks[index]?.title || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = text
        el.setAttribute('readonly', '')
        el.style.position = 'absolute'
        el.style.left = '-9999px'
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      } catch {}
    }
  }, [tracks, index])

  const handleOpenPlatform = useCallback(
    (platform: Platform) => {
      const t = tracks[index]
      if (!t?.title) return

      const query = encodeURIComponent(t.title)
      let url = ''

      switch (platform) {
        case 'youtube':
          url = `https://www.youtube.com/results?search_query=${query}`
          break
        case 'spotify':
          url = `https://open.spotify.com/search/${query}`
          break
        case 'google':
          url = `https://www.google.com/search?q=${query}`
          break
      }

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    },
    [tracks, index],
  )

  const track = tracks[index]
  const apiUrl = `/api/audio/${track.file.split('/').map(encodeURIComponent).join('/')}`

  return (
    <div className="w-full max-w-full">
      <div
        className={`relative p-3 md:p-5 lg:p-6 rounded-3xl border overflow-hidden ${
          isLight ? 'bg-white/60 border-neutral-300/40' : 'bg-black/0 border-neutral-600/10'
        }`}
      >
        <div className="absolute inset-0 -z-10 pointer-events-none opacity-60">
          <CanvasResponsive ref={canvasRef} />
          <div className="absolute inset-0 bg-transparent" />
        </div>

        {/* fejléc: cím + vezérlők, mobilon egymás alatt */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleCopyTitle}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') &&
                (e.preventDefault(), handleCopyTitle())
              }
              className="group inline-flex max-w-full items-center gap-2 text-left"
              aria-label="Cím másolása a vágólapra"
              title={copied ? 'Másolva!' : 'Kattints a másoláshoz'}
            >
              <span
                className={`truncate font-medium text-xs md:text-xs leading-snug group-hover:underline ${
                  isLight ? 'text-neutral-700' : 'text-zinc-200'
                }`}
              >
                {track.title}
              </span>
            </button>
            <div className={`mt-1 text-[11px] ${isLight ? 'text-neutral-600' : 'text-zinc-500'}`}>
              {index + 1} / {tracks.length}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={toggle}
              className="h-9 px-5 rounded-full bg-neutral-100 hover:bg-white text-neutral-900 text-sm font-semibold flex items-center justify-center transition-colors"
              aria-label={playing ? 'Szünet' : 'Lejátszás'}
            >
              {playing ? '⏸' : '▶'}
            </button>
          </div>
        </div>

        {/* idővonal */}
        <div className="space-y-1 mb-4">
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.floor(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            className={`w-full ${isLight ? 'accent-neutral-800' : 'accent-neutral-100'}`}
            aria-label="Idővonal"
          />
          <div className={`flex justify-between text-[11px] ${isLight ? 'text-neutral-600' : 'text-zinc-500'}`}>
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* letöltés + platform gombok, levegősebb elrendezés */}
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleTools}
            aria-expanded={showTools}
            aria-controls="player3-tools"
            className={`group inline-flex items-center gap-2 text-[11px] transition-colors uppercase tracking-[0.2em] ${
              isLight ? 'text-neutral-600 hover:text-neutral-800' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-base border ${
                isLight
                  ? 'border-neutral-300 bg-neutral-100 group-hover:bg-neutral-200 text-neutral-700'
                  : 'border-zinc-700 bg-zinc-900/70 group-hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              …
            </span>
            megosztás
          </button>
          <div
            id="player3-tools"
            className={`transition-all duration-300 ease-out overflow-hidden ${
              showTools ? 'max-h-48 mt-3' : 'max-h-0'
            }`}
          >
            <div className="px-1 space-y-2">
              <a
                href={`${apiUrl}?download=1`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                  isLight
                    ? 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700'
                    : 'border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-200'
                }`}
              >
                ⬇ MP3 letöltés
              </a>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenPlatform('youtube')}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    isLight
                      ? 'border-red-600/40 bg-red-500/10 hover:bg-red-500/20 text-red-700'
                      : 'border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-red-200'
                  }`}
                >
                  YouTube keresés
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPlatform('spotify')}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    isLight
                      ? 'border-emerald-600/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700'
                      : 'border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  Spotify keresés
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPlatform('google')}
                  className={`px-3 py-1.5 rounded-full text-[11px] border transition-colors ${
                    isLight
                      ? 'border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700'
                      : 'border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-zinc-100'
                  }`}
                >
                  Google keresés
                </button>
              </div>
              <p className={`text-[10px] leading-relaxed ${isLight ? 'text-neutral-600' : 'text-zinc-500'}`}>
                Tipp: a címre kattintva a track nevét is kimásolhatod.
              </p>
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="none" className="hidden" />
      </div>
    </div>
  )
}

const CanvasResponsive = forwardRef<HTMLCanvasElement, {}>((_props, ref) => (
  <canvas ref={ref as any} className="w-full h-full bg-transparent" />
))
CanvasResponsive.displayName = 'CanvasResponsive'

'use client'

import { useEffect, useRef, useState, forwardRef, useCallback } from 'react'
import { fmtTime, bandAvg } from '@/utils/audio'

export type Track = { title: string; file: string; durationSec?: number }
export type Props = { tracks: Track[]; images?: string[] }

type Platform = 'youtube' | 'spotify' | 'google'

export default function AudioPlayer({ tracks, images = [] }: Props) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [userInteracted, setUserInteracted] = useState(false)
  const [shouldAutoplay, setShouldAutoplay] = useState(true)
  const [copied, setCopied] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null)

  // ---- Image preload for visualizer ----
  const [loadedImgs, setLoadedImgs] = useState<HTMLImageElement[]>([])
  useEffect(() => {
    let cancelled = false
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
    })
    return () => {
      cancelled = true
    }
  }, [images])

  // ---- Canvas sizing ----
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

  // ---- First interaction (autoplay engedély) ----
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true)
      if (shouldAutoplay && !playing) {
        play()
        setShouldAutoplay(false)
      }
    }

    document.addEventListener('click', handleInteraction, { once: true })
    document.addEventListener('keydown', handleInteraction, { once: true })
    document.addEventListener('touchstart', handleInteraction, { once: true })

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('keydown', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [shouldAutoplay, playing])

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

  // ---- Visualizer indulás / cleanup ----
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      startViz()
    }, 100)
    return () => clearTimeout(timer)
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
          const imgData = ctx.getImageData(0, y, W, hgt)
          ctx.putImageData(imgData, offset, y)
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
  const apiUrl = `/api/audio/${track.file
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`

  return (
    <div className="w-full space-y-6">
      <div className="p-5 md:p-6 bg-black/70 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,.45)] border border-zinc-800/80 backdrop-blur-sm">
        {!userInteracted && shouldAutoplay && (
          <div className="mb-4 p-3 rounded-2xl bg-lime-600/15 border border-lime-600/40 text-center">
            <p className="text-lime-300 text-xs md:text-sm">
              Kattints bárhova az automatikus lejátszáshoz.
            </p>
          </div>
        )}

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
              <span className="truncate text-zinc-100 font-medium text-sm md:text-base leading-snug group-hover:underline">
                {track.title}
              </span>

            </button>
            <div className="mt-1 text-[11px] text-zinc-500">
              {index + 1} / {tracks.length}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={prev}
              className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center text-sm transition-colors"
              aria-label="Előző"
            >
              ⏮
            </button>
            <button
              onClick={toggle}
              className="h-9 px-5 rounded-full border border-lime-600 bg-lime-600 hover:bg-lime-500 text-black text-sm font-semibold flex items-center justify-center transition-colors"
              aria-label={playing ? 'Szünet' : 'Lejátszás'}
            >
              {playing ? 'Szünet' : 'Lejátszás'}
            </button>
            <button
              onClick={next}
              className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 flex items-center justify-center text-sm transition-colors"
              aria-label="Következő"
            >
              ⏭
            </button>
          </div>
        </div>

        {/* idővonal */}
        <div className="space-y-1.5 mb-4">
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.floor(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            className="w-full accent-lime-500"
            aria-label="Idővonal"
          />
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* letöltés + platform gombok, levegősebb elrendezés */}
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${apiUrl}?download=1`}
              className="px-3 py-2 rounded-2xl text-xs border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-200 shadow-sm"
            >
              ⬇ Letöltés
            </a>
            <span className="text-[11px] text-zinc-500">
              vagy nyisd meg a saját platformodon:
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleOpenPlatform('youtube')}
              className="px-3 py-1.5 rounded-full text-[11px] border border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-red-200 transition-colors"
            >
              YouTube keresés
            </button>
            <button
              type="button"
              onClick={() => handleOpenPlatform('spotify')}
              className="px-3 py-1.5 rounded-full text-[11px] border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 transition-colors"
            >
              Spotify keresés
            </button>
            <button
              type="button"
              onClick={() => handleOpenPlatform('google')}
              className="px-3 py-1.5 rounded-full text-[11px] border border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-zinc-100 transition-colors"
            >
              Google keresés
            </button>
          </div>

          <p className="text-[10px] text-zinc-500/90 leading-relaxed">
            Tipp: a címre kattintva a track nevét is kimásolhatod, ha egy másik
            appban akarsz rákeresni.
          </p>
        </div>

        <audio ref={audioRef} preload="none" className="hidden" />
      </div>

      <div className="rounded-3xl overflow-hidden border border-zinc-800 bg-black">
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

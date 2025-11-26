'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { fmtTime } from '@/utils/audio'

export type Track = { title: string; file: string; durationSec?: number }
export type Props = { tracks: Track[]; images?: string[] }

type Platform = 'youtube' | 'spotify' | 'google'

export default function AudioPlayer2({ tracks, images = [] }: Props) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showTools, setShowTools] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Track betöltése
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const file = tracks[index]?.file
    if (!file) return
    const url = `/api/audio/${file.split('/').map(encodeURIComponent).join('/')}`
    audio.src = url
    audio.load()
    setProgress(0); setCurrentTime(0); setDuration(0)
    const onLoaded = () => setDuration(audio.duration || 0)
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

  function play() {
    const audio = audioRef.current
    if (!audio) return
    audio.play().then(() => setPlaying(true)).catch(() => {})
  }
  const pause = () => { audioRef.current?.pause(); setPlaying(false) }
  const toggle = () => (playing ? pause() : play())
  const next = () => setIndex(i => (i + 1) % tracks.length)
  const prev = () => setIndex(i => (i - 1 + tracks.length) % tracks.length)
  const seek = (p: number) => {
    const a = audioRef.current
    if (!a || !a.duration) return
    a.currentTime = p * a.duration
    setProgress(p)
  }

  // Cím másolása
  const handleCopyTitle = useCallback(async () => {
    const text = tracks[index]?.title || ''
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true); setTimeout(() => setCopied(false), 1200)
    } catch {
      try {
        const el = document.createElement('textarea')
        el.value = text; el.readOnly = true
        el.style.position = 'absolute'; el.style.left = '-9999px'
        document.body.appendChild(el); el.select()
        document.execCommand('copy'); document.body.removeChild(el)
        setCopied(true); setTimeout(() => setCopied(false), 1200)
      } catch {}
    }
  }, [tracks, index])

  const handleOpenPlatform = useCallback((platform: Platform) => {
    const t = tracks[index]; if (!t?.title) return
    const q = encodeURIComponent(t.title)
    const url =
      platform === 'youtube' ? `https://www.youtube.com/results?search_query=${q}` :
      platform === 'spotify' ? `https://open.spotify.com/search/${q}` :
      platform === 'google' ? `https://www.google.com/search?q=${q}` : ''
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }, [tracks, index])

  const track = tracks[index]
  const apiUrl = `/api/audio/${track.file.split('/').map(encodeURIComponent).join('/')}`
  const toggleTools = () => setShowTools(v => !v)

  return (
    <div className="min-w-max mx-auto space-y-6">
      <div className="p-5 md:p-6 bg-transparent border border-zinc-800 rounded-3xl">
        {/* Fejléc + vezérlők */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={handleCopyTitle}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), handleCopyTitle())}
              className="group inline-flex max-w-full items-center gap-2 text-left"
              aria-label="Cím másolása"
              title={copied ? 'Másolva!' : 'Kattints a másoláshoz'}
            >
              <span className="truncate text-zinc-100 font-medium text-sm md:text-base leading-snug group-hover:underline">
                {track.title}
              </span>
            </button>
            <div className="mt-1 text-[11px] text-zinc-500">{index + 1} / {tracks.length}</div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button onClick={toggle} className="h-9 px-5 rounded-full border border-neutral-300 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 text-sm font-semibold flex items-center justify-center transition-colors" aria-label={playing ? 'Szünet' : 'Lejátszás'}>
              {playing ? 'Szünet' : 'Lejátszás'}
            </button>
          </div>
        </div>

        {/* Idővonal */}
        <div className="space-y-1.5 mb-4">
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.floor(progress * 1000)}
            onChange={(e) => seek(Number(e.target.value) / 1000)}
            className="player-range bg-neutral-200"
            aria-label="Idővonal"
          />
          <div className="flex justify-between text-[11px] text-zinc-500">
            <span className="text-neutral-400">{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Megosztás panel */}
        <div className="mt-3">
          <button
            type="button"
            onClick={toggleTools}
            aria-expanded={showTools}
            aria-controls="player2-tools"
            className="group flex items-center gap-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/70 group-hover:bg-zinc-800 text-zinc-300 text-sm">…</span>
            <span className="uppercase tracking-[0.18em]">megosztás</span>
          </button>
          <div
            id="player2-tools"
            className={`transition-all duration-300 ease-out overflow-hidden ${showTools ? 'max-h-40 mt-3' : 'max-h-0'}`}
          >
            <div className="px-1">
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                <a href={`${apiUrl}?download=1`} className="px-3 py-1.5 rounded-full text-[11px] border border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-200">⬇ MP3 Letöltés</a>
                <span className="text-[10px] text-zinc-500">külső platform:</span>
                <button onClick={() => handleOpenPlatform('youtube')} className="px-3 py-1.5 rounded-full text-[10px] border border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-red-200">YouTube</button>
                <button onClick={() => handleOpenPlatform('spotify')} className="px-3 py-1.5 rounded-full text-[10px] border border-emerald-500/60 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200">Spotify</button>
                <button onClick={() => handleOpenPlatform('google')} className="px-3 py-1.5 rounded-full text-[10px] border border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-zinc-100">Google</button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500 leading-relaxed">
                Tipp: a címre kattintva kimásolhatod a track nevét.
              </p>
            </div>
          </div>
        </div>

        <audio ref={audioRef} preload="none" className="hidden" />
      </div>
      
      <style>{`
        .player-range {
          width:100%;
          background:transparent;
        }
        .player-range:focus { outline:none; }
        .player-range::-webkit-slider-runnable-track {
          height:1px;
          background:linear-gradient(90deg,#111,#222);
          border-radius:0.5px;
        }
        .player-range::-webkit-slider-thumb {
          -webkit-appearance:none;
          width:14px; height:14px;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:50%;
          margin-top:-5px;
          transition:.15s;
        }
        .player-range:hover::-webkit-slider-thumb {
          background:#ffffff;
        }
        .player-range::-moz-range-track {
          height:1px;
          background:linear-gradient(90deg,#111,#222);
          border-radius:0.5px;
        }
        .player-range::-moz-range-thumb {
          width:14px; height:14px;
          background:#ffffff;
          border:1px solid #e5e7eb;
          border-radius:50%;
          transition:.15s;
        }
        .player-range:hover::-moz-range-thumb { background:#ffffff; }
      `}</style>
    </div>
  )
}

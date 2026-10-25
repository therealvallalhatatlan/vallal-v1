'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface VideoIntroProps {
  src: string
  posterSrc?: string
  title: string
  onContinue: () => void
}

export function VideoIntro({ src, posterSrc, title, onContinue }: VideoIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mutedFallback, setMutedFallback] = useState(false)
  const [manualStartRequired, setManualStartRequired] = useState(false)
  const [canContinue, setCanContinue] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [audioMessage, setAudioMessage] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false

    async function startWithFallback() {
      try {
        video.muted = false
        video.volume = 1
        await video.play()
        if (cancelled) return
        setMutedFallback(false)
        setManualStartRequired(false)
        setAudioMessage(null)
      } catch {
        if (cancelled) return

        // Browsers commonly block autoplay with sound. Muted autoplay is the next-best path.
        try {
          video.muted = true
          await video.play()
          if (cancelled) return
          setMutedFallback(true)
          setManualStartRequired(false)
          setAudioMessage(null)
        } catch {
          if (cancelled) return
          setManualStartRequired(true)
        }
      }
    }

    void startWithFallback()

    return () => {
      cancelled = true
      video.pause()
    }
  }, [src])

  const handleEnded = useCallback(() => {
    setCanContinue(true)

    const video = videoRef.current
    if (!video || videoFailed) return

    // Do not use the native loop attribute: we need the first "ended" event to reveal Continue.
    video.currentTime = 0
    void video.play().then(() => {
      setManualStartRequired(false)
    }).catch(() => {
      setManualStartRequired(true)
    })
  }, [videoFailed])

  const handleVideoError = useCallback(() => {
    setVideoFailed(true)
    setCanContinue(true)
    setManualStartRequired(false)
  }, [])

  const startManually = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    setAudioMessage(null)
    try {
      video.muted = false
      video.volume = 1
      await video.play()
      setMutedFallback(false)
      setManualStartRequired(false)
    } catch {
      try {
        video.muted = true
        await video.play()
        setMutedFallback(true)
        setManualStartRequired(false)
        setAudioMessage('A böngésző csak némítva engedte elindítani a videót.')
      } catch {
        setManualStartRequired(true)
        setAudioMessage('A videó nem indítható el. Továbbra is megnyithatod a szöveget.')
      }
    }
  }, [])

  const enableSound = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    video.muted = false
    video.volume = 1
    try {
      await video.play()
      setMutedFallback(false)
      setAudioMessage(null)
    } catch {
      video.muted = true
      setMutedFallback(true)
      setAudioMessage('A hang indítását a böngésző blokkolta. Próbáld újra a gombbal.')
    }
  }, [])

  return (
    <main
      aria-label={`Videós nyitány: ${title}`}
      className="fixed inset-0 z-[100] h-[100dvh] min-h-[100svh] overflow-hidden bg-black text-white"
    >
      <video
        ref={videoRef}
        src={src}
        poster={posterSrc}
        preload="auto"
        playsInline
        aria-label={`Bevezető videó: ${title}`}
        onEnded={handleEnded}
        onError={handleVideoError}
        className="absolute inset-0 h-full w-full bg-black object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

      {mutedFallback && !videoFailed && (
        <div className="absolute right-4 top-4 z-10 pt-[env(safe-area-inset-top)] sm:right-6 sm:top-6">
          <button
            type="button"
            onClick={enableSound}
            className="min-h-11 border border-white/30 bg-black/65 px-4 py-2 text-xs tracking-wide text-white/90 backdrop-blur-sm transition hover:border-white/60 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Hang bekapcsolása
          </button>
        </div>
      )}

      {(manualStartRequired || videoFailed) && (
        <div className="absolute inset-x-4 top-1/2 z-10 mx-auto max-w-sm -translate-y-1/2 border border-white/20 bg-black/80 p-5 text-center backdrop-blur-sm sm:p-6">
          <p className="text-sm leading-relaxed text-white/80">
            {videoFailed
              ? 'A bevezető videó most nem érhető el.'
              : 'A böngésző nem indította el automatikusan a videót.'}
          </p>
          {manualStartRequired && !videoFailed && (
            <button
              type="button"
              onClick={startManually}
              className="mt-4 min-h-11 border border-white/35 px-4 py-2 text-sm text-white transition hover:border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Videó indítása
            </button>
          )}
          {audioMessage && (
            <p role="status" className="mt-3 text-xs leading-relaxed text-white/55">
              {audioMessage}
            </p>
          )}
        </div>
      )}

      {canContinue && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onContinue}
            className="min-h-12 min-w-36 border border-white/65 bg-black/65 px-7 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition hover:border-white hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {videoFailed ? 'Tovább a szöveghez' : 'Tovább'}
          </button>
        </div>
      )}
    </main>
  )
}

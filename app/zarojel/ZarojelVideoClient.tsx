'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

function SpeakerIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 4 7 8H3v8h4l5 4V4zm6.5 8a4.5 4.5 0 0 0-2.25-3.9l-1.1 1.8A2.4 2.4 0 0 1 16.1 12a2.4 2.4 0 0 1-.95 1.9l1.1 1.8A4.5 4.5 0 0 0 18.5 12zm2.5 0a7 7 0 0 0-3.5-6.06l-1.07 1.75A5 5 0 0 1 20 12a5 5 0 0 1-2.57 4.31l1.07 1.75A7 7 0 0 0 21 12z"
      />
      <path
        fill="currentColor"
        d="m21 5.41-1.41-1.41L3 20.59 4.41 22 21 5.41z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 4 7 8H3v8h4l5 4V4zm6.5 8a4.5 4.5 0 0 0-2.25-3.9l-1.1 1.8A2.4 2.4 0 0 1 16.1 12a2.4 2.4 0 0 1-.95 1.9l1.1 1.8A4.5 4.5 0 0 0 18.5 12zm2.5 0a7 7 0 0 0-3.5-6.06l-1.07 1.75A5 5 0 0 1 20 12a5 5 0 0 1-2.57 4.31l1.07 1.75A7 7 0 0 0 21 12z"
      />
    </svg>
  )
}

export default function ZarojelVideoClient() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [showConfirmLayer, setShowConfirmLayer] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  const playMutedVideo = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      video.muted = true
      await video.play()
    } catch {
      setVideoFailed(true)
    }
  }, [])

  useEffect(() => {
    void playMutedVideo()

    const onVisibilityChange = () => {
      const video = videoRef.current
      if (!video) return
      if (document.hidden) {
        video.pause()
        return
      }
      void playMutedVideo()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [playMutedVideo])

  const toggleAudio = useCallback(async () => {
    const video = videoRef.current
    if (!video) return

    try {
      if (audioEnabled) {
        video.muted = true
        setAudioEnabled(false)
        return
      }

      video.muted = false
      video.volume = 1
      await video.play()
      setAudioEnabled(true)
    } catch {
      video.muted = true
      setAudioEnabled(false)
    }
  }, [audioEnabled])

  const enableAudio = useCallback(async () => {
    const video = videoRef.current
    if (!video || audioEnabled) return

    try {
      video.muted = false
      video.volume = 1
      await video.play()
      setAudioEnabled(true)
    } catch {
      video.muted = true
      setAudioEnabled(false)
    }
  }, [audioEnabled])

  const handleNoClick = useCallback(async () => {
    await enableAudio()
    setShowConfirmLayer(true)
  }, [enableAudio])

  const handleConfirmDismiss = useCallback(() => {
    setShowConfirmLayer(false)
  }, [])

  const continueToHalozat = useCallback(() => {
    router.push('/halozat')
  }, [router])

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-black text-lime-200">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/videos/zarojel.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setVideoFailed(true)}
        aria-hidden="true"
      />

      <div className="absolute inset-0" />
      <div className="zr-scanlines absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="zr-rgb zr-rgb-a absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="zr-rgb zr-rgb-b absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-between px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] sm:px-6">
        <div className="flex items-start justify-end">
          <div className="zr-shell w-full rounded-md px-3 py-2 ">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-lime-200 sm:text-[12px]">
              <span className="min-w-0 flex-1 whitespace-normal text-left leading-tight text-lime-100">
                Zene: Arlequin (Szegedi Zárójel Levente)
              </span>
              <button
                type="button"
                onClick={toggleAudio}
                className="zr-icon-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-lime-300/60 bg-black/55 text-lime-200 transition active:scale-95"
                aria-label={audioEnabled ? 'Hang kikapcsolása' : 'Hang bekapcsolása'}
                aria-pressed={audioEnabled}
              >
                <SpeakerIcon muted={!audioEnabled} />
              </button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none flex flex-1 items-end justify-center">
          <div className="w-full max-w-4xl px-0 sm:px-2">
            <div className="zr-shell pointer-events-auto rounded-t-2xl border border-lime-300/0 bg-black/0 px-4 py-4 sm:px-6 sm:py-5">
              <div className="mx-auto max-w-3xl text-center font-[family-name:var(--font-terminal)] uppercase tracking-[0.14em] text-lime-100">
                <p className="zr-glitch text-[clamp(1.7rem,4.2vw,3.5rem)] leading-[0.88]" data-text="A kapcsolat létrejött.">
                  A kapcsolat létrejött.
                </p>
                <p className="zr-glitch mt-2 text-[clamp(1.15rem,2.9vw,2.2rem)] leading-[0.9] text-lime-200" data-text="Kíván továbblépni?">
                  Kíván továbblépni?
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={continueToHalozat}
                  className="zr-choice zr-choice-yes col-span-2 h-14 rounded-md border border-lime-300/80 bg-lime-300/80 px-5 font-[family-name:var(--font-terminal)] text-[1.55rem] uppercase tracking-[0.16em] text-black shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_24px_rgba(191,255,0,0.45)] transition active:translate-y-[1px] sm:h-16"
                >
                  Igen
                </button>
                <button
                  type="button"
                  onClick={handleNoClick}
                  className="zr-choice zr-choice-no col-span-1 h-14 rounded-md border border-lime-300/45 bg-black/75 px-5 font-[family-name:var(--font-terminal)] text-[1.55rem] uppercase tracking-[0.16em] text-lime-100 shadow-[0_0_0_1px_rgba(191,255,0,0.18),0_0_24px_rgba(191,255,0,0.18)] transition active:translate-y-[1px] sm:h-16"
                >
                  Nem
                </button>
              </div>
            </div>
          </div>
        </div>

        {showConfirmLayer ? (
          <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/45 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
            <div className="zr-shell w-full max-w-4xl rounded-2xl border border-lime-300/55 bg-black/78 px-4 py-4 shadow-[0_0_50px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:px-6 sm:py-5">
              <p className="zr-glitch text-center font-[family-name:var(--font-terminal)] text-[clamp(1.3rem,3vw,2.2rem)] uppercase tracking-[0.14em] text-lime-100" data-text="Akkor hallgasd még kicsit a zenét. Biztos nem?">
                Akkor hallgasd még kicsit a zenét. Biztos nem?
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={continueToHalozat}
                  className="zr-choice zr-choice-yes h-14 rounded-md border border-lime-300/80 bg-lime-300 px-5 font-[family-name:var(--font-terminal)] text-[1.5rem] uppercase tracking-[0.16em] text-black shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_24px_rgba(191,255,0,0.45)] transition active:translate-y-[1px] sm:h-16"
                >
                  Igen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDismiss}
                  className="zr-choice h-14 rounded-md border border-lime-300/45 bg-black/75 px-5 font-[family-name:var(--font-terminal)] text-[1.5rem] uppercase tracking-[0.16em] text-lime-100 shadow-[0_0_0_1px_rgba(191,255,0,0.18),0_0_24px_rgba(191,255,0,0.18)] transition active:translate-y-[1px] sm:h-16"
                >
                  Mégsem
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {videoFailed ? (
          <div className="pointer-events-none fixed left-4 top-4 z-20 rounded border border-lime-300/0 bg-black/ px-3 py-2 font-[family-name:var(--font-terminal)] text-[0px] uppercase tracking-[0.16em] text-lime-100 sm:left-6 sm:top-6">
            Videó betöltése bizonytalan.
          </div>
        ) : null}
      </div>


    </main>
  )
}
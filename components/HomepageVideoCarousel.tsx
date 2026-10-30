"use client"

import { useEffect, useRef, useState, type TouchEvent, type WheelEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react"
import { createClient } from "@/lib/browser"

type HomepageVideo = {
  id: string
  title: string
  description: string | null
  video_url: string
  poster_url: string | null
}

const FALLBACK_VIDEO: HomepageVideo = {
  id: "homepage-intro",
  title: "NYITÓFILM",
  description: null,
  video_url: "/videos/dd2.mp4",
  poster_url: null,
}

export default function HomepageVideoCarousel() {
  const [videos, setVideos] = useState<HomepageVideo[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const touchStartX = useRef<number | null>(null)
  const lastWheelAt = useRef(0)

  useEffect(() => {
    let cancelled = false

    async function loadVideos() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("homepage_videos")
          .select("id, title, description, video_url, poster_url")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
          .order("published_at", { ascending: false })
          .limit(30)

        if (error) throw error

        const published = Array.isArray(data)
          ? (data as HomepageVideo[]).filter(
              (video) =>
                typeof video?.id === "string" &&
                typeof video?.video_url === "string" &&
                video.video_url.length > 0,
            )
          : []

        if (!cancelled) setVideos(published.length > 0 ? published : [FALLBACK_VIDEO])
      } catch (error) {
        console.error("[homepage-video-carousel] videók betöltése nem sikerült", error)
        if (!cancelled) setVideos([FALLBACK_VIDEO])
      }
    }

    void loadVideos()
    return () => {
      cancelled = true
    }
  }, [])

  const activeVideo = videos[activeIndex] ?? null

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = muted
    video.loop = true

    if (isPlaying) {
      void video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [activeIndex, isPlaying, muted, videos])

  function startPlayback() {
    const video = videoRef.current
    if (!video) return

    // A valódi felhasználói kattintásból indítjuk, így a böngésző engedélyezi a hangos lejátszást.
    video.muted = false
    video.loop = true
    setMuted(false)

    void video.play()
      .then(() => setIsPlaying(true))
      .catch((error) => {
        console.error("[homepage-video-carousel] videó indítása nem sikerült", error)
        setIsPlaying(false)
      })
  }

  function goTo(index: number) {
    if (videos.length < 2) return
    const nextIndex = (index + videos.length) % videos.length
    setActiveIndex(nextIndex)
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null

    if (Math.abs(delta) < 48) return
    goTo(activeIndex + (delta < 0 ? 1 : -1))
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaX) < 28 || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return
    const now = Date.now()
    if (now - lastWheelAt.current < 550) return
    lastWheelAt.current = now
    goTo(activeIndex + (event.deltaX > 0 ? 1 : -1))
  }

  if (!activeVideo) {
    return (
      <section
        aria-label="Videóarchívum"
        className="relative left-1/2 aspect-video w-screen -translate-x-1/2 bg-black"
      />
    )
  }

  return (
    <section aria-label="Videóarchívum" className="w-full bg-black">
      <div
        className="group relative left-1/2 aspect-video w-screen -translate-x-1/2 overflow-hidden bg-black rounded-lg"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault()
            goTo(activeIndex + 1)
          } else if (event.key === "ArrowLeft") {
            event.preventDefault()
            goTo(activeIndex - 1)
          } else if (event.key === " " || event.key === "Enter") {
            event.preventDefault()
            if (isPlaying) {
              setIsPlaying(false)
            } else {
              startPlayback()
            }
          }
        }}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label="Vállalhatatlan videók"
      >
        <video
          key={activeVideo.id}
          ref={videoRef}
          src={activeVideo.video_url}
          poster={activeVideo.poster_url ?? undefined}
          aria-label={activeVideo.title}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          controls={false}
          onClick={() => {
            if (isPlaying) setIsPlaying(false)
          }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={startPlayback}
            aria-label="Videó lejátszása hanggal"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/15 text-white transition hover:bg-black/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/75 bg-black/55 shadow-[0_0_45px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-transform hover:scale-105 sm:h-24 sm:w-24">
              <Play aria-hidden="true" className="ml-1 h-9 w-9 fill-current sm:h-11 sm:w-11" />
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-white drop-shadow">
              LEJÁTSZÁS
            </span>
          </button>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/55 to-transparent opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
      </div>

      <div className="pb-6 border-b border-zinc-900 bg-black/75">
        <div className="grid min-h-12 grid-cols-1 items-center gap-2 px-4 py-0">

          <div className="flex items-center justify-between gap-2" aria-label="Videónavigáció">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              disabled={videos.length < 2}
              aria-label="Előző videó"
              className="flex h-10 w-10 rounded-sm items-center justify-center  border border-zinc-800 text-white/80 transition hover:border-zinc-700 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:text-white/25"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>

            <div className="flex min-w-0 items-center justify-center gap-1.5" aria-label="Videóválasztó">
              {videos.map((video, index) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ugrás a(z) ${index + 1}. videóra`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all ${index === activeIndex ? "w-5 bg-white" : "w-1.5 bg-zinc-600 hover:bg-zinc-300"}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              disabled={videos.length < 2}
              aria-label="Következő videó"
              className="flex h-10 w-10 rounded-sm items-center justify-center  border border-zinc-800 text-white/80 transition hover:border-zinc-700 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-white/[0.07] disabled:text-white/25"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

        </div>

        <div className="ml-auto max-w-3xl px-5 pb-8 pt-4 sm:px-8 sm:pb-7">
          <p
            className="text-center text-[21px] italic uppercase tracking-[0.22em] text-zinc-500"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {activeVideo.title}
          </p>
          {activeVideo.description?.trim() ? (
            <p
              className="px-6 mt-3 whitespace-pre-wrap break-words text-left text-[19px] italic leading-[1.3] text-zinc-300]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              "{activeVideo.description}" <span className="text-[12px]">(...)</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

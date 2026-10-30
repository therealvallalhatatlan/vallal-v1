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
  video_url: string
  poster_url: string | null
}

const FALLBACK_VIDEO: HomepageVideo = {
  id: "homepage-intro",
  title: "NYITÓFILM",
  video_url: "/videos/dd2.mp4",
  poster_url: null,
}

export default function HomepageVideoCarousel() {
  const [videos, setVideos] = useState<HomepageVideo[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  const [isPlaying, setIsPlaying] = useState(true)
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
          .select("id, title, video_url, poster_url")
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
    if (video) video.muted = muted
  }, [muted, activeVideo?.id])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      void video.play().catch(() => setIsPlaying(false))
    } else {
      video.pause()
    }
  }, [activeIndex, isPlaying, videos])

  function goTo(index: number) {
    if (videos.length < 2) return
    const nextIndex = (index + videos.length) % videos.length
    setActiveIndex(nextIndex)
    setIsPlaying(true)
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
    <section aria-label="Videóarchívum" className="w-full">
      <div
        className="group relative left-1/2 aspect-video w-screen -translate-x-1/2 overflow-hidden bg-black"
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
            setIsPlaying((current) => !current)
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
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
          controls={false}
          onClick={() => setIsPlaying((current) => !current)}
          onEnded={() => setIsPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
        />

        <button
          type="button"
          onClick={() => goTo(activeIndex - 1)}
          disabled={videos.length < 2}
          aria-label="Előző videó"
          className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/75 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/35 sm:left-4 sm:h-11 sm:w-11"
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(activeIndex + 1)}
          disabled={videos.length < 2}
          aria-label="Következő videó"
          className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/75 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/35 sm:right-4 sm:h-11 sm:w-11"
        >
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/55 to-transparent opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-3 pb-3 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => setIsPlaying((current) => !current)}
            aria-label={isPlaying ? "Videó szüneteltetése" : "Videó lejátszása"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Play aria-hidden="true" className="h-4 w-4" />
            )}
          </button>

          <span
            className="text-[9px] tabular-nums tracking-[0.18em] text-white/75"
            aria-live="polite"
            aria-atomic="true"
          >
            {String(activeIndex + 1).padStart(2, "0")} / {String(videos.length).padStart(2, "0")}
          </span>

          <button
            type="button"
            onClick={() => setMuted((current) => !current)}
            aria-label={muted ? "Hang bekapcsolása" : "Hang némítása"}
            aria-pressed={!muted}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white/85 backdrop-blur-sm transition hover:bg-black/65 hover:text-white"
          >
            {muted ? (
              <VolumeX aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Volume2 aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex min-h-9 items-center justify-between gap-3 border-b border-white/10 bg-black/70 px-3 py-2 text-[8px] uppercase tracking-[0.2em] text-zinc-500 sm:px-4">
        <span className="shrink-0 text-zinc-400">VIDEÓARCHÍVUM</span>
        {videos.length > 1 ? (
          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="hidden text-zinc-500 min-[390px]:inline">HÚZD / LAPOZZ</span>
            <div className="flex items-center gap-1.5" aria-label="Videóválasztó">
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
          </div>
        ) : (
          <span className="text-right text-zinc-500">TOVÁBBI FELVÉTELEK HAMAROSAN</span>
        )}
      </div>
    </section>
  )
}

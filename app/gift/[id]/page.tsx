"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

const VIDEOS = ["/videos/video1.mp4", "/videos/video2.mp4"]
const REVEAL_LETTERS = ["c", "i", "c", "i"]

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const swapDoneRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const { id: giftId } = useParams<{ id: string }>()

  const formattedGiftId = giftId
    ? giftId
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : ""

  useEffect(() => {
    if (isRevealed && !swapDoneRef.current) {
      swapDoneRef.current = true
      setCurrentVideoIndex((idx) => (idx + 1) % VIDEOS.length)
    }
  }, [isRevealed])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const source = VIDEOS[currentVideoIndex % VIDEOS.length]
    if (video.getAttribute("data-src") === source) {
      if (video.paused) video.play().catch(() => undefined)
      return
    }

    const handleCanPlay = () => {
      video.play().catch(() => undefined)
      video.removeEventListener("canplay", handleCanPlay)
    }

    video.setAttribute("data-src", source)
    video.src = source
    video.addEventListener("canplay", handleCanPlay)
    video.load()

    return () => {
      video.removeEventListener("canplay", handleCanPlay)
    }
  }, [currentVideoIndex])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    canvas.width = 400 * dpr
    canvas.height = 400 * dpr
    ctx.scale(dpr, dpr)

    // Draw scratch overlay
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, 400, 400)

    // Add texture
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`
      ctx.fillRect(Math.random() * 400, Math.random() * 400, 2, 2)
    }

    // Handle scratch/reveal
    const revealPixels = () => {
      const imageData = ctx.getImageData(0, 0, 400, 400)
      const data = imageData.data
      let transparentPixels = 0

      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 128) {
          transparentPixels++
        }
      }

      const percentage = (transparentPixels / (data.length / 4)) * 100
      if (percentage > 85 && !isRevealed) {
        setIsRevealed(true)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      setIsDrawing(true)
    }

    const handleMouseUp = () => {
      setIsDrawing(false)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing && e.buttons !== 1) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Erase with circular brush
      ctx.clearRect(x - 25, y - 25, 50, 50)
      revealPixels()
    }

    const handleTouchStart = () => {
      setIsDrawing(true)
    }

    const handleTouchEnd = () => {
      setIsDrawing(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDrawing) return

      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      // Erase with circular brush
      ctx.clearRect(x - 25, y - 25, 50, 50)
      revealPixels()
    }

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchend", handleTouchEnd)
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchend", handleTouchEnd)
      canvas.removeEventListener("touchmove", handleTouchMove)
    }
  }, [isDrawing, isRevealed])

  return (
    <div className="min-h-screen relative overflow-hidden">

      
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEOS[currentVideoIndex]}
      />

      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex md:border-8 md:border-black rounded-bl-2xl items-center justify-center p-4">

        <div className="flex flex-col items-center gap-8">
          {/* Header */}
          <div className="text-start md:text-center mt-0 md:mt-16">
            {giftId && (
              <h1 className="text-5xl md:text-6xl text-neutral-200/80 tracking-wide">
                Kedves <span className="font-semibold text-white">{formattedGiftId}!</span>
              </h1>
            )}

            <div className="text-start relative text-2xl text-neutral-100 max-w-md mx-auto bg-white/0 md:py-12 rounded-lg border border-lime-400/0">
              Valaki annyira szeret téged, hogy meglepett a <span className="text-lime-400 font-bold">Vállalhatatlan <br/>Karácsonyi Különkiadásával!<br/></span>
            </div>

            <p className="text-neutral-300 text-sm max-w-md mx-auto">
              {isRevealed
                ? "És a jelszó nem más mint:"
                : "Kapard le ezt a szürke szart a digitális hozzáféréshez szükséges jelszóért."}
            </p>
          </div>

          {/* Scratch card + instructions */}
          <div className="relative w-full max-w-md rounded-3xl bg-black/0 shadow-[0_25px_60px_rgba(15,23,42,0.35)] px-6 py-6 space-y-6">


            <div className="relative">
              <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className="cursor-pointer rounded-lg shadow-2xl max-w-full border border-neutral-500/40"
                style={{ touchAction: "none" }}
              />
              {isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-transparent animate-in fade-in duration-500">
                  <div className="text-center">
                    <p className="text-9xl font-bold text-white drop-shadow-lg reveal-text">
                      {REVEAL_LETTERS.map((char, idx) => (
                        <span
                          key={`${char}-${idx}`}
                          className="reveal-letter"
                          style={{
                            animationDelay: `${idx * 0.2}s`,
                            ["--blur-delay" as const]: `${idx * 0.2 + 0.25}s`,
                          } as React.CSSProperties}
                          data-char={char}
                        >
                          {char}
                        </span>
                      ))}
                    </p>
                    < br/>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(REVEAL_LETTERS.join(""))
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1500)
                        } catch {
                          setCopied(false)
                        }
                      }}
                      className="mt-4 text-sm text-white/80 underline underline-offset-4 hover:text-white transition-colors"
                    >
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isRevealed && (
            <Link
              href="/reader"
              className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors animate-in fade-in"
            >
              Tovább az alkalmazáshoz
            </Link>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInBlur {
          0% {
            opacity: 0;
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            filter: blur(0px);
          }
        }
        @keyframes letterReveal {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          60% {
            opacity: 1;
            transform: translateY(-6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes letterBlur {
          0% {
            opacity: 0.7;
            filter: blur(18px);
            transform: translateY(10px) scale(1.1);
          }
          100% {
            opacity: 0;
            filter: blur(28px);
            transform: translateY(0) scale(1.05);
          }
        }
        .reveal-text {
          display: inline-flex;
          gap: 0.15em;
        }
        .reveal-letter {
          display: inline-block;
          opacity: 0;
          animation: letterReveal 0.45s ease forwards;
          position: relative;
        }
        .reveal-letter::after {
          content: attr(data-char);
          position: absolute;
          inset: 0;
          opacity: 0;
          animation: letterBlur 0.6s ease forwards;
          animation-delay: var(--blur-delay, 0.35s);
          pointer-events: none;
          color: inherit;
        }
      `}</style>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

const VIDEO_SRC = "/videos/video3.mp4"
const ACCESS_KEY = "Karácsonyi meglepetés Aktiválva"

export default function GiftPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [copied, setCopied] = useState(false)

  const params = useParams<{ id: string }>()
  const name = params?.id
    ? params.id
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    : null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const size = 220
    const dpr = window.devicePixelRatio || 1

    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, size, size)

    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
    }

    const revealCheck = () => {
      const imageData = ctx.getImageData(0, 0, size, size).data
      let cleared = 0
      for (let i = 3; i < imageData.length; i += 4) {
        if (imageData[i] < 100) cleared++
      }
      const percent = (cleared / (imageData.length / 4)) * 100
      if (percent > 65 && !revealed) setRevealed(true)
    }

    const erase = (x: number, y: number) => {
      ctx.clearRect(x - 18, y - 18, 36, 36)
      revealCheck()
    }

    const getPos = (e: any) => {
      const rect = canvas.getBoundingClientRect()
      if ("touches" in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const start = () => setIsDrawing(true)
    const end = () => setIsDrawing(false)
    const move = (e: any) => {
      if (!isDrawing) return
      const { x, y } = getPos(e)
      erase(x, y)
    }

    canvas.addEventListener("mousedown", start)
    canvas.addEventListener("mouseup", end)
    canvas.addEventListener("mousemove", move)
    canvas.addEventListener("touchstart", start)
    canvas.addEventListener("touchend", end)
    canvas.addEventListener("touchmove", move, { passive: false })

    return () => {
      canvas.removeEventListener("mousedown", start)
      canvas.removeEventListener("mouseup", end)
      canvas.removeEventListener("mousemove", move)
      canvas.removeEventListener("touchstart", start)
      canvas.removeEventListener("touchend", end)
      canvas.removeEventListener("touchmove", move)
    }
  }, [isDrawing, revealed])

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* VIDEO */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_SRC}
      />

      {/* DARKEN */}
      <div className="absolute inset-0 bg-black/60" />

      {/* CONTENT */}
      <div className="relative z-10 flex min-h-screen flex-col justify-end items-center px-4 pb-10 text-center gap-6">
        <div className="max-w-xs text-lg text-neutral-300">
          {name && <p className="mb-2 glitch-text">Kedves {name},</p>}
          <p>ez az oldal neked készült.</p>
          <p className="opacity-40">kapard le ezt a szürke szart.</p>
        </div>

        {/* SCRATCH */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-md border border-white/20"
            style={{ touchAction: "none" }}
          />
          {revealed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-md">
              <p className="text-xs tracking-widest text-neutral-400 mb-2">
                ACCESS KEY
              </p>
              <p className="text-xl font-semibold">{ACCESS_KEY}</p>
              <button
                className="mt-3 text-xs underline text-neutral-300"
                onClick={async () => {
                  await navigator.clipboard.writeText(ACCESS_KEY)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1200)
                }}
              >
                {copied ? "" : ""}
              </button>
            </div>
          )}
        </div>

        {/* CTA */}
        {revealed && (
          <Link
            href="/reader"
            className="mt-4 px-6 py-3 bg-white text-black rounded-md font-medium"
          >
            Tovább a Vallalhatatlan Appra
          </Link>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Download, Facebook, MessageCircle, Send, Share2, Video } from "lucide-react"

const SHARE_URL = "https://www.vallalhatatlan.online/faszan-levadasztad"
const SHARE_TEXT = "Faszán levadásztad! Tudsz róla? A nyúlhálózat működik."

type Props = {
  compact?: boolean
}

type Particle = {
  x: number
  y: number
  size: number
  speed: number
  phase: number
  color: string
}

const PARTICLES: Particle[] = Array.from({ length: 48 }, (_, i) => ({
  x: ((i * 83 + 37) % 492) + 24,
  y: ((i * 137 + 53) % 900) - 40,
  size: 3 + (i % 4),
  speed: 42 + (i % 7) * 11,
  phase: i * 1.37,
  color: ["#d9f99d", "#a3e635", "#fafafa", "#facc15", "#67e8f9", "#f0abfc"][i % 6],
}))

function drawRabbit(ctx: CanvasRenderingContext2D, cx: number, cy: number, time: number) {
  const sway = Math.sin(time * 1.4) * 4
  ctx.save()
  ctx.fillStyle = "#d8dece"
  ctx.strokeStyle = "#efffdc"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.ellipse(cx - 27 + sway, cy - 82, 17, 69, -0.12, 0, Math.PI * 2)
  ctx.ellipse(cx + 16 + sway, cy - 85, 18, 72, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#74845f"
  ctx.beginPath()
  ctx.ellipse(cx - 27 + sway, cy - 82, 7, 51, -0.12, 0, Math.PI * 2)
  ctx.ellipse(cx + 16 + sway, cy - 85, 7, 53, 0.1, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = "#d8dece"
  ctx.beginPath()
  ctx.ellipse(cx, cy + 1, 60, 67, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#11150d"
  const blink = Math.floor(time * 2.5) % 17 === 0 ? 3 : 0
  ctx.beginPath()
  ctx.moveTo(cx - 40, cy - 9)
  ctx.lineTo(cx - 8, cy + 1 + blink)
  ctx.lineTo(cx - 40, cy + 8)
  ctx.closePath()
  ctx.moveTo(cx + 9, cy + 1 + blink)
  ctx.lineTo(cx + 40, cy - 9)
  ctx.lineTo(cx + 40, cy + 8)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "#282e22"
  ctx.beginPath()
  ctx.moveTo(cx - 5, cy + 17)
  ctx.lineTo(cx + 5, cy + 17)
  ctx.lineTo(cx, cy + 23)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = "#6f7c65"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy + 28, 28, 0.2, Math.PI - 0.2)
  ctx.stroke()

  ctx.fillStyle = "#f1f4e9"
  ctx.strokeStyle = "#c6d1bb"
  ctx.beginPath()
  ctx.moveTo(cx - 38, cy + 64)
  ctx.lineTo(cx + 38, cy + 64)
  ctx.lineTo(cx + 63, cy + 101)
  ctx.lineTo(cx - 63, cy + 101)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = "#8aa16e"
  ctx.beginPath()
  ctx.moveTo(cx, cy + 73)
  ctx.lineTo(cx, cy + 99)
  ctx.stroke()
  ctx.restore()
}

function paintFrame(ctx: CanvasRenderingContext2D, time: number) {
  const w = 540
  const h = 960
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = "#030504"
  ctx.fillRect(0, 0, w, h)

  const glow = ctx.createRadialGradient(w / 2, 405, 35, w / 2, 405, 430)
  glow.addColorStop(0, "rgba(32, 68, 17, 0.75)")
  glow.addColorStop(1, "rgba(3, 5, 4, 0)")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = "rgba(104, 159, 54, 0.12)"
  ctx.lineWidth = 1
  for (let x = 24; x < w - 20; x += 24) {
    ctx.beginPath()
    ctx.moveTo(x, 30)
    ctx.lineTo(x, h - 30)
    ctx.stroke()
  }
  for (let y = 30; y < h - 20; y += 24) {
    ctx.beginPath()
    ctx.moveTo(24, y)
    ctx.lineTo(w - 24, y)
    ctx.stroke()
  }

  ctx.strokeStyle = "#395a24"
  ctx.lineWidth = 2
  ctx.strokeRect(19, 19, w - 38, h - 38)
  ctx.strokeStyle = "#b6ff6b"
  ctx.strokeRect(19, 19, 24, 24)
  ctx.strokeRect(w - 43, 19, 24, 24)
  ctx.strokeRect(19, h - 43, 24, 24)
  ctx.strokeRect(w - 43, h - 43, 24, 24)

  ctx.font = "11px monospace"
  ctx.fillStyle = "#b9ef79"
  ctx.textAlign = "left"
  ctx.fillText("V. / HÁLÓZAT", 35, 43)
  ctx.textAlign = "right"
  ctx.fillStyle = "#719b50"
  ctx.fillText("REC ● 00:06", w - 35, 43)
  ctx.strokeStyle = "#42682b"
  ctx.beginPath()
  ctx.moveTo(35, 63)
  ctx.lineTo(w - 35, 63)
  ctx.stroke()

  drawRabbit(ctx, w / 2, 286 + Math.sin(time * 1.8) * 3, time)

  const reveal = Math.max(0, Math.min(1, (time - 0.55) * 2.2))
  ctx.globalAlpha = reveal
  ctx.textAlign = "center"
  ctx.font = "bold 63px 'Arial Narrow', Arial, sans-serif"
  ctx.fillStyle = time % 1.5 < 0.12 ? "#f0abfc" : "#eaffd1"
  ctx.fillText("FASZÁN", w / 2, 516, 490)
  ctx.font = "bold 48px 'Arial Narrow', Arial, sans-serif"
  ctx.fillStyle = time % 1.3 < 0.1 ? "#67e8f9" : "#d9f99d"
  ctx.fillText("LEVADÁSZTAD!", w / 2, 583, 500)
  ctx.font = "bold 16px Arial, sans-serif"
  ctx.fillStyle = "#f4f4f5"
  ctx.fillText("ÜGYES VAGY, TUDSZ RÓLA?", w / 2, 655)
  ctx.globalAlpha = 1

  if (time > 0.8) {
    for (const bit of PARTICLES) {
      const y = ((bit.y + time * bit.speed * 3) % 850) + 45
      const x = bit.x + Math.sin(time * 1.7 + bit.phase) * 15
      ctx.fillStyle = bit.color
      ctx.fillRect(x, y, bit.size, bit.size * 1.8)
    }
  }

  const scanY = (time * 170) % h
  ctx.fillStyle = "rgba(177, 255, 102, 0.35)"
  ctx.fillRect(24, scanY, w - 48, 2)

  ctx.strokeStyle = "#42682b"
  ctx.beginPath()
  ctx.moveTo(35, h - 124)
  ctx.lineTo(w - 35, h - 124)
  ctx.stroke()
  ctx.font = "10px monospace"
  ctx.fillStyle = "#a3e635"
  ctx.textAlign = "center"
  ctx.fillText("ZSÁKMÁNY BIZTOSÍTVA", w / 2, h - 98)
  ctx.font = "13px monospace"
  ctx.fillStyle = "#f4f4f5"
  ctx.fillText("VALLALHATATLAN.ONLINE", w / 2, h - 72)

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
  for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 1)
}

function downloadBlob(blob: Blob, name: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = objectUrl
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
}

export default function FaszanLevadasztadShare({ compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const videoFileRef = useRef<File | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [status, setStatus] = useState("A videó automatikusan összeáll, ez pár másodperc.")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    let cancelled = false
    let frameId = 0
    let recorder: MediaRecorder | null = null
    let stream: MediaStream | null = null
    const startedAt = performance.now()

    const render = () => {
      paintFrame(ctx, (performance.now() - startedAt) / 1000)
      frameId = requestAnimationFrame(render)
    }
    render()

    const prepare = async () => {
      if (!("MediaRecorder" in window) || typeof canvas.captureStream !== "function") {
        setStatus("A böngészőben a videó készítése nem támogatott. A megosztólink és a kép továbbra is használható.")
        return
      }

      const supportedTypes = [
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ]
      const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type))
      stream = canvas.captureStream(18)

      try {
        recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 1800000 } : undefined)
        recorderRef.current = recorder
      } catch {
        stream.getTracks().forEach((track) => track.stop())
        setStatus("A videó összeállítása ebben a böngészőben nem támogatott.")
        return
      }

      const chunks: BlobPart[] = []
      const stopped = new Promise<Blob>((resolve, reject) => {
        if (!recorder) return reject(new Error("recorder_missing"))
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onerror = () => reject(new Error("recording_failed"))
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder?.mimeType || mimeType || "video/webm" }))
      })

      recorder.start(250)
      await new Promise((resolve) => window.setTimeout(resolve, 6100))
      if (cancelled) {
        if (recorder.state !== "inactive") recorder.stop()
        return
      }
      if (recorder.state !== "inactive") recorder.stop()

      try {
        const blob = await stopped
        if (cancelled || blob.size === 0) return
        const isMp4 = blob.type.includes("mp4")
        const file = new File([blob], isMp4 ? "faszan-levadasztad.mp4" : "faszan-levadasztad.webm", { type: blob.type })
        videoFileRef.current = file
        setVideoUrl(URL.createObjectURL(blob))
        setVideoReady(true)
        setStatus(isMp4
          ? "A megosztható MP4 elkészült."
          : "A videó elkészült WebM formátumban. Ha valamelyik platform nem fogadja el, oszd meg a linket.")
      } catch {
        if (!cancelled) setStatus("A videó elkészítése nem sikerült. A linket és a képet ettől még megoszthatod.")
      } finally {
        stream?.getTracks().forEach((track) => track.stop())
      }
    }

    void prepare()
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop()
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
  }, [videoUrl])

  const shareLink = async () => {
    const shareData = { title: "Faszán levadásztad!", text: SHARE_TEXT, url: SHARE_URL }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share(shareData)
        setStatus("A megosztóablak megnyílt.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(SHARE_URL)
      setCopied(true)
      setStatus("A megosztási link a vágólapra került.")
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setStatus("Másold ki ezt a linket: " + SHARE_URL)
    }
  }

  const shareVideo = async () => {
    const file = videoFileRef.current
    if (!file) {
      setStatus("A videó még készül. Egy pillanat és megosztható.")
      return
    }

    if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Faszán levadásztad!", text: SHARE_TEXT })
        setStatus("A videót átadtuk a megosztómenünek.")
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    downloadBlob(file, file.name)
    setStatus("A videó letöltése elindult. Innen feltöltheted Storyba vagy elküldheted üzenetben.")
  }

  const downloadVideo = () => {
    const file = videoFileRef.current
    if (!file) {
      setStatus("A videó még készül. Pár másodperc múlva próbáld újra.")
      return
    }
    downloadBlob(file, file.name)
    setStatus("A videó letöltése elindult.")
  }

  const downloadImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("A kép exportálása nem sikerült.")
        return
      }
      downloadBlob(blob, "faszan-levadasztad.png")
      setStatus("A Storyhoz használható kép letöltése elindult.")
    }, "image/png")
  }

  const buttonClass = "inline-flex min-h-10 items-center justify-center gap-2 border border-zinc-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-100 transition-colors hover:border-lime-300/80 hover:bg-lime-300/10 hover:text-lime-100 disabled:cursor-wait disabled:opacity-50"
  const socialHref = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(SHARE_URL)
  const whatsappHref = "https://wa.me/?text=" + encodeURIComponent(SHARE_TEXT + " " + SHARE_URL)
  const telegramHref = "https://t.me/share/url?url=" + encodeURIComponent(SHARE_URL) + "&text=" + encodeURIComponent(SHARE_TEXT)

  const actionButtons = (
    <>
      <button type="button" onClick={() => void shareVideo()} disabled={!videoReady} className={buttonClass}>
        <Video aria-hidden="true" className="h-4 w-4" />
        {videoReady ? "Videó megosztása" : "Videó készül…"}
      </button>
      <button type="button" onClick={() => void shareLink()} className={buttonClass}>
        {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Share2 aria-hidden="true" className="h-4 w-4" />}
        Link megosztása
      </button>
      <button type="button" onClick={downloadImage} className={buttonClass}>
        <Download aria-hidden="true" className="h-4 w-4" />
        Kép letöltése
      </button>
      {videoReady ? (
        <button type="button" onClick={downloadVideo} className={buttonClass}>
          <Download aria-hidden="true" className="h-4 w-4" />
          Videó letöltése
        </button>
      ) : null}
      <a href={socialHref} target="_blank" rel="noreferrer" className={buttonClass}>
        <Facebook aria-hidden="true" className="h-4 w-4" />
        Facebook
      </a>
      <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClass}>
        <MessageCircle aria-hidden="true" className="h-4 w-4" />
        WhatsApp
      </a>
      <a href={telegramHref} target="_blank" rel="noreferrer" className={buttonClass}>
        <Send aria-hidden="true" className="h-4 w-4" />
        Telegram
      </a>
    </>
  )

  if (compact) {
    return (
      <div className="mt-6 border-t border-zinc-900 pt-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-lime-200/80" style={{ fontFamily: "var(--font-mono-tech)" }}>
          VIDD TOVÁBB A VADÁSZAT HÍRÉT
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full max-w-[118px] shrink-0 overflow-hidden border border-zinc-800 bg-black">
            {videoUrl ? (
              <video src={videoUrl} muted autoPlay loop playsInline className="aspect-[9/16] w-full object-cover" />
            ) : (
              <canvas ref={canvasRef} width={540} height={960} className="aspect-[9/16] w-full object-cover" />
            )}
          </div>
          <div className="flex flex-1 flex-wrap content-start gap-2">
            {actionButtons}
            <p className="w-full text-[11px] leading-5 text-zinc-500" aria-live="polite">{status}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(220px,0.8fr)_1.2fr] md:items-start">
      <div className="mx-auto w-full max-w-[280px] overflow-hidden border border-lime-300/30 bg-black shadow-[0_0_50px_rgba(132,204,22,0.08)]">
        {videoUrl ? (
          <video src={videoUrl} controls autoPlay loop playsInline className="aspect-[9/16] w-full object-cover" />
        ) : (
          <canvas ref={canvasRef} width={540} height={960} className="aspect-[9/16] w-full" />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-6 text-zinc-400">Készíts belőle saját megosztható videót, vagy küldd tovább a linket. A link előnézetében egy külön, fekvő borítókép jelenik meg, a videó pedig a megosztóoldalon is lejátszható.</p>
        <div className="flex flex-wrap gap-2">{actionButtons}</div>
        <p className="text-xs leading-5 text-zinc-500" aria-live="polite">{status}</p>
        <div className="border-t border-zinc-800 pt-4">
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Megosztható link</p>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all text-xs text-lime-100">{SHARE_URL}</p>
            <button type="button" onClick={() => void shareLink()} aria-label="Link másolása" title="Link másolása" className={buttonClass}>
              <Copy aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

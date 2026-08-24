"use client"

import { useEffect, useMemo, useState } from "react"

const PRESET_QUESTIONS = [
  "MI A FASZ EZ?",
  "HOGYAN SZEREZHETEM MEG A KÖNYVET?",
  "MI AZ A DEAD DROP?",
  "MI EZ A HÁLÓZAT?",
  "KI VAGY TE?",
]

type Message = {
  role: "user" | "assistant"
  content: string
}

const BASE_FETCH_OPTIONS = { method: "POST", headers: { "Content-Type": "application/json" } }

const clampLength = (text: string, max = 480) =>
  text.length <= max ? text : `${text.slice(0, max - 3)}...`

const HUNGARIAN_DAY_NAMES = [
  "VASÁRNAP",
  "HÉTFŐ",
  "KEDD",
  "SZERDA",
  "CSÜTÖRTÖK",
  "PÉNTEK",
  "SZOMBAT",
]

export default function VHeroChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(() => new Date())

  const sendMessage = async (override?: string) => {
    const text = (override ?? draft).trim()
    if (!text || loading) return

    const prepared = clampLength(text)
    const nextMessages: Message[] = [...messages, { role: "user", content: prepared }]
    setMessages(nextMessages)
    setDraft("")
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(
        "/api/hero-chat",
        {
          ...BASE_FETCH_OPTIONS,
          body: JSON.stringify({
            message: prepared,
            history: nextMessages,
          }),
        },
      )

      if (!res.ok) {
        throw new Error("Választ nem kaptam")
      }

      const payload = (await res.json()) as { message?: string; error?: string }
      if (payload.error) {
        throw new Error(payload.error)
      }

      if (payload.message) {
        setMessages((current) => [...current, { role: "assistant", content: payload.message }])
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Hiba történt")
      setMessages((current) => [...current, { role: "assistant", content: "Erről nincs nálam infó." }])
    } finally {
      setLoading(false)
    }
  }

  const holderText = useMemo(() => (loading ? "Várj..." : "Kérdezz"), [loading])

  useEffect(() => {
    const tick = () => setCurrentDate(new Date())
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="mx-auto w-full mt-4 bg-black/60  text-white">
      <div className="border-b border-t border-zinc-800 pt-4 pb-4">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          <div className="flex items-center gap-3">
            <img
              src="/img/visuals/noise-11.jpg"
              alt="recepciós"
              className="h-8 w-8 rounded-full border border-zinc-700 object-cover"
            />
            <div className="space-y-0.5 text-xs">
              <p className="text-[12px] uppercase tracking-[0.3em] text-zinc-400">MAI RECEPCIÓS:</p>
              <p
                className="font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                ISU
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="text-[12px] uppercase tracking-[0.3em] text-zinc-400">
              {HUNGARIAN_DAY_NAMES[currentDate.getDay()]}
            </p>
            <p className="font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80">
              {currentDate.toLocaleTimeString("hu-HU", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`text-sm leading-relaxed ${
              message.role === "assistant" ? "text-white" : "text-lime-200"
            }`}
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span className="font-bold uppercase tracking-[0.25em] text-[10px] text-lime-200">
              {message.role === "assistant" ? "V." : "TE"}
            </span>
            <p className="mt-1 break-words text-[14px] text-zinc-200">{message.content}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/5 p-3 text-[11px] text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-lime-100" style={{ display: "none" }}>
        {PRESET_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            className="px-3 py-2 font-mono text-sm font-medium uppercase leading-[1.85] tracking-wide text-lime-100/80 transition hover:border-lime-400 hover:text-lime-200"
            onClick={() => sendMessage(question)}
            disabled={loading}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <input
          className="flex-1 rounded-full border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-sm text-white outline-none focus:border-lime-400"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={holderText}
          disabled={loading}
          style={{ fontFamily: "var(--font-mono-tech)" }}
        />
        <button
          className="rounded-full border-2 border-lime-100/80 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-lime-200 transition hover:border-lime-200 hover:text-white disabled:opacity-40"
          onClick={() => sendMessage()}
          disabled={loading}
        >
          {loading ? "Küldés..." : "→"}
        </button>
      </div>
    </section>
  )
}
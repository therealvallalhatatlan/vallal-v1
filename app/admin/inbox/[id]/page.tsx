"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard"

interface Props {
  params: { id: string }
}

type Message = {
  id: string
  sender_role: "user" | "admin"
  body: string
  created_at: string
}

export default function AdminInboxThread({ params }: Props) {
  const conversationId = params.id
  const { session, loading } = useSessionGuard()
  const token = (session as any)?.access_token
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token])

  const fetchMessages = async () => {
    if (!headers) return
    const res = await fetch(`/api/inbox/messages?conversationId=${conversationId}`, { headers })
    if (!res.ok) {
      setStatus("Hiba az üzenetek betöltésekor vagy nincs jogosultság.")
      return
    }
    const json = await res.json()
    setMessages(json.messages || [])
  }

  useEffect(() => {
    if (!headers) return
    fetchMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers, conversationId])

  const handleSend = async () => {
    if (!headers || !input.trim()) return
    setSending(true)
    const res = await fetch("/api/inbox/messages", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, body: input }),
    })
    setSending(false)
    if (!res.ok) {
      setStatus("Üzenetküldés nem sikerült.")
      return
    }
    setInput("")
    fetchMessages()
  }

  if (loading) return <div className="p-6">Betöltés…</div>
  if (!session) return <div className="p-6">Admin bejelentkezés szükséges.</div>

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Beszélgetés</h1>
        <Link href="/admin/inbox" className="text-sm text-blue-600 hover:underline">
          Vissza a listához
        </Link>
      </div>

      <div className="rounded border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
          <span>ID: {conversationId}</span>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={fetchMessages}
          >
            Frissítés
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-gray-500">Nincsenek üzenetek ebben a beszélgetésben.</div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`rounded px-3 py-2 text-sm ${msg.sender_role === "admin" ? "bg-blue-50" : "bg-gray-100"}`}>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
                <span>{msg.sender_role === "admin" ? "Admin" : "Felhasználó"}</span>
                <span>{new Date(msg.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-gray-800">{msg.body}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 p-4 space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder="Válasz az ügyfélnek…"
            className="w-full rounded border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
            <span>{input.length}/2000</span>
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-gray-400"
            >
              Küldés
            </button>
          </div>
        </div>
      </div>

      {status && <div className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">{status}</div>}
    </div>
  )
}

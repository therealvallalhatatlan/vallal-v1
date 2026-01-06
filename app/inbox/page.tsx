"use client"

import { useEffect, useMemo, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard"

type Session = {
  access_token: string
}

type Conversation = {
  id: string
  last_message_at?: string | null
  last_admin_read_at?: string | null
  last_user_read_at?: string | null
}

type Message = {
  id: string
  sender_role: "user" | "admin"
  body: string
  created_at: string
}

export default function InboxPage() {
  const { session, loading } = useSessionGuard() as { session: Session | null; loading: boolean }
  const token = session?.access_token
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const conversationId = conversation?.id

  const headers = useMemo(() => {
    if (!token) return undefined
    return { Authorization: `Bearer ${token}` }
  }, [token])

  const fetchConversation = async () => {
    if (!headers) return
    setBusy(true)
    setStatus(null)
    const res = await fetch("/api/inbox", { headers })
    if (!res.ok) {
      setStatus("Nem sikerült betölteni a beszélgetést.")
      setBusy(false)
      return
    }
    const json = await res.json()
    if (json?.conversation) {
      setConversation(json.conversation)
    } else {
      // create if missing
      const createRes = await fetch("/api/inbox", { method: "POST", headers })
      if (createRes.ok) {
        const data = await createRes.json()
        setConversation({ id: data.conversationId })
      }
    }
    setBusy(false)
  }

  const fetchMessages = async () => {
    if (!headers || !conversationId) return
    const res = await fetch(`/api/inbox/messages?conversationId=${conversationId}`, { headers })
    if (!res.ok) {
      setStatus("Nem sikerült betölteni az üzeneteket.")
      return
    }
    const json = await res.json()
    setMessages(json.messages || [])
  }

  useEffect(() => {
    if (!token) return
    fetchConversation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (!conversationId || !headers) return
    fetchMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, headers])

  const handleSend = async () => {
    if (!input.trim() || !headers) return
    setSending(true)
    setStatus(null)
    const res = await fetch("/api/inbox/messages", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ body: input, conversationId }),
    })
    setSending(false)
    if (!res.ok) {
      setStatus("Üzenetküldés nem sikerült.")
      return
    }
    setInput("")
    await fetchConversation()
    await fetchMessages()
  }

  if (loading) return <div className="p-6">Betöltés…</div>
  if (!session) return <div className="p-6">Kérjük jelentkezz be az üzenetek megtekintéséhez.</div>

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Üzenetek az adminnal</h1>

      {status && <div className="rounded bg-amber-100 px-3 py-2 text-sm text-amber-900">{status}</div>}

      <div className="rounded border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-2 text-sm text-gray-600 flex items-center justify-between">
          <span>Beszélgetés</span>
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => {
              fetchConversation()
              fetchMessages()
            }}
            disabled={busy}
          >
            Frissítés
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-sm text-gray-500">Még nincsenek üzenetek. Írj az adminnak lent.</div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`rounded px-3 py-2 text-sm ${msg.sender_role === "user" ? "bg-blue-50" : "bg-gray-100"}`}>
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-500">
                <span>{msg.sender_role === "user" ? "Te" : "Admin"}</span>
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
            placeholder="Írd ide az üzeneted…"
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
    </div>
  )
}

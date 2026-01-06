"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSessionGuard } from "@/hooks/useSessionGuard"

type Conversation = {
  id: string
  user_id: string
  last_message_at: string
  last_admin_read_at?: string | null
  last_user_read_at?: string | null
}

export default function AdminInboxPage() {
  const { session, loading } = useSessionGuard()
  const token = (session as any)?.access_token
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [status, setStatus] = useState<string | null>(null)

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token])

  useEffect(() => {
    if (!headers) return
    const load = async () => {
      setStatus(null)
      const res = await fetch("/api/admin/inbox", { headers })
      if (!res.ok) {
        setStatus("Nincs jogosultság vagy hiba történt.")
        return
      }
      const json = await res.json()
      setConversations(json.conversations || [])
    }
    load()
  }, [headers])

  if (loading) return <div className="p-6">Betöltés…</div>
  if (!session) return <div className="p-6">Jelentkezz be adminként az inboxhoz.</div>

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Inbox</h1>
        <Link href="/admin" className="text-sm text-blue-600 hover:underline">
          Vissza az adminhoz
        </Link>
      </div>

      {status && <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{status}</div>}

      <div className="divide-y divide-gray-200 rounded border border-gray-200 bg-white shadow-sm">
        {conversations.length === 0 && <div className="p-4 text-sm text-gray-600">Nincs beszélgetés.</div>}
        {conversations.map((c) => {
          const unread = !c.last_admin_read_at || new Date(c.last_message_at) > new Date(c.last_admin_read_at)
          return (
            <Link
              key={c.id}
              href={`/admin/inbox/${c.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
            >
              <div>
                <div className="font-medium">Felhasználó: {c.user_id}</div>
                <div className="text-sm text-gray-500">Utolsó üzenet: {new Date(c.last_message_at).toLocaleString()}</div>
              </div>
              {unread && <span className="rounded-full bg-blue-600 px-2 py-1 text-xs text-white">Új</span>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

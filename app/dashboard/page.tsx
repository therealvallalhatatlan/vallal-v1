"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import UserAccountDashboard from "@/components/dashboard/UserAccountDashboard"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import { buildAuthHref } from "@/lib/authRedirect"
import type { DashboardAccountResponse } from "@/types/dashboard"

type SessionGuardResult = {
  session: { access_token?: string } | null
  loading: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const { session, loading } = useSessionGuard() as SessionGuardResult
  const [data, setData] = useState<DashboardAccountResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = useMemo(() => session?.access_token ?? null, [session])

  useEffect(() => {
    if (loading) return

    if (!session) {
      router.replace(buildAuthHref("/dashboard"))
      return
    }

    if (!token) {
      setError("Érvénytelen hitelesítés.")
      return
    }

    const controller = new AbortController()
    setError(null)

    fetch("/api/user/account", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text().catch(() => "")
          throw new Error(message || `HTTP ${response.status}`)
        }
        return response.json() as Promise<{ ok: boolean; account?: DashboardAccountResponse; error?: string }>
      })
      .then((payload) => {
        if (!payload?.ok || !payload.account) {
          throw new Error(payload?.error || "Nem sikerült betölteni a fiókot.")
        }
        setData(payload.account)
      })
      .catch((err) => {
        if (err?.name === "AbortError") return
        console.error("[dashboard] account fetch error", err)
        setError("Nem sikerült betölteni a fiókodat.")
      })

    return () => controller.abort()
  }, [loading, router, session, token])

  if (loading || (!data && !error)) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-center text-zinc-200">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">FIÓK BETÖLTÉSE</p>
        <p className="mt-3 text-sm text-zinc-400">Kapcsolódás a Vállalhatatlan adatbázishoz…</p>
      </main>
    )
  }

  if (!session) return null

  if (error || !data) {
    return (
      <main className="min-h-screen bg-black px-6 py-20 text-center text-zinc-200">
        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">VALAMI ELBASZÓDOTT</p>
        <p className="mt-3 text-xl text-zinc-100">{error ?? "Nem sikerült betölteni a fiókot."}</p>
      </main>
    )
  }

  return <UserAccountDashboard account={data} token={token} />
}

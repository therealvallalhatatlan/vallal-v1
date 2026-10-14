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
    const steps = [
      {
        code: "AUTH",
        label: "Munkamenet ellenőrzése",
        state: loading ? "RUN" : "OK",
      },
      {
        code: "API",
        label: "Fiókadatok lekérése",
        state: loading ? "WAIT" : "RUN",
      },
      {
        code: "UI",
        label: "Személyes felület inicializálása",
        state: "WAIT",
      },
    ] as const

    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-black px-5 py-12 text-lime-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(163,230,53,0.09),transparent_58%)]"
        />
        <section
          role="status"
          aria-live="polite"
          className="relative w-full max-w-xl border border-lime-300/25 bg-black/85 p-5 font-mono shadow-[0_0_80px_rgba(163,230,53,0.07)] sm:p-7"
        >
          <div className="flex items-center justify-between gap-4 border-b border-lime-300/20 pb-4 text-[10px] uppercase tracking-[0.2em] text-lime-100/55 sm:text-xs">
            <span>V/ ACCESS TERMINAL</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" />
              SECURE LINK
            </span>
          </div>

          <div className="py-7">
            <p className="text-[10px] uppercase tracking-[0.28em] text-lime-300/55">
              SYSTEM BOOT // 01
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-lime-100 sm:text-3xl">
              Hozzáférés előkészítése
            </h1>
            <p className="mt-3 text-xs leading-6 text-lime-100/65 sm:text-sm">
              <span className="mr-2 text-lime-300">&gt;</span>
              {loading
                ? "AUTH: a munkamenet ellenőrzése folyamatban"
                : "API: a fiókadatok szinkronizálása folyamatban"}
              <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-lime-300" aria-hidden="true" />
            </p>
          </div>

          <div className="space-y-4 border-y border-lime-300/15 py-5">
            {steps.map((step) => {
              const active = step.state === "RUN"
              const complete = step.state === "OK"

              return (
                <div key={step.code} className="flex items-start gap-3 text-xs sm:text-sm">
                  <span
                    className={
                      "w-12 shrink-0 font-bold " +
                      (complete
                        ? "text-lime-300"
                        : active
                          ? "text-lime-100"
                          : "text-lime-100/25")
                    }
                  >
                    [{step.state}]
                  </span>
                  <span className={complete ? "text-lime-300/60" : active ? "text-lime-100" : "text-lime-100/30"}>
                    <span className="mr-2 text-lime-300/45">{step.code}://</span>
                    {step.label}
                    {active ? <span className="ml-1 animate-pulse">...</span> : null}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-lime-100/35 sm:text-[10px]">
            <span>VÁLLALHATATLAN NETWORK</span>
            <span>{loading ? "PHASE 01/03" : "PHASE 02/03"}</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden bg-lime-100/10">
            <div
              className={
                "h-full bg-lime-300 transition-all duration-500 " +
                (loading ? "w-1/3" : "w-2/3")
              }
            />
          </div>
        </section>
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

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Mail, ArrowUpRight, LoaderCircle } from "lucide-react"
import Reviews from "@/components/Reviews"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
import MainContent from "@/components/MainContent"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import type { HomepageBlock, HomepagePlan } from "@/lib/homepage-ai/types"
import Fooldal4HuntingMap from "@/components/Fooldal4HuntingMap"

type SessionShape = {
  access_token?: string
  user?: {
    user_metadata?: {
      avatar_url?: string | null
      picture?: string | null
    } | null
  } | null
}

function OrderStatusBlockView({
  block,
  token,
  onReceived,
}: {
  block: Extract<HomepageBlock, { type: "order_status" }>
  token: string | null
  onReceived: (orderId: string) => void
}) {
  const [receiving, setReceiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [source, rawId] = block.orderId.split(":")
  const sourceValue = source === "shop" ? "shop" : "book"
  const orderId = rawId ?? block.orderId

  const markReceived = async () => {
    if (!token || receiving) return

    setReceiving(true)
    setError(null)

    try {
      const response = await fetch("/api/user/orders/received", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          orderId,
          source: sourceValue,
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          payload?.error || "Az átvétel visszaigazolása nem sikerült.",
        )
      }

      onReceived(block.orderId)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Az átvétel visszaigazolása nem sikerült.",
      )
    } finally {
      setReceiving(false)
    }
  }

  return (
    <section className="border-b border-zinc-900 py-8 sm:py-12">
      <div className="border border-zinc-800 bg-[#050505] p-5 sm:p-6">
        <p
          className="text-[9px] uppercase tracking-[0.26em] text-lime-200/55"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          RENDELÉS / ÁLLAPOT
        </p>

        <h2
          className="mt-3 text-2xl uppercase leading-[0.98] tracking-tight text-zinc-100 sm:text-4xl"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {block.headline}
        </h2>

        <p
          className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {block.body}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border-2 border-lime-400/45 px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-lime-200/90 transition-colors hover:border-lime-300 hover:text-lime-100"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {block.cta || "RENDELÉSEM"}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => void markReceived()}
            disabled={!token || receiving}
            className="inline-flex items-center gap-2 border-2 border-zinc-700 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {receiving ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {receiving ? "FELDOLGOZÁS..." : "ÁT VETTEM"}
          </button>
        </div>

        {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      </div>
    </section>
  )
}


function TrustSection() {
  return (
    <section className="mt-4 py-12 sm:py-16" aria-label="Bízhatsz bennem">
      <div className="flex gap-6">
        
        <div className="w-[61.8%]">
          <p
            className="text-[23px] font-normal italic leading-tight tracking-tight text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Bízhatsz bennem,<br/>nyúl vagyok.
          </p>

          <p
            className="mt-4 text-sm leading-normal italic text-zinc-400"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ha kérdésed van{" "}
            <Link
              href="/kapcsolat"
              className="text-lime-100 underline underline-offset-4"
            >
              itt tudsz
            </Link>{" "}
            írni Vállalhatatlanak.
          </p>
        </div>

        <div className="mx-auto w-[38.2%] overflow-hidden rounded-full bg-black sm:mx-0 sm:w-36 sm:justify-self-end">
          <video
            className="block w-full"
            src="/420.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            preload="metadata"
          />
        </div>
      </div>
    </section>
  )
}


function getSessionId() {
  try {
    const key = "vh_homepage_session_v1"
    const existing = sessionStorage.getItem(key)
    if (existing) return existing

    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()) + "-" + Math.random().toString(36).slice(2)

    sessionStorage.setItem(key, created)
    return created
  } catch {
    return null
  }
}


function GuestHome() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const source = params.get("utm_source")
      const campaign = params.get("utm_campaign")
      const referrer = document.referrer
      if (source || campaign || referrer) {
        sessionStorage.setItem("vh_homepage_entry_v1", JSON.stringify({ source, campaign, referrer, capturedAt: Date.now() }))
      }
    } catch {
      // A forrásmérés nem akadályozhatja a vendégoldal működését.
    }
  }, [])

  return (
    <>
      <SiteHeader />
      <div className="mx-auto w-full pb-28 pt-0 sm:pb-32">
        <section className="w-full">
          <video className="relative left-1/2 block aspect-video w-screen -translate-x-1/2 object-cover" src="/videos/dd2.mp4" autoPlay muted loop playsInline controls={false} preload="metadata" />
        </section>
        <section className="mx-auto mt-12 w-full max-w-5xl px-5 sm:mt-16 sm:px-8">
          <div className="ml-auto max-w-3xl">
            <p className="text-right text-[21px] italic leading-[1.7] text-zinc-300 sm:text-[23px]" style={{ fontFamily: "var(--font-mono-tech)" }}>
              "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."
            </p>
            <p className="mt-5 text-right text-[21px] italic tracking-wide text-zinc-500">— Író Úr</p>
            <div className="mt-10">
              <p className="text-right text-[11px] uppercase tracking-[0.08em] text-zinc-500">Ez egy privát, zártkörű klub. Jelentkezz be.</p>
              <div className="mt-5 flex flex-row gap-7 sm:justify-end">
                <Link href="/auth?from=%2Ffooldal-4&next=%2Ffooldal-4" className="outline-4 outline-offset-2 outline-lime-100/10 inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-md border-2 border-lime-400/45 bg-lime-400/[0.035] px-4 py-3 text-[17px] font-semibold tracking-[0.04em] text-lime-200 transition-all hover:border-lime-300 hover:bg-lime-400/[0.08] hover:text-white sm:min-w-40 sm:flex-none sm:text-[12px]">
                  <Mail aria-hidden="true" className="h-6 w-6 shrink-0 text-lime-200 sm:h-5 sm:w-5" />Email
                </Link>
                <Link href="/auth?from=%2Ffooldal-4&next=%2Ffooldal-4&provider=google" className="outline-4 outline-offset-2 outline-zinc-100/10 inline-flex min-h-14 flex-1 items-center justify-center gap-3 rounded-md border-2 border-zinc-400 bg-black px-4 py-3 text-[17px] font-semibold tracking-[0.04em] text-zinc-300 transition-all hover:border-zinc-100/60 hover:bg-zinc-900 hover:text-lime-100 sm:min-w-48 sm:flex-none">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current text-zinc-200 sm:h-5 sm:w-5"><path d="M21.35 11.1h-9.18v2.98h5.62c-.24 1.56-1.84 4.58-5.62 4.58-3.38 0-6.14-2.8-6.14-6.26s2.76-6.26 6.14-6.26c1.92 0 3.21.82 3.95 1.53l2.14-2.08C16.88 4.3 14.96 3.3 12.17 3.3 7.36 3.3 3.45 7.2 3.45 12s3.91 8.7 8.72 8.7c5.04 0 8.39-3.54 8.39-8.52 0-.57-.06-.99-.13-1.08z" /></svg>
                  Google
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto mt-8 w-full max-w-5xl px-5 sm:mt-10 sm:px-8"><Reviews /></section>
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8"><TrustSection /></div>
      </div>
      <Footer />
    </>
  )
}

function MemberGreeting({ token }: { token: string }) {
  const [greeting, setGreeting] = useState("")
  const [loadingGreeting, setLoadingGreeting] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const url = new URL("/api/homepage/personalize", window.location.origin)
        const params = new URLSearchParams(window.location.search)
        if (params.get("utm_source")) url.searchParams.set("utm_source", params.get("utm_source")!)
        if (params.get("utm_campaign")) url.searchParams.set("utm_campaign", params.get("utm_campaign")!)
        url.searchParams.set("hour", String(new Date().getHours()))
        let referrerHost: string | null = null
        try { referrerHost = document.referrer ? new URL(document.referrer).host : null } catch { referrerHost = null }
        let sessionId: string | null = null
        try {
          sessionId = getSessionId()
          const stored = sessionStorage.getItem("vh_homepage_entry_v1")
          if (stored) {
            const entry = JSON.parse(stored) as { source?: unknown; campaign?: unknown; referrer?: unknown; capturedAt?: unknown }
            const capturedAt = Number(entry.capturedAt ?? 0)
            if (capturedAt > 0 && Date.now() - capturedAt < 24 * 60 * 60 * 1000) {
              if (typeof entry.source === "string" && !url.searchParams.get("utm_source")) url.searchParams.set("utm_source", entry.source)
              if (typeof entry.campaign === "string" && !url.searchParams.get("utm_campaign")) url.searchParams.set("utm_campaign", entry.campaign)
              if (!referrerHost && typeof entry.referrer === "string") {
                try { referrerHost = entry.referrer ? new URL(entry.referrer).host : null } catch { referrerHost = null }
              }
            }
          }
        } catch { /* Opcionális kampánymérés. */ }
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({
            sessionId,
            isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ""),
            isInAppBrowser: /FBAN|FBAV|Instagram|Line\b|TikTok|Twitter|WhatsApp|Snapchat|Pinterest|LinkedInApp|wv\b|WebView/i.test(navigator.userAgent || ""),
            referrerHost,
          }),
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("homepage_failed")
        const payload = await response.json() as { ok?: boolean; plan?: HomepagePlan }
        if (!payload.ok || !payload.plan) throw new Error("homepage_missing")
        setGreeting(payload.plan.greeting)
        try { sessionStorage.removeItem("vh_homepage_entry_v1") } catch { /* Opcionális tárolótakarítás. */ }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("[fooldal-4] személyes üdvözlés betöltése nem sikerült", error)
        setFailed(true)
      } finally { setLoadingGreeting(false) }
    }
    void load()
    return () => controller.abort()
  }, [token])

  const [typedGreeting, setTypedGreeting] = useState("")
  useEffect(() => {
    if (!greeting) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTypedGreeting(greeting); return }
    setTypedGreeting("")
    let index = 0
    let timeoutId: number | null = null
    const tick = () => {
      index += 1
      setTypedGreeting(greeting.slice(0, index))
      if (index < greeting.length) {
        const char = greeting[index - 1] ?? ""
        timeoutId = window.setTimeout(tick, char === " " ? 10 : /[.!?,:]/.test(char) ? 90 : 24)
      }
    }
    timeoutId = window.setTimeout(tick, 140)
    return () => { if (timeoutId !== null) window.clearTimeout(timeoutId) }
  }, [greeting])

  return (
    <section className="pt-10 pb-8 sm:pt-7" aria-label="Személyes üdvözlés">
      {loadingGreeting ? (
        <div
          role="status"
          aria-live="polite"
          className="max-w-3xl border border-lime-300/20 bg-black/75 p-4 font-mono shadow-[0_0_45px_rgba(163,230,53,0.05)] sm:p-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-lime-300/15 pb-3 text-[9px] uppercase tracking-[0.2em] text-lime-100/55 sm:text-[10px]">
            <span>V/ TERMINAL :: PERSONALIZE</span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" />
              LINK ACTIVE
            </span>
          </div>
          <div className="mt-4 space-y-2 text-[11px] leading-relaxed sm:text-xs">
            <p className="text-lime-100/75">
              <span className="mr-2 text-lime-300">$</span>
              session.verify <span className="ml-2 text-lime-300">[OK]</span>
            </p>
            <p className="text-lime-100/75">
              <span className="mr-2 text-lime-300">$</span>
              visitor-context.sync <span className="ml-2 animate-pulse text-lime-200">[RUNNING]</span>
            </p>
            <p className="text-lime-100/75">
              <span className="mr-2 text-lime-300">$</span>
              personal-greeting.fetch <span className="ml-2 text-lime-100/45">[WAIT]</span>
            </p>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[9px] uppercase tracking-[0.17em] text-lime-100/45 sm:text-[10px]">
            <span className="inline-block h-3 w-1.5 animate-pulse bg-lime-300" aria-hidden="true" />
            Személyes kezdőüzenet és belépési kontextus betöltése
          </p>
          <div className="mt-3 h-px overflow-hidden bg-lime-100/10">
            <div className="h-full w-2/3 animate-pulse bg-lime-300/80" />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl">
          <p className="text-[23px] font-normal italic leading-normal tracking-tighter text-zinc-300 sm:text-base" style={{ fontFamily: "var(--font-mono-tech)" }}>
            {failed ? "Szia. Most valami nem állt össze. Próbáld újra egy pillanat múlva." : typedGreeting}
            {!failed && <span aria-hidden="true" className="ml-1 inline-block h-[1em] w-px translate-y-[0.08em] bg-zinc-400 align-baseline animate-pulse" />}
          </p>
        </div>
      )}
    </section>
  )
}

function MemberHome({ session }: { session: SessionShape }) {
  const token = session?.access_token ?? ""
  const [plan, setPlan] = useState<HomepagePlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const url = new URL("/api/homepage/personalize", window.location.origin)
        const params = new URLSearchParams(window.location.search)
        if (params.get("utm_source")) url.searchParams.set("utm_source", params.get("utm_source")!)
        if (params.get("utm_campaign")) url.searchParams.set("utm_campaign", params.get("utm_campaign")!)
        url.searchParams.set("hour", String(new Date().getHours()))
        let referrerHost: string | null = null
        try { referrerHost = document.referrer ? new URL(document.referrer).host : null } catch { referrerHost = null }
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({
            sessionId: getSessionId(),
            isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ""),
            isInAppBrowser: /FBAN|FBAV|Instagram|Line\b|TikTok|Twitter|WhatsApp|Snapchat|Pinterest|LinkedInApp|wv\b|WebView/i.test(navigator.userAgent || ""),
            referrerHost,
          }),
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("homepage_failed")
        const payload = await response.json() as { ok?: boolean; plan?: HomepagePlan }
        if (!payload.ok || !payload.plan) throw new Error("homepage_missing")
        setPlan(payload.plan)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("[fooldal-4] aktív rendelések betöltése nem sikerült", error)
        setError(true)
      } finally { setLoadingPlan(false) }
    }
    void load()
    return () => controller.abort()
  }, [token])
  const usefulBlocks = plan?.blocks.filter((block) => block.type === "order_status") ?? []
  const handleReceived = (orderId: string) => setPlan(current => current ? {
    ...current,
    blocks: current.blocks.filter(block => block.type !== "order_status" || block.orderId !== orderId)
  } : current)
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-0 sm:px-8 sm:pb-32">
        <MemberGreeting token={token} />
        {!loadingPlan && !error && usefulBlocks.map(block => (
          <OrderStatusBlockView key={"order-" + block.orderId} block={block} token={token} onReceived={handleReceived} />
        ))}
        {!loadingPlan && !error && (
          <section className="border-b border-zinc-900 py-2">
            <Link href="/kapcsolat" className="inline-flex items-center gap-2 border-2 border-lime-400/45 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-lime-200/90 transition-colors hover:border-lime-300 hover:text-lime-100" style={{ fontFamily: "var(--font-mono-tech)" }}>
              ÜZENET V.-NEK <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        )}
        {!loadingPlan && !error && <Fooldal4HuntingMap />}
        <TrustSection />
      </main>
      <Footer />
    </>
  )
}

export default function Fooldal4() {
  const { session, loading } = useSessionGuard() as {
    session: SessionShape
    loading: boolean
  }
  return (
    <MainContent fullWidth>
      {!loading && !session ? <GuestHome /> : null}
      {!loading && session ? <MemberHome session={session} /> : null}
      {loading ? <SiteHeader /> : null}
    </MainContent>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Mail, ArrowUpRight, LoaderCircle, ClipboardList, MessageCircle } from "lucide-react"
import Reviews from "@/components/Reviews"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
import MainContent from "@/components/MainContent"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import type { HomepageBlock, HomepagePlan } from "@/lib/homepage-ai/types"
import Fooldal4HuntingMap from "@/components/Fooldal4HuntingMap"
import HomepageVideoCarousel from "@/components/HomepageVideoCarousel"
import FaszanLevadasztadShare from "@/components/FaszanLevadasztadShare"

type SessionShape = {
  access_token?: string
  user?: {
    user_metadata?: {
      avatar_url?: string | null
      picture?: string | null
    } | null
  } | null
}

function FullScreenLoader() {
  return (
    <div
      className="fixed inset-0 z-[60] flex min-h-[100dvh] w-screen items-center justify-center bg-[#030303]"
      role="status"
      aria-live="polite"
      aria-label="Betöltés"
    >
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle
          aria-hidden="true"
          className="h-7 w-7 animate-spin text-lime-200/90"
          strokeWidth={1.25}
        />
        <span
          className="text-[9px] uppercase tracking-[0.3em] text-zinc-600"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          BETÖLTÉS...
        </span>
      </div>
    </div>
  )
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
    <section className="animate-fadeIn border-b border-zinc-900 py-8 sm:py-12">
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
          {/folyamatban van/i.test(block.body) ? (
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 inline-block h-3.5 w-3.5 animate-spin align-[-2px] text-lime-200"
            />
          ) : null}
          {block.body}
        </p>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-zinc-900 pt-4">
          <button
            type="button"
            onClick={() => void markReceived()}
            disabled={!token || receiving}
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-lime-300/65 bg-lime-300/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200 transition-colors hover:border-lime-200 hover:bg-lime-300/[0.1] hover:text-lime-100 disabled:cursor-wait disabled:opacity-40"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {receiving ? (
              <LoaderCircle aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {receiving ? "FELDOLGOZÁS..." : "ÁTVETTEM"}
          </button>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              aria-label="Rendelések"
              title="Rendelések"
              className="inline-flex h-10 w-10 items-center justify-center border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-lime-100"
            >
              <ClipboardList aria-hidden="true" className="h-4 w-4" />
            </Link>

            <Link
              href="/kapcsolat"
              aria-label="Kérdésem van"
              title="Kérdésem van"
              className="inline-flex h-10 w-10 items-center justify-center border border-zinc-800 text-zinc-400 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-lime-100"
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      </div>
    </section>
  )
}


function OrderReceivedCelebration() {
  const confettiColors = ["#d9f99d", "#a3e635", "#fafafa", "#facc15", "#bef264", "#67e8f9", "#f0abfc"]

  return (
    <section
      className="relative isolate my-8 overflow-hidden border border-lime-300/50 bg-[#080b05] px-5 py-9 sm:px-8 sm:py-12"
      aria-live="polite"
      aria-label="Átvétel visszaigazolva"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 42 }, (_, index) => (
          <span
            key={index}
            className="order-confetti"
            style={{
              left: `${(index * 37) % 100}%`,
              animationDelay: `${(index % 14) * 0.12}s`,
              animationDuration: `${2.2 + (index % 6) * 0.18}s`,
              backgroundColor: confettiColors[index % confettiColors.length],
              width: `${5 + (index % 3) * 3}px`,
              height: `${8 + (index % 4) * 3}px`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-lime-200/70 bg-lime-300/10 text-lime-200 shadow-[0_0_48px_rgba(190,242,100,0.22)]">
          <span className="text-3xl" aria-hidden="true">✓</span>
        </div>
        <p
          className="text-[9px] uppercase tracking-[0.3em] text-lime-200/65"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          MŰVELET SIKERES / ZSÁKMÁNY BIZTOSÍTVA
        </p>
        <h2
          className="mt-4 text-3xl uppercase leading-[0.98] tracking-tight text-lime-100 sm:text-5xl"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          Faszán levadásztad!
        </h2>
        <p
          className="mt-4 text-base text-zinc-100 sm:text-lg"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          Ügyes vagy, tudsz róla?
        </p>
        <div className="mt-2 w-full max-w-4xl text-left">
          <FaszanLevadasztadShare compact />
        </div>
      </div>

      <style jsx>{`
        .order-confetti {
          position: absolute;
          top: -18px;
          border-radius: 1px;
          animation-name: order-confetti-fall;
          animation-timing-function: cubic-bezier(0.12, 0.75, 0.33, 1);
          animation-iteration-count: 1;
          animation-fill-mode: both;
        }

        @keyframes order-confetti-fall {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(540px) rotate(720deg); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .order-confetti { animation: none; display: none; }
        }
      `}</style>
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
        <section className="w-full animate-fadeIn">
          <HomepageVideoCarousel />
        </section>
        <section className="animate-fadeIn mx-auto mt-12 w-full max-w-5xl px-5 sm:mt-16 sm:px-8">
          <div className="ml-auto max-w-3xl">
            <p className="text-right text-[21px] italic leading-[1.7] text-zinc-300 sm:text-[23px]" style={{ fontFamily: "var(--font-mono-tech)" }}>
              "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."
            </p>
            <p className="mt-5 text-right text-[21px] italic tracking-wide text-zinc-500">— Író Úr</p>
            <div className="mt-10">
              <p className="text-right text-[11px] uppercase tracking-[0.08em] text-zinc-500">Ez egy privát, zártkörű klub. Jelentkezz be.</p>
              <div className="mt-5 grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 sm:flex sm:justify-end sm:gap-4">
                <Link
                  href="/auth?from=%2Ffooldal-4&next=%2Ffooldal-4&provider=google"
                  aria-label="Belépés Google-fiókkal"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border-2 border-zinc-300 bg-zinc-100 px-4 py-3 text-[15px] font-semibold tracking-[0.02em] text-zinc-950 transition-all hover:border-white hover:bg-white sm:min-w-44 sm:text-[13px]"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current text-[#4285F4] sm:h-5 sm:w-5"><path d="M21.35 11.1h-9.18v2.98h5.62c-.24 1.56-1.84 4.58-5.62 4.58-3.38 0-6.14-2.8-6.14-6.26s2.76-6.26 6.14-6.26c1.92 0 3.21.82 3.95 1.53l2.14-2.08C16.88 4.3 14.96 3.3 12.17 3.3 7.36 3.3 3.45 7.2 3.45 12s3.91 8.7 8.72 8.7c5.04 0 8.39-3.54 8.39-8.52 0-.57-.06-.99-.13-1.08z" /></svg>
                  Google
                </Link>
                <Link
                  href="/auth?from=%2Ffooldal-4&next=%2Ffooldal-4&provider=facebook"
                  aria-label="Belépés Facebookkal"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md border-2 border-[#1877F2] bg-[#1877F2] px-4 py-3 text-[15px] font-semibold tracking-[0.02em] text-white transition-all hover:border-[#2f87ff] hover:bg-[#2f87ff] sm:min-w-44 sm:text-[13px]"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 fill-current text-white sm:h-5 sm:w-5">
                    <path d="M13.65 22v-8.22h2.76l.41-3.2h-3.17V8.54c0-.93.26-1.57 1.6-1.57h1.71V4.1c-.3-.04-1.34-.1-2.55-.1-2.52 0-4.25 1.54-4.25 4.37v2.21H7.3v3.2h2.87V22h3.48Z" />
                  </svg>
                  Facebook
                </Link>
              </div>
              <div className="mt-5 flex justify-end border-t border-zinc-800/80 pt-3">
                <Link
                  href="/auth?from=%2Ffooldal-4&next=%2Ffooldal-4#auth-email"
                  className="inline-flex items-center gap-2 py-2 text-[12px] tracking-[0.04em] text-zinc-500 underline decoration-zinc-800 underline-offset-4 transition-colors hover:text-zinc-300 hover:decoration-zinc-500"
                >
                  <Mail aria-hidden="true" className="h-3.5 w-3.5" />
                  Belépés emaillel
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

function MemberGreeting({ greeting }: { greeting: string }) {
  const [typedGreeting, setTypedGreeting] = useState("")

  useEffect(() => {
    if (!greeting) {
      setTypedGreeting("")
      return
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedGreeting(greeting)
      return
    }

    setTypedGreeting("")
    let index = 0
    let timeoutId: number | null = null

    const tick = () => {
      index += 1
      setTypedGreeting(greeting.slice(0, index))

      if (index < greeting.length) {
        const char = greeting[index - 1] ?? ""
        timeoutId = window.setTimeout(
          tick,
          char === " " ? 10 : /[.!?,:]/.test(char) ? 90 : 24,
        )
      }
    }

    timeoutId = window.setTimeout(tick, 140)
    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
  }, [greeting])

  return (
    <section className="pt-10 pb-8 sm:pt-7" aria-label="Személyes üdvözlés">
      <div className="max-w-4xl">
        <p
          className="text-[23px] font-normal italic leading-normal tracking-tighter text-zinc-300 sm:text-base"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {typedGreeting}
          {typedGreeting.length < greeting.length && (
            <span
              aria-hidden="true"
              className="ml-1 inline-block h-[1em] w-px translate-y-[0.08em] bg-zinc-400 align-baseline animate-pulse"
            />
          )}
        </p>
      </div>
    </section>
  )
}

function BookPurchaseSection() {
  const editions = [
    {
      edition: "I. KÖTET",
      title: "Vállalhatatlan I.",
      description:
        "Történetek a kilencvenes évek és az ezredforduló félresiklott Budapestjéről. Bővített kiadás új szövegekkel, képekkel és dokumentumokkal.",
      cover: "/vallalhatatlan.png",
      href: "/konyv-1",
      alt: "Vállalhatatlan I. kötet borítója",
    },
    {
      edition: "II. KÖTET",
      title: "Vállalhatatlan II.",
      description:
        "V. egy szürreális pénzmosodaként működő, éjjel-nappali internetkávézó élére kerül. Bővített kiadás új tartalmakkal.",
      cover: "/vallalhatatlan2.png",
      href: "/konyv-v2",
      alt: "Vállalhatatlan II. kötet borítója",
    },
  ]

  return (
    <section
      className="animate-fadeIn border-b border-zinc-900 py-9 sm:py-12"
      aria-labelledby="homepage-books-heading"
    >
      <div className="mb-5 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            className="text-[9px] uppercase tracking-[0.28em] text-lime-200/55"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            KÖNYVTÁR / BŐVÍTETT KIADÁS // 2026
          </p>
          <h2
            id="homepage-books-heading"
            className="mt-3 text-2xl uppercase leading-[0.98] tracking-tight text-zinc-100 sm:text-4xl"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Válassz egy kötetet
          </h2>
        </div>
        <p
          className="max-w-sm text-xs leading-5 text-zinc-500 sm:text-right"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          Két könyv. Új anyagok. Egy hálózat. A szállítás módját a rendelésnél választod ki.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {editions.map((edition) => (
          <article
            key={edition.edition}
            className="group relative overflow-hidden border border-zinc-800 bg-[#050505] transition-colors hover:border-zinc-600"
          >
            <div className="flex h-full gap-4 p-4 sm:gap-5 sm:p-5">
              <div className="relative w-[104px] shrink-0 self-start overflow-hidden bg-zinc-950 sm:w-[132px]">
                <Image
                  src={edition.cover}
                  alt={edition.alt}
                  width={264}
                  height={360}
                  sizes="(min-width: 640px) 132px, 104px"
                  className="aspect-[2/2.8] h-auto w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <p
                  className="text-[9px] uppercase tracking-[0.22em] text-lime-200/55"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {edition.edition}
                </p>
                <h3
                  className="mt-2 text-xl uppercase leading-tight tracking-tight text-zinc-100 sm:text-2xl"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {edition.title}
                </h3>
                <p
                  className="mt-3 text-xs leading-5 text-zinc-500 sm:text-sm sm:leading-6"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {edition.description}
                </p>

                <div className="mt-auto pt-5">
                  <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      className="text-lg font-semibold text-zinc-100 sm:text-xl"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      10 000 Ft
                    </span>
                    <span
                      className="text-[10px] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      + választott szállítás
                    </span>
                  </div>
                  <Link
                    href={edition.href}
                    className="flex min-h-12 w-full items-center justify-between gap-3 border border-lime-200/60 bg-lime-200/[0.04] px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-100 transition-colors hover:border-lime-100 hover:bg-lime-200/[0.1] sm:px-4 sm:text-xs"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                    aria-label={edition.title + " megvásárlása és szállítás kiválasztása"}
                  >
                    <span>MEGRENDELEM</span>
                    <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}


function MemberHome({ session }: { session: SessionShape }) {
  const token = session?.access_token ?? ""
  const [plan, setPlan] = useState<HomepagePlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [error, setError] = useState(false)
  const [celebratedOrders, setCelebratedOrders] = useState<Array<{ orderId: string }>>([])

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
  const handleReceived = (orderId: string) => {
    setCelebratedOrders(current => current.some(item => item.orderId === orderId)
      ? current
      : [...current, { orderId }])
    setPlan(current => current ? {
      ...current,
      blocks: current.blocks.filter(block => block.type !== "order_status" || block.orderId !== orderId)
    } : current)
  }
  if (loadingPlan) return <FullScreenLoader />

  return (
    <>
      <SiteHeader />
      <main className="animate-fadeIn mx-auto w-full max-w-6xl px-5 pb-24 pt-0 sm:px-8 sm:pb-32">
        <MemberGreeting greeting={plan?.greeting ?? "Szia. Jó, hogy itt vagy."} />
        {!loadingPlan && !error && usefulBlocks.map(block => (
          <OrderStatusBlockView key={"order-" + block.orderId} block={block} token={token} onReceived={handleReceived} />
        ))}
        {!loadingPlan && celebratedOrders.map(order => (
          <OrderReceivedCelebration key={"received-" + order.orderId} />
        ))}
        {!loadingPlan && (
          <div className="animate-fadeIn">
            <Fooldal4HuntingMap />
          </div>
        )}
        <BookPurchaseSection />
        {!loadingPlan && (
          <section className="animate-fadeIn border-b border-zinc-900 py-5">
            <Link
              href="/kapcsolat"
              className="flex w-full items-center gap-4 border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-left text-[11px] uppercase tracking-[0.18em] text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900/80 hover:text-white sm:w-auto"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <Image
                src="/img/avatar.webp"
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full border border-zinc-700 object-cover"
              />
              <span className="flex-1">ÜZENET V.-NEK</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>
        )}
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
      {loading ? (
        <FullScreenLoader />
      ) : session ? (
        <MemberHome session={session} />
      ) : (
        <GuestHome />
      )}
    </MainContent>
  )
}

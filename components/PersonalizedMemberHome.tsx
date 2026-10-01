"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Crown,
  HeartHandshake,
  LoaderCircle,
  ShoppingBag,
  RefreshCw,
} from "lucide-react"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
// Personalized member homepage: keep navigation available after auth.
// Keep the member homepage isolated from the legacy homepage.
import type { HomepageBlock, HomepagePlan } from "@/lib/homepage-ai/types"

type SessionShape = {
  access_token?: string
}

type MemberBadgeCode =
  | "first_book"
  | "second_book"
  | "mecenas"
  | "founder"
  | "merch"

type RandomStory = {
  slug: string
  title: string
  text: string
}

const MEMBER_BADGE_ICONS = {
  first_book: BookOpen,
  second_book: BookMarked,
  mecenas: HeartHandshake,
  founder: Crown,
  merch: ShoppingBag,
} as const

const BADGE_ICONS = {
  first_book: BookOpen,
  second_book: BookMarked,
  mecenas: HeartHandshake,
  founder: Crown,
  merch: ShoppingBag,
} as const

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

function isInAppBrowser() {
  if (typeof navigator === "undefined") return false
  return /FBAN|FBAV|Instagram|Line\b|TikTok|Twitter|WhatsApp|Snapchat|Pinterest|LinkedInApp|wv\b|WebView/i.test(
    navigator.userAgent || "",
  )
}

function ProductBlockView({
  block,
}: {
  block: Extract<HomepageBlock, { type: "product" }>
}) {
  const product = block.productId
  const images: Record<string, string> = {
    "book-2": "/vallalhatatlan2.png",
    "men-shirt-1": "/m1.jpg",
    "bag-1": "/ny2.jpg",
    "wallet-1": "/dohany1.jpg",
    "toxic-bunny-1": "/ny1.png",
    "red-eye-bunny-1": "/ny3.png",
  }
  const href =
    product === "book-2"
      ? "/konyv-2"
      : "/shop?product=" + encodeURIComponent(product)

  return (
    <section className="border-y border-zinc-900 py-16 sm:py-24">
      <div className="grid gap-10 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:items-center sm:gap-16">
        <div className="relative aspect-square max-w-sm overflow-hidden bg-zinc-950">
          <img
            src={block.productImage ?? images[product] ?? "/cover2.png"}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>

        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/55">
            TALÁLTAM NEKED VALAMIT
          </p>
          {block.productName ? (
            <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              {block.productName}
            </p>
          ) : null}
          <h2
            className="mt-4 text-3xl leading-tight text-zinc-100 sm:text-5xl"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            {block.headline}
          </h2>
          {block.productPrice ? (
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-zinc-600">
              {new Intl.NumberFormat("hu-HU").format(block.productPrice)} Ft
            </p>
          ) : null}
          <p className="mt-5 text-base leading-7 text-zinc-500 sm:text-lg">
            {block.body}
          </p>
          <Link
            href={href}
            className="mt-8 inline-flex items-center gap-3 rounded-md border border-lime-400/35 bg-lime-400/[0.025] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200 transition-colors hover:border-lime-300/70 hover:bg-lime-400/[0.07] hover:text-white"
          >
            {block.cta}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function StoryBlockView({
  block,
}: {
  block: Extract<HomepageBlock, { type: "story" }>
}) {
  return (
    <section className="border-y border-zinc-900 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/55">
          EGY SZTORI NEKED
        </p>
        <h2
          className="mt-4 text-3xl leading-tight text-zinc-100 sm:text-5xl"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {block.headline}
        </h2>
        {block.storyTitle ? (
          <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-zinc-600">
            {block.storyTitle}
          </p>
        ) : null}
        <article
          className="mt-10 whitespace-pre-line text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {block.storyText}
        </article>
        <Link
          href={"/novellak/" + block.storySlug}
          className="mt-10 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-lime-200/80 hover:text-lime-100"
        >
          {block.cta}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
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
        throw new Error(payload?.error || "Az átvétel visszaigazolása nem sikerült.")
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
    <section className="border-y border-zinc-900 py-14 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/55">
          RENDELÉS / ÁLLAPOT
        </p>
        <h2
          className="mt-4 text-3xl leading-tight text-zinc-100 sm:text-5xl"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {block.headline}
        </h2>
        <p className="mt-5 text-base leading-7 text-zinc-500 sm:text-lg">
          {block.body}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-lime-200/80 hover:text-lime-100"
          >
            {block.cta ?? "RENDELÉSEM"}
            <ArrowUpRight className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={() => void markReceived()}
            disabled={!token || receiving}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-wait disabled:opacity-40"
          >
            {receiving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
            {receiving ? "FELDOLGOZÁS…" : "ÁT VETTEM"}
          </button>
        </div>

        {error ? (
          <p className="mt-4 text-xs text-red-400">{error}</p>
        ) : null}
      </div>
    </section>
  )
}

function NetworkBlockView({
  block,
}: {
  block: Extract<HomepageBlock, { type: "network" }>
}) {
  return (
    <section className="border-y border-zinc-900 py-16 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/55">
          HÁLÓZAT
        </p>
        <h2
          className="mt-4 text-3xl leading-tight text-zinc-100 sm:text-5xl"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {block.headline}
        </h2>
        <p className="mt-5 text-base leading-7 text-zinc-500 sm:text-lg">
          {block.body}
        </p>
        <Link
          href="/halozat"
          className="mt-8 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.22em] text-lime-200/80 hover:text-lime-100"
        >
          {block.cta}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}

function BadgeBlockView({
  codes,
}: {
  codes: Array<keyof typeof BADGE_ICONS>
}) {
  return (
    <section className="border-y border-zinc-900 py-14 sm:py-18">
      <div className="flex flex-wrap gap-3">
        {codes?.map((code) => {
          const Icon = BADGE_ICONS[code]
          return (
            <span
              key={code}
              title={code.replace("_", " ")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500"
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
          )
        })}
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="border-y border-zinc-900 py-16 sm:py-24" aria-label="Bízhatsz bennem">
      <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center sm:gap-12">
        <div>
          <p className="text-3xl italic leading-tight text-zinc-200 sm:text-5xl" style={{ fontFamily: "var(--font-heading), serif" }}>
            Bízhatsz bennem, nyúl vagyok.
          </p>
          <p className="mt-5 text-sm leading-7 text-zinc-500 sm:text-base" style={{ fontFamily: "var(--font-mono-tech)" }}>
            Ha kérdésed van{" "}
            <Link href="/kapcsolat" className="text-lime-100 underline underline-offset-4">
              itt tudsz
            </Link>{" "}
            írni nekem.
          </p>
        </div>

        <div className="mx-auto w-36 overflow-hidden rounded-full border border-zinc-800 bg-black sm:mx-0 sm:justify-self-end">
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

function MemberBadgesSection({ codes }: { codes: MemberBadgeCode[] }) {
  const labels: Record<MemberBadgeCode, string> = {
    first_book: "ELSŐ KÖNYV",
    second_book: "MÁSODIK KÖNYV",
    mecenas: "MECÉNÁS",
    founder: "ALAPÍTÓ",
    merch: "MERCH",
  }

  return (
    <section className="border-y border-zinc-900 py-14 sm:py-20" aria-label="Jelvényeid">
      <div className="border-t border-b border-zinc-800 py-4">
        <p className="text-[11px] uppercase tracking-[0.32em] text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
          JELVÉNYEID
        </p>
        <p className="mt-2 text-sm italic text-zinc-600">
          Amiket eddig megszereztél
        </p>
      </div>

      {codes.length === 0 ? (
        <div className="mt-7">
          <p className="max-w-2xl text-sm leading-7 text-zinc-600">
            Még nincs megszerzett jelvényed.
          </p>
        </div>
      ) : (
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-6">
          {codes.map((code) => {
            const Icon = MEMBER_BADGE_ICONS[code]
            return (
              <div key={code} className="group inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/35 bg-lime-400/[0.03] text-lime-200 transition-colors group-hover:border-lime-300/70 group-hover:bg-lime-400/[0.07]">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="text-[11px] uppercase tracking-[0.12em] text-zinc-300 sm:text-xs" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  {labels[code]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RandomStorySection() {
  const [story, setStory] = useState<RandomStory | null>(null)
  const [loadingStory, setLoadingStory] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const loadStory = async () => {
    setLoadingStory(true)

    try {
      const response = await fetch("/api/public/random-story", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("random_story_failed")

      const payload = (await response.json()) as RandomStory
      setStory(payload)
      setExpanded(false)
    } catch (error) {
      console.error("[homepage] random story failed", error)
      setStory(null)
    } finally {
      setLoadingStory(false)
    }
  }

  useEffect(() => {
    void loadStory()
  }, [])

  const paragraphs =
    story?.text
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean) ?? []

  const visibleParagraphs = expanded ? paragraphs : paragraphs.slice(0, 2)

  return (
    <section className="mt-16 w-full border-t border-zinc-800 pt-4 sm:mt-20" aria-label="Random Vállalhatatlan Sztori">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
        <span>Random Vállalhatatlan Sztori</span>
        <button
          type="button"
          onClick={() => void loadStory()}
          disabled={loadingStory}
          aria-label="Új random sztori"
          title="Új random sztori"
          className="group flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-lime-100 disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            strokeWidth={2}
            className={loadingStory ? "animate-spin" : "transition-transform duration-500 group-hover:rotate-180"}
          />
        </button>
      </div>

      {story ? (
        <article className="border-t border-zinc-800 pt-8 sm:pt-10">
          <h3 className="text-3xl leading-tight text-zinc-100 sm:text-4xl" style={{ fontFamily: "var(--font-mono-tech)" }}>
            {story.title}
          </h3>

          <div className="relative mt-4">
            <div className={expanded ? "" : "relative max-h-[390px] overflow-hidden"}>
              {visibleParagraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {!expanded && paragraphs.length > 2 ? (
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#010101] via-[#010101]/85 to-transparent"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {paragraphs.length > 2 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mx-auto mt-6 flex w-1/2 items-center justify-between rounded-md border border-zinc-800 px-3 py-3 text-left text-[11px] uppercase tracking-[0.2em] text-zinc-400 transition-all hover:border-lime-100/50 hover:bg-lime-100/[0.03] hover:text-lime-100 sm:w-1/3"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              aria-expanded={expanded}
            >
              <span>{expanded ? "BEZÁROM" : "OLVASOM TOVÁBB"}</span>
              <span>{expanded ? "↑" : "→"}</span>
            </button>
          ) : null}
        </article>
      ) : (
        <p className="border-t border-zinc-800 pt-8 text-sm italic text-zinc-600">
          {loadingStory ? "Sztori betöltése..." : "Nincs elérhető sztori."}
        </p>
      )}
    </section>
  )
}

export default function PersonalizedMemberHome() {
  const { session, loading } = useSessionGuard() as {
    session: SessionShape | null
    loading: boolean
  }
  const token = session?.access_token ?? null
  const [plan, setPlan] = useState<HomepagePlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [error, setError] = useState(false)
  const [loaderIndex, setLoaderIndex] = useState(0)
  const [badgeCodes, setBadgeCodes] = useState<MemberBadgeCode[]>([])
  const loaderLines = [
    "IDENTITY LINK / kapcsolódás",
    "PROFILE SCAN / profil beolvasása",
    "ORDER TRACE / rendelések ellenőrzése",
    "STORY POOL / történetek keresése",
    "SHOP INDEX / elérhető tárgyak keresése",
    "DIRECTOR / a mai oldal összeállítása",
  ]

  useEffect(() => {
    if (!loading && loadingPlan) {
      const interval = window.setInterval(() => {
        setLoaderIndex((current) => (current + 1) % loaderLines.length)
      }, 650)

      return () => window.clearInterval(interval)
    }
  }, [loading, loadingPlan])

  useEffect(() => {
    if (loading || !token) return

    const controller = new AbortController()

    async function load() {
      try {
        const url = new URL("/api/homepage/personalize", window.location.origin)
        const params = new URLSearchParams(window.location.search)

        if (params.get("utm_source")) {
          url.searchParams.set("utm_source", params.get("utm_source")!)
        }
        if (params.get("utm_campaign")) {
          url.searchParams.set("utm_campaign", params.get("utm_campaign")!)
        }

        url.searchParams.set("hour", String(new Date().getHours()))

        const sessionId = getSessionId()
        let referrerHost: string | null = null
        let storedSource: string | null = null
        let storedCampaign: string | null = null

        try {
          referrerHost = document.referrer ? new URL(document.referrer).host : null
        } catch {
          referrerHost = null
        }

        try {
          const stored = sessionStorage.getItem("vh_homepage_entry_v1")
          if (stored) {
            const entry = JSON.parse(stored) as {
              source?: unknown
              campaign?: unknown
              referrer?: unknown
              capturedAt?: unknown
            }

            const capturedAt = Number(entry.capturedAt ?? 0)
            if (capturedAt > 0 && Date.now() - capturedAt < 24 * 60 * 60 * 1000) {
              storedSource = typeof entry.source === "string" ? entry.source : null
              storedCampaign =
                typeof entry.campaign === "string" ? entry.campaign : null

              if (!referrerHost && typeof entry.referrer === "string") {
                try {
                  referrerHost = entry.referrer ? new URL(entry.referrer).host : null
                } catch {
                  referrerHost = null
                }
              }
            }
          }
        } catch {
          // Entry source is optional.
        }

        if (storedSource && !url.searchParams.get("utm_source")) {
          url.searchParams.set("utm_source", storedSource)
        }
        if (storedCampaign && !url.searchParams.get("utm_campaign")) {
          url.searchParams.set("utm_campaign", storedCampaign)
        }

        const response = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            sessionId,
            isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || ""),
            isInAppBrowser: isInAppBrowser(),
            referrerHost,
          }),
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) throw new Error("homepage_failed")

        const payload = (await response.json()) as {
          ok?: boolean
          plan?: HomepagePlan
        }

        if (!payload.ok || !payload.plan) throw new Error("homepage_missing")

        setPlan(payload.plan)

        void fetch("/api/user/account", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        })
          .then((accountResponse) =>
            accountResponse.ok
              ? accountResponse.json()
              : Promise.reject(new Error("account_failed")),
          )
          .then((accountPayload) => {
            const codes = Array.isArray(accountPayload?.account?.badges)
              ? accountPayload.account.badges
                  .map((badge: { code?: unknown }) => badge.code)
                  .filter((code: unknown): code is MemberBadgeCode =>
                    ["first_book", "second_book", "mecenas", "founder", "merch"].includes(String(code)),
                  )
              : []
            setBadgeCodes(codes)
          })
          .catch((accountError) => {
            console.error("[homepage] badge load failed", accountError)
            setBadgeCodes([])
          })

        try {
          sessionStorage.removeItem("vh_homepage_entry_v1")
        } catch {
          // Ignore storage cleanup errors.
        }
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return
        }

        console.error("[homepage] personalized page failed", requestError)
        setError(true)
      } finally {
        setLoadingPlan(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [loading, token])

  if (loading || loadingPlan) {
    return (
      <div className="relative flex min-h-[82vh] w-full items-center justify-center overflow-hidden bg-[#010101] px-5 py-20 sm:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(to_bottom,rgba(163,230,53,0.035)_0,rgba(163,230,53,0.035)_1px,transparent_1px,transparent_22px)]" />
        <div className="relative w-full max-w-3xl overflow-hidden border border-zinc-800 bg-black/90 p-5 shadow-[0_0_70px_rgba(163,230,53,0.04)] sm:p-7">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
              VÁLLALHATATLAN / MEMBER CHANNEL
            </span>
            <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-lime-200/60" style={{ fontFamily: "var(--font-mono-tech)" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-300" />
              LIVE
            </span>
          </div>

          <div className="mt-8 space-y-3 text-[12px] leading-6 text-zinc-500 sm:text-sm" style={{ fontFamily: "var(--font-mono-tech)" }}>
            {loaderLines.slice(0, loaderIndex + 1).map((line, index) => (
              <p key={line} className={index === loaderIndex ? "text-lime-200" : "text-zinc-700"}>
                <span className="mr-3 text-zinc-800">[{String(index + 1).padStart(2, "0")}]</span>
                {line}
                {index === loaderIndex ? <span className="ml-1 animate-pulse">_</span> : null}
              </p>
            ))}
          </div>

          <div className="mt-8 h-px w-full bg-zinc-900">
            <div
              className="h-px bg-lime-300/40 transition-all duration-500"
              style={{ width: ((loaderIndex + 1) / loaderLines.length) * 100 + "%" }}
            />
          </div>

          <p className="mt-3 text-[9px] uppercase tracking-[0.22em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
            PERSONALIZED HOMEPAGE BUILD / {Math.round(((loaderIndex + 1) / loaderLines.length) * 100)}%
          </p>
        </div>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-5 sm:px-8">
        <div>
          <p className="text-3xl text-zinc-300">Szia.</p>
          <p className="mt-4 text-sm text-zinc-600">
            Most valami nem állt össze. Próbáld újra egy pillanat múlva.
          </p>
        </div>
      </div>
    )
  }

  const handleReceived = (orderId: string) => {
    setPlan((current) =>
      current
        ? { ...current, blocks: current.blocks.filter((block) => block.type !== "order_status" || block.orderId !== orderId) }
        : current,
    )
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-28 sm:px-8 sm:pb-36 sm:pt-32">
        <section className="flex min-h-[48vh] items-center border-b border-zinc-900 py-24 sm:min-h-[58vh] sm:py-32">
          <div className="max-w-4xl">
            <p
              className="text-4xl leading-[1.08] tracking-tight text-zinc-100 sm:text-6xl lg:text-[5.1rem]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {plan.greeting}
            </p>
          </div>
        </section>

        <div className="space-y-0">
          {plan.blocks.map((block, index) => {
            if (block.type === "product") {
              return (
                <ProductBlockView
                  key={"product-" + block.productId + "-" + index}
                  block={block}
                />
              )
            }

            if (block.type === "story") {
              return (
                <StoryBlockView
                  key={"story-" + block.storySlug + "-" + index}
                  block={block}
                />
              )
            }

            if (block.type === "order_status") {
              return (
                <OrderStatusBlockView
                  key={"order-" + block.orderId}
                  block={block}
                  token={token}
                  onReceived={handleReceived}
                />
              )
            }

            if (block.type === "network") {
              return (
                <NetworkBlockView
                  key={"network-" + index}
                  block={block}
                />
              )
            }

            return (
              <BadgeBlockView
                key={"badge-" + index}
                codes={block.codes}
              />
            )
          })}
        </div>

        <TrustSection />
        <MemberBadgesSection codes={badgeCodes} />
        <RandomStorySection />
      </main>
      <Footer />
    </>
  )
}

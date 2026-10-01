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
} from "lucide-react"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import type { HomepageBlock, HomepagePlan } from "@/lib/homepage-ai/types"

type SessionShape = {
  access_token?: string
}

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
  const href = product === "book-2" ? "/konyv-2" : "/shop"

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
            className="mt-8 inline-flex items-center gap-3 rounded-md border border-zinc-700 px-5 py-3 text-[10px] uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-lime-300/50 hover:text-lime-100"
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
        {codes.map((code) => {
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

export default function PersonalizedMemberHome() {
  const { session, loading } = useSessionGuard() as {
    session: SessionShape | null
    loading: boolean
  }
  const token = session?.access_token ?? null
  const [plan, setPlan] = useState<HomepagePlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [error, setError] = useState(false)

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
      <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-5 sm:px-8">
        <div className="w-full">
          <div className="h-px w-24 bg-zinc-800" />
          <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-zinc-700">
            CHANNEL INITIALIZING
          </p>
          <div className="mt-5 h-10 w-full max-w-3xl animate-pulse bg-zinc-950" />
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
      </main>
      <Footer />
    </>
  )
}

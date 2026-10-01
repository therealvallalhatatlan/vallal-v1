"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Montserrat } from "next/font/google"
import {
  ArrowUpRight,
  BookMarked,
  BookOpen,
  Crown,
  HeartHandshake,
  LoaderCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
import type {
  HomepageBlock,
  HomepagePlan,
  HomepageProductCandidate,
} from "@/lib/homepage-ai/types"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

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

type NetworkSpot = {
  id: string
  spot_type?: "free" | "paid"
  type?: "physical" | "virtual"
}

const BADGE_ICONS = {
  first_book: BookOpen,
  second_book: BookMarked,
  mecenas: HeartHandshake,
  founder: Crown,
  merch: ShoppingBag,
} as const

const BADGE_LABELS: Record<MemberBadgeCode, string> = {
  first_book: "I. KÖNYV",
  second_book: "II. KÖNYV",
  mecenas: "MECÉNÁS",
  founder: "ALAPÍTÓ",
  merch: "MERCH",
}

const LOADER_LINES = [
  "IDENTITY LINK / kapcsolódás",
  "PROFILE SCAN / profil beolvasása",
  "ORDER TRACE / rendelések ellenőrzése",
  "BADGE INDEX / jelvények beolvasása",
  "SHOP INDEX / elérhető tárgyak keresése",
  "NETWORK PULSE / hálózati adatok",
  "DIRECTOR / a mai oldal összeállítása",
]


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

function MemberTerminalTrace({
  loading,
  loaderIndex,
}: {
  loading: boolean
  loaderIndex: number
}) {
  const visibleLines = loading
    ? LOADER_LINES.slice(0, loaderIndex + 1)
    : LOADER_LINES
  const lastIndex = visibleLines.length - 1

  return (
    <section
      className="mt-0 pb-0 bg-[#010101]/95"
      aria-label="Member channel állapot"
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-3">
        <div
          className="flex items-center justify-between pb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-400"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <span className="tracking-normal">v 3.2.5</span>
          <span className="flex items-center gap-2 text-lime-100/50">
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (loading
                  ? "animate-pulse bg-lime-300"
                  : "bg-lime-100/50")
              }
            />
            {loading ? "BUILDING" : "READY"}
          </span>
        </div>

        <div
          className="grid gap-x-8 gap-y-0.5 text-[11px] leading-4"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {visibleLines.map((line, index) => (
            <p
              key={line}
              className={
                loading && index === lastIndex
                  ? "text-lime-200/90"
                  : loading
                    ? "text-zinc-500"
                    : index === LOADER_LINES.length - 1
                      ? "text-lime-200/35"
                      : "text-zinc-300/80"
              }
            >
              <span className="mr-2 text-lime-100/50">
                [{String(index + 1).padStart(2, "0")}]
              </span>
              {line}
              {loading && index === lastIndex ? (
                <span className="ml-1 animate-pulse">_</span>
              ) : null}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function FixedBadgesSection({
  codes,
}: {
  codes: MemberBadgeCode[] | null
}) {
  return (
    <section className="py-7" aria-label="Jelvényeid">
      <div className="border-y border-zinc-700 py-3">
        <p
          className="text-[11px] uppercase tracking-[0.3em] text-zinc-400"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          JELVÉNYEID
        </p>
      </div>

      {codes === null ? (
        <div className="mt-5 h-14 w-full animate-pulse bg-zinc-950" />
      ) : codes.length === 0 ? (
        <div className="mt-5 max-w-xl">
          <p
            className="text-sm leading-6 text-zinc-500"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Ó még nincs egy kitűződ sem. Nézz körül, hogy szerezhetnél egyet.
          </p>
          <Link
            href="/shop"
            className="mt-4 inline-flex items-center gap-2 rounded-sm border-2 border-lime-400/45 px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200/90 transition-colors hover:border-lime-300 hover:text-lime-100"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            NÉZZ KÖRÜL A SHOPBAN
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-5 gap-1 sm:flex sm:justify-start sm:gap-7">
          {codes.map((code) => {
            const Icon = BADGE_ICONS[code]

            return (
              <div
                key={code}
                className="flex min-w-0 flex-col items-center gap-2 sm:min-w-[4.75rem]"
              >
                <span
                  title={BADGE_LABELS[code]}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/30 bg-lime-400/[0.025] text-lime-200 transition-colors hover:border-lime-300/70 hover:bg-lime-400/[0.06]"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span
                  className="w-full text-center text-[7px] uppercase leading-[1.2] tracking-[0.08em] text-zinc-500 sm:text-[9px] sm:tracking-[0.12em]"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {BADGE_LABELS[code]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function RecommendedProductsSection({
  products,
}: {
  products: HomepageProductCandidate[]
}) {
  if (products.length === 0) return null

  return (
    <section className="py-7" aria-label="Ajánlott termékek">
      <div className="border-y border-zinc-700 py-3">
        <div className="flex items-center justify-between gap-4">
          <p
            className="text-[11px] uppercase tracking-[0.3em] text-zinc-400"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            AJÁNLOTT NEKED
          </p>
          <span
            className="text-[9px] uppercase tracking-[0.16em] text-zinc-600"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {products.length} TALÁLAT
          </span>
        </div>
      </div>

      <div
        className="-mx-5 mt-5 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8"
        style={{ scrollSnapType: "x mandatory" }}
      >
        <div className="flex w-max gap-3">
          {products.map((product, index) => {
            const href =
              product.href ??
              (product.id === "book-2"
                ? "/konyv-2"
                : "/shop?product=" + encodeURIComponent(product.id))
            const isPhysical =
              product.fulfillment !== "digital" && product.fulfillment !== "event"

            return (
              <article
                key={product.id}
                className="w-[78vw] max-w-[21rem] shrink-0 snap-start overflow-hidden rounded-md border border-zinc-800 bg-[#050505]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <img
                    src={product.images?.[0] ?? "/cover2.png"}
                    alt={product.name}
                    className="h-full w-full object-contain grayscale transition-all duration-300 hover:grayscale-0"
                  />
                  <span
                    className="absolute left-2 top-2 border border-zinc-800 bg-white/90 px-2 py-1 text-[8px] uppercase tracking-[0.18em] text-zinc-700"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    #{String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="p-4 sm:p-5">
                  <p
                    className="text-[9px] uppercase tracking-[0.2em] text-zinc-500"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    TALÁLTAM NEKED VALAMIT
                  </p>

                  <h3
                    className={
                      "mt-2 text-xl uppercase leading-[0.95] tracking-[-0.015em] text-zinc-100 " +
                      montserrat.className
                    }
                  >
                    {product.name}
                  </h3>

                  <p
                    className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-500"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {product.description}
                  </p>

                  <div
                    className="mt-5"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {isPhysical ? (
                      <>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11px] uppercase tracking-[0.04em] text-zinc-500">
                            DEAD DROP
                          </span>
                          <span className="text-[12px] font-bold tracking-[0.04em] text-lime-200">
                            {new Intl.NumberFormat("hu-HU").format(product.price)} Ft
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between gap-3">
                          <span className="text-[11px] uppercase tracking-[0.04em] text-zinc-600">
                            POSTAAUTOMATA
                          </span>
                          <span className="text-[12px] tracking-[0.04em] text-zinc-500">
                            {new Intl.NumberFormat("hu-HU").format(product.price + 2500)} Ft
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[11px] uppercase tracking-[0.04em] text-zinc-500">
                          {product.fulfillment === "event" ? "BELÉPŐ" : "DIGITÁLIS"}
                        </span>
                        <span className="text-[12px] font-bold tracking-[0.04em] text-lime-200">
                          {new Intl.NumberFormat("hu-HU").format(product.price)} Ft
                        </span>
                      </div>
                    )}
                  </div>

                  <Link
                    href={href}
                    className="group mt-4 flex items-center justify-between border-2 border-zinc-700 bg-zinc-800 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition-all hover:border-lime-400/70 hover:bg-lime-400/[0.035] hover:text-lime-100"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span>MEGNÉZEM</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      </div>

      <p
        className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-700"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        ← HÚZD / GÖRGESS OLDALRA
      </p>
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
          className={"mt-3 text-2xl uppercase leading-[0.98] tracking-tight text-zinc-100 sm:text-4xl " + montserrat.className}
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

function NetworkSnapshotSection() {
  const [spots, setSpots] = useState<NetworkSpot[]>([])
  const [loading, setLoading] = useState(true)

  const loadSpots = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/matrica/spots", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("network_spots_failed")

      const payload = (await response.json()) as {
        spots?: NetworkSpot[]
      }

      setSpots(Array.isArray(payload.spots) ? payload.spots : [])
    } catch (error) {
      console.error("[homepage] network snapshot failed", error)
      setSpots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSpots()
  }, [])

  const stats = [
    ["AKTÍV SZPOT", spots.length],
    ["INGYENES SZPOT", spots.filter((spot) => spot.spot_type !== "paid").length],
    ["FIZIKAI SZPOT", spots.filter((spot) => spot.type === "physical").length],
    ["VIRTUÁLIS SZPOT", spots.filter((spot) => spot.type === "virtual").length],
  ]

  return (
    <section className="py-12 sm:py-16" aria-label="Hálózat">
      <div className="border-y border-zinc-800 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-200/50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-100" />
            </span>
            <span
              className="text-[11px] uppercase tracking-[0.28em] text-zinc-300"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              A HÁLÓZAT
            </span>
          </div>
          <button
            type="button"
            onClick={() => void loadSpots()}
            className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 hover:text-lime-100"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            {loading ? "SYNC..." : "FRISSÍTÉS"}
          </button>
        </div>
      </div>

      <p
        className="mt-7 max-w-2xl text-base italic leading-7 text-zinc-500 sm:text-lg"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        Ezek itt élő, valós időben frissülő adatok.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-black/90 px-3 py-4 sm:px-4 sm:py-5">
            <p
              className="text-[11px] uppercase leading-4 tracking-[0.16em] text-zinc-400 sm:text-[9px]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {label}
            </p>
            <p
              className="mt-1 text-2xl leading-none text-zinc-100 sm:text-3xl"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {loading ? "--" : String(value).padStart(2, "0")}
            </p>
          </div>
        ))}
      </div>

      <Link
        href="/halozat"
        className="group mt-3 flex items-center justify-between rounded-md border-2 border-zinc-700 px-4 py-3 transition-colors hover:border-lime-400/70 hover:bg-lime-400/[0.025]"
      >
        <div>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-300"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            BELÉPÉS A HÁLÓZATBA
          </p>
          <p
            className="mt-1 text-[9px] uppercase tracking-[0.14em] text-zinc-500"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            TÉRKÉP · PONTOK · EMBEREK
          </p>
        </div>
        <span className="text-3xl text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-lime-100">
          →
        </span>
      </Link>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="py-12 sm:py-16" aria-label="Bízhatsz bennem">
      <div className="flex gap-6">
        
        <div className="w-[61.8%]">
          <p
            className="text-[23px] font-normal italic leading-tight tracking-tight text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            Bízhatsz bennem,<br/>nyúl vagyok.
          </p>

          <p
            className="mt-4 text-sm leading-normal text-zinc-400"
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
    <section
      className="w-full"
      aria-label="Random Vállalhatatlan Sztori"
    >
      <div className="flex items-center justify-between border-t border-b border-zinc-800 pt-2 pb-2">
        <span
          className="text-[10px] uppercase tracking-[0.24em] text-zinc-300"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          RANDOM VÁLLALHATATLAN SZTORI
        </span>

        <button
          type="button"
          onClick={() => void loadStory()}
          disabled={loadingStory}
          aria-label="Új random sztori"
          className="flex h-8 w-8 items-center justify-center text-zinc-500 transition-colors hover:text-lime-100 disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            strokeWidth={2}
            className={loadingStory ? "animate-spin" : ""}
          />
        </button>
      </div>

      {story ? (
        <article className="pt-7 sm:pt-9">
          <h2
            className={"text-3xl leading-tight text-zinc-100 sm:text-4xl " + montserrat.className}
          >
            {story.title}
          </h2>

          <div className="relative mt-4">
            <div
              className={
                expanded ? "" : "relative max-h-[360px] overflow-hidden"
              }
            >
              {visibleParagraphs.map((paragraph, index) => (
                <p
                  key={index}
                  className="mt-4 whitespace-pre-line text-lg leading-normal text-zinc-300/80"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            {!expanded && paragraphs.length > 2 ? (
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#010101] via-[#010101]/85 to-transparent"
                aria-hidden="true"
              />
            ) : null}
          </div>

          {paragraphs.length > 2 ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mx-auto mt-5 flex w-1/2 items-center justify-between border-2 border-zinc-700 px-3 py-3 text-left text-[11px] uppercase tracking-[0.2em] text-zinc-300 transition-all hover:border-lime-100/60 hover:bg-lime-100/[0.03] hover:text-lime-100 sm:w-1/3"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              aria-expanded={expanded}
            >
              <span>{expanded ? "BEZÁROM" : "OLVASOM TOVÁBB"}</span>
              <span>{expanded ? "↑" : "→"}</span>
            </button>
          ) : null}
        </article>
      ) : (
        <p
          className="border-t border-zinc-800 pt-7 text-sm italic text-zinc-600"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          {loadingStory ? "Sztori betöltése..." : "Nincs elérhető sztori."}
        </p>
      )}
    </section>
  )
}

function isUsefulBlock(block: HomepageBlock) {
  return block.type === "order_status"
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
  const [badgeCodes, setBadgeCodes] = useState<MemberBadgeCode[] | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<HomepageProductCandidate[]>([])

  useEffect(() => {
    if (!loading && loadingPlan) {
      const interval = window.setInterval(() => {
        setLoaderIndex((current) =>
          Math.min(current + 1, LOADER_LINES.length - 1),
        )
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
          referrerHost = document.referrer
            ? new URL(document.referrer).host
            : null
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

            if (
              capturedAt > 0 &&
              Date.now() - capturedAt < 24 * 60 * 60 * 1000
            ) {
              storedSource =
                typeof entry.source === "string" ? entry.source : null
              storedCampaign =
                typeof entry.campaign === "string" ? entry.campaign : null

              if (!referrerHost && typeof entry.referrer === "string") {
                try {
                  referrerHost = entry.referrer
                    ? new URL(entry.referrer).host
                    : null
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
            isMobile: /Mobi|Android|iPhone|iPad/i.test(
              navigator.userAgent || "",
            ),
            isInAppBrowser: isInAppBrowser(),
            referrerHost,
          }),
          cache: "no-store",
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error("homepage_failed")
        }

        const payload = (await response.json()) as {
          ok?: boolean
          plan?: HomepagePlan
          recommendedProducts?: HomepageProductCandidate[]
        }

        if (!payload.ok || !payload.plan) {
          throw new Error("homepage_missing")
        }

        setPlan(payload.plan)
        setRecommendedProducts(
          Array.isArray(payload.recommendedProducts)
            ? payload.recommendedProducts
            : [],
        )

        void fetch("/api/user/account", {
          headers: {
            Authorization: "Bearer " + token,
          },
          cache: "no-store",
        })
          .then(async (accountResponse) => {
            if (!accountResponse.ok) {
              throw new Error("account_failed")
            }
            return (await accountResponse.json()) as {
              account?: {
                badges?: Array<{ code?: unknown }>
              }
            }
          })
          .then((accountPayload) => {
            const codes = Array.isArray(accountPayload.account?.badges)
              ? accountPayload.account.badges
                  .map((badge) => badge.code)
                  .filter(
                    (code): code is MemberBadgeCode =>
                      [
                        "first_book",
                        "second_book",
                        "mecenas",
                        "founder",
                        "merch",
                      ].includes(String(code)),
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
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
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
      <>
        <SiteHeader />
        <MemberTerminalTrace loading loaderIndex={loaderIndex} />
      </>
    )
  }

  if (error || !plan) {
    return (
      <>
        <SiteHeader />
        <MemberTerminalTrace loading={false} loaderIndex={loaderIndex} />
        <div className="mx-auto flex min-h-[50vh] w-full max-w-5xl items-center px-5 sm:px-8">
          <div>
            <p className="text-3xl text-zinc-300">Szia.</p>
            <p
              className="mt-4 text-sm text-zinc-600"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Most valami nem állt össze. Próbáld újra egy pillanat múlva.
            </p>
          </div>
        </div>
      </>
    )
  }

  const handleReceived = (orderId: string) => {
    setPlan((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.filter(
              (block) =>
                block.type !== "order_status" || block.orderId !== orderId,
            ),
          }
        : current,
    )
  }

  const usefulBlocks = plan.blocks.filter(isUsefulBlock)

  return (
    <>
      <SiteHeader />
      <MemberTerminalTrace loading={false} loaderIndex={loaderIndex} />

      <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-0 sm:pb-32">
        <section className="pt-10 pb-10">
          <div className="max-w-4xl">
            <p
              className="text-[23px] font-normal italic leading-normal tracking-tighter text-zinc-300 sm:text-base"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {plan.greeting}
            </p>
          </div>
        </section>

        <FixedBadgesSection codes={badgeCodes} />
        <RecommendedProductsSection products={recommendedProducts} />

        <div>
          {usefulBlocks.map((block) => (
            <OrderStatusBlockView
              key={"order-" + block.orderId}
              block={block}
              token={token}
              onReceived={handleReceived}
            />
          ))}
        </div>

        <NetworkSnapshotSection />
        <TrustSection />
        <RandomStorySection />
      </main>

      <Footer />
    </>
  )
}

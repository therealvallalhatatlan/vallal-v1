"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, Radio, Sparkles, Users } from "lucide-react"
import { createClient } from "@/lib/browser"
import { persistAuthReturnTarget } from "@/lib/authRedirect"
import Reviews from "@/components/Reviews"
import SiteHeader from "@/components/SiteHeader"
import MainContent from "@/components/MainContent"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import type { DashboardAccountResponse } from "@/types/dashboard"

type FeedPost = {
  id: string
  nickname: string | null
  body: string
  created_at: string
}

type SessionShape = {
  access_token?: string
  user?: {
    email?: string | null
  }
}

function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ismeretlen idő"

  const diff = Math.max(0, Date.now() - date.getTime())
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return "most"
  if (minutes < 60) return `${minutes} perce`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} órája`

  const days = Math.floor(hours / 24)
  return `${days} napja`
}

function getNextMove(account: DashboardAccountResponse) {
  const badgeCodes = new Set(account.badges.map((badge) => badge.code))
  const hasFirstBook = badgeCodes.has("first_book")
  const hasSecondBook = badgeCodes.has("second_book")
  const hasMerch = badgeCodes.has("merch")
  const hasMecenas = badgeCodes.has("mecenas")
  const hasNetworkActivity =
    account.network.claims.accepted > 0 ||
    account.network.spots.active > 0

  if (hasFirstBook && !hasSecondBook) {
    return {
      eyebrow: "KÖVETKEZŐ LÉPÉS",
      title: "A MÁSODIK KÖTET HIÁNYZIK",
      body: "Az I. kötet már a gyűjteményed része. A II. kötet egy újabb ajtó ugyanabba a világba.",
      href: "/konyv-2",
      cta: "MEGNÉZEM A II. KÖTETET",
      meta: "SZEMÉLYRE SZABVA / 01",
    }
  }

  if (hasSecondBook && !hasFirstBook) {
    return {
      eyebrow: "KÖVETKEZŐ LÉPÉS",
      title: "NÉZZ BE AZ ELSŐ RÉTEGBE",
      body: "Az I. kötet online olvasója megnyitja a projekt egy korábbi, közvetlenebb rétegét.",
      href: "/reader",
      cta: "ELSŐ KÖNYV MEGNYITÁSA",
      meta: "SZEMÉLYRE SZABVA / 02",
    }
  }

  if (!hasFirstBook && !hasSecondBook && account.orders.length === 0) {
    return {
      eyebrow: "ELSŐ BELÉPÉSI PONT",
      title: "MÉG NINCS NYOMOD A RENDSZERBEN",
      body: "A hálózatot már látod. Egy könyv, egy megtalálás vagy egy közösségi jelenlét után a főoldal is elkezd rólad szólni.",
      href: "/konyv",
      cta: "BELÉPEK A KÖNYVNÉL",
      meta: "SZEMÉLYRE SZABVA / 03",
    }
  }

  if (!hasMerch) {
    return {
      eyebrow: "KÖVETKEZŐ LÉPÉS",
      title: "MÉG HIÁNYZIK EGY FIZIKAI NYOM",
      body: "A könyvek mellett tárgyak is bekerülhetnek a profilodba. Ezekből lesz a saját kis archívumod.",
      href: "/shop",
      cta: "BOLT MEGNYITÁSA",
      meta: "SZEMÉLYRE SZABVA / 04",
    }
  }

  if (!hasMecenas) {
    return {
      eyebrow: "KÖVETKEZŐ LÉPÉS",
      title: "KÖZVETLENÜL IS TÁMOGATHATOD A PROJEKTET",
      body: "Ha nem csak nézed, hanem életben is tartanád ezt az egészet, van külön támogatói csatorna.",
      href: "/tamogatas",
      cta: "CREW / TÁMOGATÁS",
      meta: "SZEMÉLYRE SZABVA / 05",
    }
  }

  if (!hasNetworkActivity) {
    return {
      eyebrow: "KÖVETKEZŐ LÉPÉS",
      title: "LÉPJ BE A HÁLÓZATBA",
      body: "Most már nem vásárolni kell. Találj meg egy pontot, hagyj nyomot, vagy figyeld meg, mi történik körülötted.",
      href: "/halozat",
      cta: "HÁLÓZAT MEGNYITÁSA",
      meta: "SZEMÉLYRE SZABVA / 06",
    }
  }

  return {
    eyebrow: "A TE RÉTEGED",
    title: "MOST MÁR VAN NYOMOD",
    body: "A profilodban már történik valami. Menj vissza a hálózatba, és nézd meg, mi változott.",
    href: "/halozat",
    cta: "VISSZA A HÁLÓZATBA",
    meta: "SZEMÉLYRE SZABVA / 07",
  }
}

function BadgeRail({ account }: { account: DashboardAccountResponse }) {
  const earned = account.badges

  return (
    <div className="flex flex-wrap gap-2">
      {earned.length > 0 ? (
        earned.map((badge) => (
          <span
            key={badge.code}
            className="border border-cyan-400/25 bg-cyan-400/[0.025] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200"
          >
            {badge.name}
          </span>
        ))
      ) : (
        <span className="border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          MÉG NINCS JELVÉNY
        </span>
      )}
    </div>
  )
}

function GuestHome() {
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    if (googleLoading) return

    setGoogleLoading(true)

    try {
      const supabase = createClient()
      persistAuthReturnTarget("/")
      const redirectTo = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      })

      if (error) {
        console.error("[homepage] google login failed", error)
        setGoogleLoading(false)
      }
    } catch (error) {
      console.error("[homepage] google login exception", error)
      setGoogleLoading(false)
    }
  }

  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-6xl pb-24 pt-24">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(163,230,53,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(163,230,53,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(163,230,53,0.07),transparent_34%)]" />
          </div>

          <div className="relative p-7 sm:p-12">
            <p
              className="max-w-3xl text-right text-[23px] font-normal italic leading-relaxed tracking-tight text-zinc-300 sm:text-[20px]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."<br/>
            </p>
            <p className="mt-4 text-right text-lg italic tracking-wide text-zinc-600">
              — Író Úr
            </p>

            <div className="mt-8 flex gap-3 sm:max-w-2xl sm:ml-auto">
              <Link
                href="/auth?from=%2F&next=%2F"
                className="inline-flex min-h-12 flex-1 items-center justify-center border border-lime-400/45 bg-lime-400/[0.035] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200 transition-all hover:border-lime-300 hover:bg-lime-400/[0.08] hover:text-white"
              >
                BELÉPÉS
              </Link>

              <button
                type="button"
                onClick={() => void handleGoogleLogin()}
                disabled={googleLoading}
                className="inline-flex min-h-12 flex-1 items-center justify-center border border-zinc-700 bg-zinc-950 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300 transition-all hover:border-lime-400/60 hover:bg-zinc-900 hover:text-lime-100 disabled:cursor-wait disabled:opacity-50"
              >
                {googleLoading ? "GOOGLE..." : "GOOGLE LOGIN"}
              </button>
            </div>
          </div>
        </section>
        <section>
          <video
                className="rounded-3xl relative left-1/2 mt-0 block w-screen -translate-x-1/2"
                src="/videos/dd2.mp4"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                preload="metadata"
          />
        </section>

      </div>
    </>
  )
}

function MemberHome({
  account,
  feed,
}: {
  account: DashboardAccountResponse
  feed: FeedPost[]
}) {
  const nextMove = useMemo(() => getNextMove(account), [account])
  const name = account.user.nickname?.trim() || account.user.email || "NODE"
  const firstName = name.includes("@") ? name.split("@")[0] : name

  const stats = [
    ["JELVÉNY", String(account.badges.length)],
    ["RENDELÉS", String(account.orders.length)],
    ["MEGTALÁLÁS", String(account.network.claims.accepted)],
    ["AKTÍV PONT", String(account.network.spots.active)],
  ]

  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-8">
        <section className="border-b border-zinc-800 pb-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-600">
                SZEMÉLYES CSATORNA / ONLINE
              </p>
              <h1
                className="mt-2 text-4xl tracking-tight text-zinc-100 sm:text-6xl"
                style={{ fontFamily: "var(--font-heading), serif" }}
              >
                SZIA, {firstName}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Innentől nem ugyanazt az oldalt látod, mint aki csak benézett.
                Ez a te réteged.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border-b border-zinc-700 pb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:border-lime-300 hover:text-lime-200"
            >
              SAJÁT FIÓK <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <section className="grid gap-4 py-7 lg:grid-cols-[1.35fr_0.65fr]">
          <article className="relative overflow-hidden border border-lime-400/30 bg-lime-400/[0.025] p-6 sm:p-8">
            <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 bg-[radial-gradient(circle_at_100%_0%,rgba(163,230,53,0.12),transparent_68%)]" />

            <div className="relative">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/70">
                  {nextMove.eyebrow}
                </p>
                <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-700">
                  {nextMove.meta}
                </span>
              </div>

              <h2
                className="mt-4 max-w-3xl text-3xl leading-tight text-zinc-100 sm:text-5xl"
                style={{ fontFamily: "var(--font-heading), serif" }}
              >
                {nextMove.title}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
                {nextMove.body}
              </p>

              <Link
                href={nextMove.href}
                className="mt-7 inline-flex items-center gap-3 border border-lime-300/45 bg-black/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-200 transition-colors hover:border-lime-200 hover:bg-lime-400/[0.06] hover:text-white"
              >
                {nextMove.cta}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          <article className="border border-zinc-900 bg-black/30 p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-zinc-600">
              <Sparkles className="h-3.5 w-3.5" />
              A TE RÉTEGED
            </div>

            <div className="mt-6 grid grid-cols-2 gap-px border border-zinc-900 bg-zinc-900">
              {stats.map(([label, value]) => (
                <div key={label} className="bg-black p-4">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-700">{label}</p>
                  <p className="mt-2 text-3xl text-zinc-100">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <p className="mb-3 text-[9px] uppercase tracking-[0.2em] text-zinc-700">JELVÉNYEK</p>
              <BadgeRail account={account} />
            </div>
          </article>
        </section>

        <section className="grid gap-4 border-t border-zinc-800 pt-7 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="border border-zinc-900 bg-black/25 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-600">HÁLÓZAT / MOST</p>
                <h2
                  className="mt-2 text-2xl text-zinc-200"
                  style={{ fontFamily: "var(--font-heading), serif" }}
                >
                  AMI ÉPP TÖRTÉNIK
                </h2>
              </div>
              <Users className="h-4 w-4 text-zinc-700" />
            </div>

            <div className="mt-5 space-y-3">
              {feed.length > 0 ? (
                feed.slice(0, 5).map((post) => (
                  <div
                    key={post.id}
                    className="border-b border-zinc-900 pb-3 last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-4 text-[9px] uppercase tracking-[0.18em] text-zinc-700">
                      <span>{post.nickname || "ISMERETLEN NYÚL"}</span>
                      <span>{formatRelativeTime(post.created_at)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{post.body}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-zinc-600">
                  A feed most csendben van.
                </p>
              )}
            </div>

            <Link
              href="/halozat"
              className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-lime-200/80 transition-colors hover:text-lime-100"
            >
              HÁLÓZAT MEGNYITÁSA <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </article>

          <article className="border border-zinc-900 bg-black/25 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-600">AKTÍV RÉTEGEK</p>
                <h2
                  className="mt-2 text-2xl text-zinc-200"
                  style={{ fontFamily: "var(--font-heading), serif" }}
                >
                  NEM CSAK A BOLT LÉTEZIK
                </h2>
              </div>
              <Radio className="h-4 w-4 text-zinc-700" />
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/halozat"
                className="group flex items-center justify-between border border-zinc-900 bg-black/30 p-4 transition-colors hover:border-lime-400/30"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-700">01 / HÁLÓZAT</p>
                  <p className="mt-1 text-sm text-zinc-300">Pontok, megtalálások, tagok.</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-lime-200" />
              </Link>

              <Link
                href="/inbox"
                className="group flex items-center justify-between border border-zinc-900 bg-black/30 p-4 transition-colors hover:border-lime-400/30"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-700">02 / INBOX</p>
                  <p className="mt-1 text-sm text-zinc-300">Privát üzenetek és rendszerjelzések.</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-lime-200" />
              </Link>

              <Link
                href="/dashboard"
                className="group flex items-center justify-between border border-zinc-900 bg-black/30 p-4 transition-colors hover:border-lime-400/30"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-700">03 / SAJÁT ARCHÍVUM</p>
                  <p className="mt-1 text-sm text-zinc-300">Rendelések, jelvények, saját nyomok.</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-lime-200" />
              </Link>
            </div>
          </article>
        </section>

        <footer className="mt-10 flex flex-col gap-3 border-t border-zinc-900 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9px] uppercase tracking-[0.24em] text-zinc-800">
            VÁLLALHATATLAN / PERSONAL CHANNEL
          </p>
          <p className="text-[9px] uppercase tracking-[0.24em] text-zinc-800">
            {account.circle.label}
          </p>
        </footer>
      </div>
    </>
  )
}

export default function HomepageExperience() {
  const { session, loading } = useSessionGuard() as {
    session: SessionShape | null
    loading: boolean
  }

  const [account, setAccount] = useState<DashboardAccountResponse | null>(null)
  const [feed, setFeed] = useState<FeedPost[]>([])
  const [loadingAccount, setLoadingAccount] = useState(false)

  useEffect(() => {
    if (loading || !session?.access_token) {
      setAccount(null)
      setLoadingAccount(false)
      return
    }

    const controller = new AbortController()
    setLoadingAccount(true)

    const token = session.access_token

    Promise.all([
      fetch("/api/user/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error(`account_${response.status}`)
        return response.json() as Promise<{ ok?: boolean; account?: DashboardAccountResponse }>
      }),
      fetch("/api/feed?limit=8", {
        cache: "no-store",
        signal: controller.signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error(`feed_${response.status}`)
        return response.json() as Promise<{ ok?: boolean; posts?: FeedPost[] }>
      }),
    ])
      .then(([accountPayload, feedPayload]) => {
        if (!accountPayload?.ok || !accountPayload.account) {
          throw new Error("account_missing")
        }

        setAccount(accountPayload.account)
        setFeed(Array.isArray(feedPayload.posts) ? feedPayload.posts : [])
      })
      .catch((error) => {
        if (error?.name === "AbortError") return
        console.error("[homepage] personalized load failed", error)
        setAccount(null)
        setFeed([])
      })
      .finally(() => setLoadingAccount(false))

    return () => controller.abort()
  }, [loading, session?.access_token])

  return (
    <MainContent fullWidth>
      {!loading && !session ? <GuestHome /> : null}

      {!loading && session && account ? (
        <MemberHome account={account} feed={feed} />
      ) : null}

      {loading || (session && loadingAccount) ? (
        <>
          <SiteHeader />
          <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-28 sm:px-8">
            <div className="border border-zinc-900 bg-black/30 p-8">
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-700">
                CHANNEL INITIALIZING
              </p>
              <p className="mt-3 text-xl text-zinc-400">
                A személyes réteg betöltése…
              </p>
            </div>
          </div>
        </>
      ) : null}
    </MainContent>
  )
}

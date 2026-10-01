"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BookMarked, BookOpen, Crown, HeartHandshake, ShoppingBag } from "lucide-react"
import Reviews from "@/components/Reviews"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
import MainContent from "@/components/MainContent"
import { useSessionGuard } from "@/hooks/useSessionGuard"
import type { DashboardAccountResponse } from "@/types/dashboard"

type SessionShape = {
  access_token?: string
  user?: {
    email?: string | null
  }
}

function getPersonalGreeting(
  account: DashboardAccountResponse,
  firstName: string,
  hour: number,
) {
  const lastActivityAt = account.user.last_activity_at

  if (lastActivityAt) {
    const elapsedDays = Math.floor(
      Math.max(0, Date.now() - new Date(lastActivityAt).getTime()) / 86400000,
    )

    if (elapsedDays >= 8) {
      return `Szia ${firstName}, több mint egy hete nem láttam új nyomot tőled. Minden oké?`
    }
  }

  if (hour >= 0 && hour < 6) {
    return `Hát te mit csinálsz ilyen késői órán, ${firstName}?`
  }

  if (hour >= 6 && hour < 11) {
    return `Jó reggelt, ${firstName}.`
  }

  if (hour >= 11 && hour < 18) {
    return `Szia ${firstName}.`
  }

  return `Szia ${firstName}, hogy telt a napod?`
}

function getPersonalContent(account: DashboardAccountResponse) {
  const badgeCodes = new Set(account.badges.map((badge) => badge.code))
  const hasFirstBook = badgeCodes.has("first_book")
  const hasSecondBook = badgeCodes.has("second_book")
  const hasMerch = badgeCodes.has("merch")
  const hasNetworkActivity =
    account.network.claims.accepted > 0 ||
    account.network.spots.active > 0

  if (hasFirstBook && !hasSecondBook) {
    return {
      eyebrow: "EZ MOST NEKED SZÓL",
      title: "A II. KÖTET MÉG HIÁNYZIK",
      body: "Az első már nálad van. A második kötet itt vár a következő lépésre.",
      href: "/konyv-2",
      cta: "MEGNÉZEM",
    }
  }

  if (!hasMerch) {
    return {
      eyebrow: "MÉG EGY DOLOG",
      title: "MÉG NINCS MERCHED.",
      body: "Nézz körül a tárgyak között. Valami kézzel fogható is bekerülhet a saját rétegedbe.",
      href: "/shop",
      cta: "KÖRÜLNÉZEK",
    }
  }

  if (!hasNetworkActivity) {
    return {
      eyebrow: "MOST MÁR TE JÖSSZ",
      title: "HAGYJ EGY NYOMOT",
      body: "A hálózat akkor kezd igazán élni, amikor te is bekerülsz a történetbe.",
      href: "/halozat",
      cta: "HÁLÓZAT",
    }
  }

  return {
    eyebrow: "KÖRÜLÖTTED TÖRTÉNIK",
    title: "NÉZZ KÖRÜL",
    body: "Van már nyomod a rendszerben. Nézd meg, merre mozdult tovább a hálózat.",
    href: "/halozat",
    cta: "MEGNYITOM",
  }
}

// Homepage guest + badge components restored.
const BADGE_ICONS = {
  first_book: BookOpen,
  second_book: BookMarked,
  mecenas: HeartHandshake,
  founder: Crown,
  merch: ShoppingBag,
} as const

function BadgeRail({ account }: { account: DashboardAccountResponse }) {
  if (account.badges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-3">
      {account.badges.map((badge) => {
        const Icon = BADGE_ICONS[badge.code]
        return (
          <span
            key={badge.code}
            title={badge.description}
            aria-label={badge.name}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-lime-300/40 hover:text-lime-200"
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
        )
      })}
    </div>
  )
}

function MemberHome({
  account,
}: {
  account: DashboardAccountResponse
}) {
  const name = account.user.nickname?.trim() || account.user.email || "NODE"
  const firstName = name.includes("@") ? name.split("@")[0] : name
  const [localHour, setLocalHour] = useState<number | null>(null)

  useEffect(() => {
    setLocalHour(new Date().getHours())
  }, [])

  const greeting = useMemo(
    () =>
      localHour === null
        ? `Szia ${firstName}.`
        : getPersonalGreeting(account, firstName, localHour),
    [account, firstName, localHour],
  )
  const personalContent = useMemo(
    () => getPersonalContent(account),
    [account],
  )

  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full max-w-5xl px-5 pb-28 pt-28 sm:px-8 sm:pb-36 sm:pt-32">
        <section className="min-h-[58vh] border-b border-zinc-900">
          <div className="flex min-h-[58vh] flex-col justify-center py-20 sm:py-28">
            <p
              className="max-w-4xl text-4xl leading-[1.12] tracking-tight text-zinc-100 sm:text-6xl lg:text-[5.25rem]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {greeting}
            </p>

            <div className="mt-16 max-w-2xl sm:mt-20">
              <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">
                {personalContent.eyebrow}
              </p>

              <h2
                className="mt-4 text-3xl leading-tight text-zinc-100 sm:text-5xl"
                style={{ fontFamily: "var(--font-heading), serif" }}
              >
                {personalContent.title}
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-500 sm:text-lg">
                {personalContent.body}
              </p>

              <Link
                href={personalContent.href}
                className="mt-8 inline-flex items-center gap-3 rounded-md border border-lime-400/40 bg-lime-400/[0.025] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200 transition-colors hover:border-lime-300 hover:bg-lime-400/[0.07] hover:text-white"
              >
                {personalContent.cta}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {account.badges.length > 0 ? (
          <section className="border-b border-zinc-900 py-16 sm:py-20">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-700">
              AMIT EDDIG ÖSSZESZEDTÉL
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {account.badges.map((badge) => {
                const Icon = {
                  first_book: BookOpen,
                  second_book: BookMarked,
                  mecenas: HeartHandshake,
                  founder: Crown,
                  merch: ShoppingBag,
                }[badge.code]

                return (
                  <span
                    key={badge.code}
                    title={badge.description}
                    aria-label={badge.name}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-lime-300/40 hover:text-lime-200"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </span>
                )
              })}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-4 border-b border-zinc-900 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <p className="max-w-xl text-sm leading-6 text-zinc-600">
            A saját réteged a dashboardban és a hálózatban folytatódik.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-lime-200"
          >
            SAJÁT FIÓK <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      </div>

      <Footer />
    </>
  )
}

export default function HomepageExperience() {
  const { session, loading } = useSessionGuard() as {
    session: SessionShape | null
    loading: boolean
  }

  const [account, setAccount] = useState<DashboardAccountResponse | null>(null)
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
    ])
      .then(([accountPayload]) => {
        if (!accountPayload?.ok || !accountPayload.account) {
          throw new Error("account_missing")
        }

        setAccount(accountPayload.account)
      })
      .catch((error) => {
        if (error?.name === "AbortError") return
        console.error("[homepage] personalized load failed", error)
        setAccount(null)
      })
      .finally(() => setLoadingAccount(false))

    return () => controller.abort()
  }, [loading, session?.access_token])

  return (
    <MainContent fullWidth>
      {!loading && !session ? (
        <>
          <SiteHeader />
          <div className="mx-auto w-full pb-28 pt-24 sm:pb-32 sm:pt-28">
            <section className="mx-auto w-full max-w-5xl px-5 sm:px-8">
              <div className="ml-auto max-w-3xl">
                <p
                  className="text-right text-[21px] italic leading-[1.7] text-zinc-300 sm:text-[23px]"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."
                </p>
                <p className="mt-5 text-right text-lg italic text-zinc-600">— Író Úr</p>
                <div className="mt-14">
                  <p className="text-right text-[11px] uppercase tracking-[0.08em] text-zinc-400 sm:text-[12px]">
                    Ez egy privát, zártkörű klub. Jelentkezz be.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Link
                      href="/auth?from=%2Ffooldal-2&next=%2Ffooldal-2"
                      className="inline-flex min-h-12 min-w-40 items-center justify-center rounded-md border border-lime-400/45 bg-lime-400/[0.035] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200"
                    >
                      BELÉPÉS
                    </Link>
                    <Link
                      href="/auth?from=%2Ffooldal-2&next=%2Ffooldal-2&provider=google"
                      className="inline-flex min-h-12 min-w-48 items-center justify-center gap-2.5 rounded-md border border-zinc-700 bg-zinc-950 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current text-zinc-200">
                        <path d="M21.35 11.1h-9.18v2.98h5.62c-.24 1.56-1.84 4.58-5.62 4.58-3.38 0-6.14-2.8-6.14-6.26s2.76-6.26 6.14-6.26c1.92 0 3.21.82 3.95 1.53l2.14-2.08C16.88 4.3 14.96 3.3 12.17 3.3 7.36 3.3 3.45 7.2 3.45 12s3.91 8.7 8.72 8.7c5.04 0 8.39-3.54 8.39-8.52 0-.57-.06-.99-.13-1.08z" />
                      </svg>
                      GOOGLE LOGIN
                    </Link>
                  </div>
                </div>
              </div>
            </section>
            <section className="mt-10 w-full sm:mt-14">
              <video
                className="relative left-1/2 block aspect-video w-screen -translate-x-1/2 object-cover"
                src="/videos/dd2.mp4"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                preload="metadata"
              />
            </section>
            <section className="mx-auto mt-20 w-full max-w-5xl px-5 sm:mt-28 sm:px-8">
              <Reviews />
            </section>
          </div>
          <Footer />
        </>
      ) : null}

      {!loading && session && account ? (
        <MemberHome account={account} />
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

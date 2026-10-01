"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight, BookMarked, BookOpen, Crown, HeartHandshake, ShoppingBag } from "lucide-react"
import { createClient } from "@/lib/browser"
import { persistAuthReturnTarget } from "@/lib/authRedirect"
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

function getPersonalGreeting(account: DashboardAccountResponse, firstName: string) {
  const hour = new Date().getHours()
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
      title: "VAN MÁR KÖNYVED. TÁRGYAD IS LEHET.",
      body: "Nézz körül a merch között. A profilodhoz ez is hozzáíródik.",
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

function MemberHome({
  account,
}: {
  account: DashboardAccountResponse
}) {
  const name = account.user.nickname?.trim() || account.user.email || "NODE"
  const firstName = name.includes("@") ? name.split("@")[0] : name
  const greeting = useMemo(
    () => getPersonalGreeting(account, firstName),
    [account, firstName],
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
            <div className="mt-6">
              <BadgeRail account={account} />
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
      {!loading && !session ? <GuestHome /> : null}

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

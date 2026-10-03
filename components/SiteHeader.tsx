"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BellIcon, ArrowUpRight, Menu } from "lucide-react"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTrigger } from "@/components/ui/sheet"
import { createClient } from "@/lib/browser"
import { getUnreadSnapshot, subscribeUnread } from "@/lib/notifications/unreadStore"
import UserAvatarWithBadges from "@/components/UserAvatarWithBadges"

const menuSections = [
  {
    label: "KÖNYVEK",
    items: [
      {
        href: "/konyv",
        label: "A MÁSODIK KÖNYV",
        description: "A könyvben áll össze a történet. Szerezz egyet a 100-ból.",
      },
      {
        href: "/reader",
        label: "AZ ELSŐ KÖNYV",
        description: "Itt olvashatod az első könyvet online.",
      },
    ],
  },
  {
    label: "FELFEDEZÉS",
    items: [
      {
        href: "/halozat",
        label: "HÁLÓZAT",
        description: "Mi sem tudjuk mi ez.",
      },
      {
        href: "/lab",
        label: "LABOR",
        description: "Szoftver és neuromarketing.",
      },
    ],
  },
  {
    label: "CUCCOK",
    items: [
      {
        href: "/shop",
        label: "BOLT",
        description: "Saját márkás cuccok.",
      },
      {
        href: "/tamogatas",
        label: "CREW",
        description: "Önts olajat a tűzre!",
      },
    ],
  },
] as const

type AuthUser = {
  id?: string
  email?: string | null
  user_metadata?: {
    avatar_url?: string | null
    picture?: string | null
    full_name?: string | null
    name?: string | null
  }
}

type Badge = {
  code: string
  name?: string | null
}

export default function SiteHeader() {
  const pathname = usePathname()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const loadUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        setUser((session?.user ?? null) as AuthUser | null)
      }
    }

    void loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return
        setUser((session?.user ?? null) as AuthUser | null)
      },
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setBadges([])
      return
    }

    let cancelled = false
    const loadBadges = async () => {
      try {
        const response = await fetch("/api/user/badges", { cache: "no-store" })
        if (!response.ok) return
        const payload = await response.json()
        if (!cancelled) setBadges(Array.isArray(payload?.badges) ? payload.badges : [])
      } catch {
        if (!cancelled) setBadges([])
      }
    }

    void loadBadges()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "NODE"

  const avatarLetter = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    const refreshUnread = () => {
      const snapshot = getUnreadSnapshot()
      const personal = snapshot.sources["personal-notifications"] ?? 0
      const pm = snapshot.sources["personal-pm"] ?? 0
      setUnreadCount(personal + pm)
    }

    refreshUnread()
    return subscribeUnread(refreshUnread)
  }, [])

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 sm:px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        pointerEvents: "auto",
        touchAction: "manipulation",
      }}
    >
      <Link href="/" className="group">
        <h1
          className="text-[22px] font-bold italic text-zinc-100 transition-colors group-hover:text-lime-200"
          style={{ fontFamily: "var(--font-logo)" }}
        >
          {pathname === "/halozat" ? "Hálózat" : "Vállalhatatlan"}
        </h1>
      </Link>

      <div
        className="flex items-center gap-3 sm:gap-4"
        style={{ fontFamily: "var(--font-mono-tech)" }}
      >
        <span className="hidden items-center text-[10px] text-zinc-500 sm:inline-flex">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
          HÁLÓZAT: ONLINE
        </span>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("network-inbox:open"))}
          aria-label="Értesítések megnyitása"
          title="Értesítések"
          className="relative inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-950 text-zinc-300 transition-all hover:border-lime-400/70 hover:bg-lime-400/5 hover:text-lime-200"
        >
          <BellIcon className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-[17px] items-center justify-center rounded-full bg-lime-400 px-1 text-[9px] font-bold leading-[17px] text-black">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        {user ? (
          <Link
            href="/dashboard"
            aria-label="Saját fiók"
            title={badges.some((badge) => badge.code === "founder") ? "Saját fiók · ALAPÍTÓ" : "Saját fiók"}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full transition-all hover:shadow-[0_0_12px_rgba(163,230,53,0.15)]"
          >
            <UserAvatarWithBadges
              avatarUrl={avatarUrl}
              fallback={avatarLetter}
              badges={badges}
              size="md"
            />
            <span
              className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-zinc-950 bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]"
              aria-hidden="true"
            />
          </Link>
        ) : (
          <Link
            href="/auth?from=%2F&next=%2F"
            className="text-[10px] tracking-[0.16em] text-zinc-400 transition-colors hover:text-lime-200"
          >
            LOGIN
          </Link>
        )}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Navigáció megnyitása"
              className="group inline-flex h-10 w-10 items-center justify-center border border-zinc-700 bg-zinc-950 text-zinc-300 transition-all hover:border-lime-400/70 hover:bg-lime-400/5 hover:text-lime-200"
            >
              <Menu className="h-5 w-5 transition-transform group-hover:scale-105" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="z-[100] flex w-[min(25rem,92vw)] flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-[-20px_0_60px_rgba(0,0,0,0.55)]"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(163,230,53,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(163,230,53,0.025)_1px,transparent_1px)] bg-[size:32px_32px]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.06),transparent_35%)]" />
            </div>

            <SheetHeader className="relative border-b border-zinc-800 px-6 pb-5 pt-7 pr-14 text-left">
              <SheetDescription className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                Vállalhatatlan Projekt
              </SheetDescription>
            </SheetHeader>

            <nav
              aria-label="Fő navigáció"
              className="relative flex-1 overflow-y-auto px-4 py-5"
            >
              <div className="space-y-7">
                {menuSections.map((section, sectionIndex) => (
                  <section key={section.label}>
                    <div className="mb-2 px-4 text-[9px] uppercase tracking-[0.28em] text-zinc-600">
                      {section.label}
                    </div>

                    <ul className="space-y-1">
                      {section.items.map((item, itemIndex) => {
                        const active =
                          pathname === item.href ||
                          (item.href !== "/" && pathname.startsWith(item.href + "/"))
                        const number =
                          String(sectionIndex + 1).padStart(2, "0") +
                          "." +
                          String(itemIndex + 1).padStart(2, "0")

                        return (
                          <li key={item.href}>
                            <SheetClose asChild>
                              <Link
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                className={
                                  "group relative block border px-4 py-4 transition-all " +
                                  (active
                                    ? "border-lime-400/35 bg-lime-400/[0.035]"
                                    : "border-transparent hover:border-zinc-700 hover:bg-lime-400/[0.025]")
                                }
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span
                                    className={
                                      "text-sm font-bold tracking-[0.14em] transition-colors " +
                                      (active
                                        ? "text-lime-200"
                                        : "text-zinc-200 group-hover:text-lime-200")
                                    }
                                  >
                                    <span className="mr-3 text-zinc-600 group-hover:text-lime-400/70">
                                      [{number}]
                                    </span>
                                    {item.label}
                                  </span>

                                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-lime-300" />
                                </div>

                                <p className="mt-2 text-[12px] leading-relaxed tracking-[0.04em] text-zinc-600 transition-colors group-hover:text-zinc-400">
                                  {item.description}
                                </p>
                              </Link>
                            </SheetClose>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            </nav>

            <div className="relative border-t border-zinc-800 px-6 py-4">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_7px_rgba(163,230,53,0.7)]" />
                  Hálózat online
                </span>
                <span>Navigation</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useRef, useState } from "react"
import { BookMarked, BookOpen, Check, ChevronDown, Crown, HeartHandshake, LogOut, Pencil, ShoppingBag, X } from "lucide-react"
import { Montserrat } from "next/font/google"
import type { DashboardAccountResponse, DashboardUnifiedOrder } from "@/types/dashboard"
import { createClient } from "@/lib/browser"

const DASHBOARD_BADGE_ICONS = {
  first_book: BookOpen,
  second_book: BookMarked,
  mecenas: HeartHandshake,
  founder: Crown,
  merch: ShoppingBag,
} as const

const heroHeadline = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

type Props = {
  account: DashboardAccountResponse
  token: string | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: "FIZETÉS FOLYAMATBAN",
  paid: "ELFOGADVA",
  ready_to_dispatch: "ÖSSZEKÉSZÍTVE",
  dispatched: "ÚTON VAN",
  fulfilled: "TELJESÍTVE",
  cancelled: "TÖRÖLVE",
  canceled: "TÖRÖLVE",
  payment_failed: "FIZETÉS SIKERTELEN",
}

const CIRCLE_LABELS: Record<DashboardAccountResponse["circle"]["code"], string> = {
  outside: "KERÜLJ BE A KÖRBE!",
  a: "A KÖRHÖZ TARTOZOL",
  inner: "A BELSŐ KÖRHÖZ TARTOZOL",
  core: "A LEGSZŰKEBB BELSŐ KÖRHÖZ TARTOZOL",
}

const formatHuf = (value: number) =>
  new Intl.NumberFormat("hu-HU").format(Math.round(value)) + " Ft"

const formatDate = (value: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ").toUpperCase()
}

const ORDER_LIST_STATUS_LABELS: Record<string, string> = {
  pending: "FOLYAMATBAN",
  paid: "FIZETVE",
  ready_to_dispatch: "ÖSSZEKÉSZÍTVE",
  dispatched: "ÚTON VAN",
  fulfilled: "TELJESÍTVE",
  cancelled: "TÖRÖLVE",
  canceled: "TÖRÖLVE",
  payment_failed: "FIZETÉSI HIBA",
}

function orderListStatusLabel(status: string, received: boolean) {
  if (received) return "ÁTVÉVE"
  return ORDER_LIST_STATUS_LABELS[status] ?? statusLabel(status)
}

function orderListStatusClass(status: string, received: boolean) {
  if (received) return "border-lime-300/30 bg-lime-300/[0.06] text-lime-200"
  if (status === "payment_failed" || status === "cancelled" || status === "canceled") {
    return "border-rose-400/25 bg-rose-400/[0.04] text-rose-300"
  }
  if (status === "pending") return "border-amber-300/25 bg-amber-300/[0.04] text-amber-200"
  return "border-lime-400/20 bg-lime-400/[0.04] text-lime-200"
}

function orderRef(id: string) {
  return id.replaceAll("-", "").slice(0, 8).toUpperCase()
}

function orderNeedsPriority(order: DashboardUnifiedOrder) {
  return order.priority && !["fulfilled", "cancelled", "canceled"].includes(order.status)
}

function isProcessingStatus(status: string) {
  return ["paid", "ready_to_dispatch", "dispatched"].includes(status)
}

function sectionEyebrow(label: string) {
  return (
    <p
      className="text-[11px] uppercase tracking-[0.32em] text-zinc-500"
      style={{ fontFamily: "var(--font-mono-tech)" }}
    >
      {label}
    </p>
  )
}

export default function UserAccountDashboard({ account, token }: Props) {
  const router = useRouter()
  const { user, circle, orders, purchases, network } = account
  const badges = account.badges ?? []
  const [nickname, setNickname] = useState(user.nickname ?? "")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const nicknameInputRef = useRef<HTMLInputElement>(null)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [receivingOrderKey, setReceivingOrderKey] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [receivedAtByOrderKey, setReceivedAtByOrderKey] = useState<Record<string, string>>({})
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  const displayName = nickname.trim() || user.email || "NODE"
  const avatarLetter = displayName.charAt(0).toUpperCase() || "N"

  const handleLogout = async () => {
    setLoggingOut(true)
    setLogoutError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: "local" })
      if (error) throw error
      router.replace("/")
    } catch (error) {
      console.error("[dashboard] logout error", error)
      setLogoutError("A kilépés nem sikerült.")
      setLoggingOut(false)
    }
  }

  const openOrder = useMemo(
    () => orders.find((order) => order.id === openOrderId) ?? null,
    [openOrderId, orders],
  )

  const startNicknameEdit = () => {
    setNicknameError(null)
    setSaveState("idle")
    setEditingNickname(true)
    window.setTimeout(() => nicknameInputRef.current?.focus(), 0)
  }

  const cancelNicknameEdit = () => {
    setNickname(user.nickname ?? "")
    setNicknameError(null)
    setSaveState("idle")
    setEditingNickname(false)
  }

  const saveNickname = async () => {
    setSaveState("saving")
    setNicknameError(null)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ nickname }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "A becenév mentése nem sikerült.")
      }

      setNickname(payload?.profile?.nickname ?? nickname.trim())
      setSaveState("saved")
      setEditingNickname(false)
    } catch (error) {
      setSaveState("error")
      setNicknameError(
        error instanceof Error
          ? error.message
          : "A becenév mentése nem sikerült.",
      )
    } finally {
      window.setTimeout(() => setSaveState("idle"), 1800)
    }
  }

  const getReceivedAt = (order: DashboardUnifiedOrder) =>
    receivedAtByOrderKey[`${order.source}-${order.id}`] ?? order.user_received_at

  const markOrderReceived = async (order: DashboardUnifiedOrder) => {
    const orderKey = `${order.source}-${order.id}`
    setReceivingOrderKey(orderKey)
    setReceiptError(null)

    try {
      const response = await fetch("/api/user/orders/received", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          source: order.source,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "Az átvétel visszaigazolása nem sikerült.")
      }

      const receivedAt = payload?.user_received_at ?? new Date().toISOString()
      setReceivedAtByOrderKey((current) => ({
        ...current,
        [orderKey]: receivedAt,
      }))
      setReceivingOrderKey(null)
    } catch (error) {
      setReceiptError(
        error instanceof Error
          ? error.message
          : "Az átvétel visszaigazolása nem sikerült.",
      )
      setReceivingOrderKey(null)
    }
  }

  const totalNetworkActivity =
    network.claims.accepted + network.spots.active

  return (
    <main className="min-h-screen bg-[#010101] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.1]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(163,230,53,0.05)_0,rgba(163,230,53,0.05)_1px,transparent_1px,transparent_24px)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-8">
        <header>
          <div className="border-y border-zinc-800/80 py-6 sm:py-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-center lg:gap-10">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="relative h-[92px] w-[92px] shrink-0 rounded-full border border-zinc-700/90 bg-zinc-950 p-1 shadow-[inset_0_0_0_1px_rgba(163,230,53,0.04)] sm:h-[104px] sm:w-[104px]">
                  <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 text-2xl font-black text-lime-200">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="h-full w-full object-cover grayscale transition-all duration-300 hover:grayscale-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                  <span
                    className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#010101] bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.65)]"
                    aria-label="Aktív"
                    title="Aktív"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  {sectionEyebrow("SAJÁT FIÓK")}
                  {editingNickname ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          ref={(node) => {
                            nicknameInputRef.current = node
                          }}
                          value={nickname}
                          onChange={(event) => {
                            setNickname(event.target.value)
                            setSaveState("idle")
                            setNicknameError(null)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              void saveNickname()
                            }
                            if (event.key === "Escape") {
                              event.preventDefault()
                              cancelNicknameEdit()
                            }
                          }}
                          maxLength={20}
                          autoComplete="nickname"
                          aria-label="Becenév"
                          className="w-full max-w-[420px] border-0 border-b border-lime-400/60 bg-transparent px-0 py-1 text-2xl font-normal tracking-tight text-zinc-50 outline-none placeholder:text-zinc-700 sm:text-4xl"
                          style={{ fontFamily: "var(--font-heading), serif" }}
                          placeholder="BECENÉV"
                        />
                        <button
                          type="button"
                          onClick={() => void saveNickname()}
                          disabled={saveState === "saving"}
                          aria-label="Becenév mentése"
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-lime-200 transition-colors hover:text-white disabled:opacity-40"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelNicknameEdit}
                          disabled={saveState === "saving"}
                          aria-label="Szerkesztés megszakítása"
                          className="flex h-8 w-8 shrink-0 items-center justify-center text-zinc-600 transition-colors hover:text-zinc-200 disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {nicknameError && (
                        <p
                          className="mt-2 text-[11px] uppercase tracking-[0.16em] text-rose-400"
                          style={{ fontFamily: "var(--font-mono-tech)" }}
                        >
                          {nicknameError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startNicknameEdit}
                      className="group mt-1 flex max-w-full items-center gap-2.5 text-left"
                      aria-label="Becenév szerkesztése"
                    >
                      <h1 className={heroHeadline.className + " truncate text-2xl tracking-tight text-zinc-50 sm:text-4xl"}>
                        {displayName}
                      </h1>
                      <Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-700 transition-colors group-hover:text-lime-200" />
                    </button>
                  )}

                  {!editingNickname && saveState === "saved" && (
                    <p
                      className="mt-1 text-[10px] uppercase tracking-[0.22em] text-lime-200"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      MENTVE
                    </p>
                  )}

                  <p
                    className="mt-2 truncate text-[12px] text-zinc-500 sm:text-sm"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {user.email ?? "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p
                      className="text-[9px] uppercase tracking-[0.08em] text-zinc-700"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      NODE · {user.id.slice(0, 8).toUpperCase()}
                    </p>
                    <span className="h-1 w-1 rounded-full bg-zinc-800" aria-hidden="true" />
                    <p
                      className="text-[9px] uppercase tracking-[0.08em] text-zinc-700"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      CSATLAKOZÁS · {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:items-end">
                <div className="w-full lg:max-w-[320px]">
                  <p
                    className="mb-2 text-[9px] uppercase tracking-[0.28em] text-zinc-600 lg:text-right"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    AKTÍV STÁTUSZ
                  </p>

                  {circle.code === "outside" ? (
                    <Link
                      href="/konyv"
                      className="group flex items-center justify-between gap-3 border border-lime-400/25 bg-lime-400/[0.025] px-3.5 py-3 transition-colors hover:border-lime-300/60 hover:bg-lime-400/[0.05]"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-lime-200" aria-hidden="true">✪</span>
                        <span className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-lime-200">
                          {CIRCLE_LABELS[circle.code]}
                        </span>
                      </span>
                      <span className="text-[11px] text-zinc-600 transition-colors group-hover:text-lime-200" aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 border border-lime-400/25 bg-lime-400/[0.025] px-3.5 py-3">
                      <span className="text-lime-200" aria-hidden="true">✪</span>
                      <span className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-lime-200">
                        {CIRCLE_LABELS[circle.code]}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex w-full items-center justify-between gap-4 lg:w-auto lg:min-w-[320px] lg:justify-end">
                  <p
                    className="text-[9px] uppercase tracking-[0.18em] text-zinc-700"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    BEJELENTKEZVE
                  </p>

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={loggingOut}
                    className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 transition-all hover:border-zinc-600 hover:bg-zinc-900 hover:text-lime-200 disabled:cursor-wait disabled:opacity-50"
                  >
                    <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                    {loggingOut ? "KILÉPÉS…" : "KILÉPÉS"}
                  </button>
                </div>

                {logoutError && (
                  <p
                    className="w-full text-[10px] uppercase tracking-[0.14em] text-rose-400 lg:max-w-[320px] lg:text-right"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {logoutError}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="py-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-row items-center gap-6 border-b border-t border-zinc-700 pt-4 pb-3">
              {sectionEyebrow("JELVÉNYEID")} 
              <span className="text-[14px] italic text-zinc-600">Amiket eddig szereztél</span>
            </div>     
          </div>

          {badges.length === 0 ? (
            <div className="mt-6 max-w-2xl">
              <p className="text-base leading-7 text-zinc-500">
                Még nincs megszerzett jelvényed. Cserébe közösségi aktivitásodért, vásárlásodért vagy támogatásodért - jelvényeket kapsz. Van aki már mindet összegyűjtötte.
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block border-b border-lime-400/60 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-200 transition-colors hover:border-lime-200 hover:text-white"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                NÉZD MEG A SHOPOT →
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-5">
              {badges.map((badge) => (
                <div
                  key={badge.code}
                  title={badge.description}
                  className="group inline-flex items-center gap-3"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-lime-400/35 outline-offset-2 outline-lime-300/10 bg-lime-400/[0.03] text-lime-200 transition-colors group-hover:border-lime-300/70 group-hover:bg-lime-400/[0.08]">
                    {(() => {
                      const Icon = DASHBOARD_BADGE_ICONS[badge.code as keyof typeof DASHBOARD_BADGE_ICONS]
                      return Icon ? <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /> : null
                    })()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.08em] text-lime-100/70 sm:text-base">
                      {badge.name}
                    </p>
                    <p
                      className="mt-0.5 text-[13px] uppercase tracking-[0.12em] text-zinc-600"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {badge.earnedAt ? formatDate(badge.earnedAt) : "MEGSZEREZVE"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>


        {orders.some(orderNeedsPriority) && (
          <section className="border-b border-zinc-800/80 py-8">
            <div className="flex items-start gap-4">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.65)]" />
              <div>
                {sectionEyebrow("II. KÖNYV · ELSŐ KISZOLGÁLÁS")}
                <p className="mt-2 text-base leading-7 text-zinc-300 sm:text-lg">
                  A korábbi II. könyves rendelésedet nyilvántartjuk, és az első kiszolgálási körben szerepel.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="border-b border-zinc-800/80 py-8">
          <div className="flex items-center justify-between border-y border-zinc-800/80 py-3.5">
            {sectionEyebrow("RENDELÉSEID")}
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {String(orders.length).padStart(2, "0")} RENDELÉS
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="py-10">
              <p className="text-base text-zinc-500">
                Még nem rendeltél semmit :(
              </p>
              <Link
                href="/shop"
                className="mt-4 inline-block border-b border-lime-400/60 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-200 transition-colors hover:border-lime-200 hover:text-white"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                IRÁNY A SHOP →
              </Link>
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/45">
              <div className="hidden border-b border-zinc-900 px-5 py-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-6">
                <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  RENDELÉS
                </p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  STÁTUSZ
                </p>
                <p className="text-right text-[9px] uppercase tracking-[0.22em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  ÖSSZEG
                </p>
              </div>

              <div className="divide-y divide-zinc-900/90">
                {orders.map((order) => {
                  const isOpen = openOrderId === order.id
                  const receivedAt = getReceivedAt(order)
                  const received = Boolean(receivedAt)
                  const processing = !received && isProcessingStatus(order.status)
                  const priority = orderNeedsPriority(order)
                  const orderKey = order.source + "-" + order.id
                  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0)

                  return (
                    <article
                      key={orderKey}
                      className="px-4 py-4 transition-colors hover:bg-white/[0.015] sm:px-5"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={
                            "mt-0.5 h-2 w-2 shrink-0 rounded-full " +
                            (received
                              ? "bg-lime-300 shadow-[0_0_7px_rgba(163,230,53,0.35)]"
                              : order.status === "fulfilled"
                                ? "bg-zinc-600"
                                : "bg-lime-400 shadow-[0_0_7px_rgba(163,230,53,0.35)]")
                          }
                          aria-hidden="true"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h3 className={heroHeadline.className + " truncate text-sm text-zinc-100 sm:text-[15px]"}>
                              {order.label}
                            </h3>
                            <span
                              className="shrink-0 rounded-full border border-zinc-800 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              {order.source === "shop" ? "MERCH" : "KÖNYV"}
                            </span>
                            {priority && (
                              <span
                                className="shrink-0 rounded-full border border-lime-400/20 bg-lime-400/[0.035] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-lime-200/70"
                                style={{ fontFamily: "var(--font-mono-tech)" }}
                              >
                                EXPRESSZ
                              </span>
                            )}
                          </div>

                          <p
                            className="mt-1.5 truncate text-[10px] uppercase tracking-[0.16em] text-zinc-600"
                            style={{ fontFamily: "var(--font-mono-tech)" }}
                          >
                            {formatDate(order.created_at)} · #{orderRef(order.id)} · {itemCount} DB
                          </p>

                          {received && (
                            <p
                              className="mt-1 text-[10px] uppercase tracking-[0.14em] text-lime-200/55"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              ÁTVÉTEL · {formatDate(receivedAt)}
                            </p>
                          )}
                        </div>

                        <div className="hidden shrink-0 items-center gap-3 sm:flex">
                          {processing && (
                            <span
                              className="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-lime-300"
                              aria-hidden="true"
                            />
                          )}
                          <span
                            className={
                              "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] " +
                              orderListStatusClass(order.status, received)
                            }
                            style={{ fontFamily: "var(--font-mono-tech)" }}
                          >
                            {orderListStatusLabel(order.status, received)}
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-zinc-200">
                            {formatHuf(order.amountHuf)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                          className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-zinc-600 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                          aria-label={isOpen ? "Részletek bezárása" : "Rendelés részleteinek megnyitása"}
                          title={isOpen ? "Bezárás" : "Részletek"}
                        >
                          <ChevronDown
                            className={isOpen ? "h-3.5 w-3.5 rotate-180" : "h-3.5 w-3.5"}
                          />
                        </button>
                      </div>

                      <div className="mt-2.5 flex items-center justify-end gap-2 pl-7 sm:hidden">
                        {processing && (
                          <span
                            className="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-lime-300"
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={
                            "rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] " +
                            orderListStatusClass(order.status, received)
                          }
                          style={{ fontFamily: "var(--font-mono-tech)" }}
                        >
                          {orderListStatusLabel(order.status, received)}
                        </span>
                      </div>

                      {!received &&
                        ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(order.status) && (
                          <div className="mt-3 pl-7">
                            <button
                              type="button"
                              disabled={receivingOrderKey === orderKey}
                              onClick={() => void markOrderReceived(order)}
                              className="rounded-full border border-lime-400/25 bg-lime-400/[0.035] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-lime-200 transition-colors hover:border-lime-300/60 hover:bg-lime-400/[0.08] hover:text-white disabled:cursor-wait disabled:opacity-50"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              {receivingOrderKey === orderKey ? "FELDOLGOZÁS…" : "ÁTVETTEM"}
                            </button>
                            {receiptError && (
                              <p
                                className="mt-2 text-[10px] uppercase tracking-[0.16em] text-rose-400"
                                style={{ fontFamily: "var(--font-mono-tech)" }}
                              >
                                {receiptError}
                              </p>
                            )}
                          </div>
                        )}

                      {isOpen && (
                        <div className="mt-4 ml-7 border-l border-zinc-800/80 pl-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p
                                className="text-[9px] uppercase tracking-[0.2em] text-zinc-700"
                                style={{ fontFamily: "var(--font-mono-tech)" }}
                              >
                                RÉSZLETEK
                              </p>
                              <p className="mt-1 text-sm text-zinc-300">
                                {itemCount} DB · {formatHuf(order.amountHuf)}
                              </p>
                            </div>
                            <span
                              className="hidden text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:block"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              #{orderRef(order.id)}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {[
                              ["Dátum", formatDateTime(order.created_at)],
                              ["Azonosító", "#" + orderRef(order.id)],
                              ["Kézbesítés", order.deliveryType ? order.deliveryType.replaceAll("_", " ") : "—"],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-md border border-zinc-900 bg-black/20 px-3 py-2">
                                <p
                                  className="text-[9px] uppercase tracking-[0.16em] text-zinc-700"
                                  style={{ fontFamily: "var(--font-mono-tech)" }}
                                >
                                  {label}
                                </p>
                                <p className="mt-1 truncate text-xs text-zinc-400">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        <section className="pt-2">
          <div className="w-full">
            <div className="border-b border-zinc-800/80 pt-4 pb-4">
              {sectionEyebrow("AMIKET MEGSZEREZTÉL")}
            </div>
          </div>

          <div className="flex mt-7 gap-8">
            <div className="flex-1 border-r border-zinc-800">
              <p
                className="text-[12px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                RENDELÉSEK
              </p>
              <p className="mt-2 text-4xl font-normal text-zinc-100">{orders.length}</p>
            </div>
            <div className="flex-1 border-r border-zinc-800">
              <p
                className="text-[12px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                SZÁMOZOTT PÉLDÁNYOK
              </p>
              <p className="mt-2 text-4xl font-normal text-lime-200">{purchases.numberedCopies.length}</p>
            </div>
            <div className="flex-1">
              <p
                className="text-[12px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                MEGTALÁLÁSOK
              </p>
              <p className="mt-2 text-4xl font-normal text-zinc-100">{network.claims.accepted}</p>
            </div>
          </div>

          {purchases.numberedCopies.length > 0 && (
            <div className="mt-8">
              <p
                className="mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                SZÁMOZOTT PÉLDÁNYOK
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {purchases.numberedCopies.map((copy) => (
                  <div key={copy.copyNumber} className="flex items-baseline gap-2">
                    <span className="text-2xl font-normal text-lime-200">
                      #{String(copy.copyNumber).padStart(3, "0")}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.16em] text-zinc-700"
                      style={{ fontFamily: "var(--font-mono-tech)" }}
                    >
                      {copy.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="border-b border-zinc-800/80 py-10">
          <div className="border-t border-b border-zinc-700 pt-4 pb-4">
            {sectionEyebrow("HÁLÓZATI AKTIVITÁS")}
          </div>

          <div className="mt-7 flex gap-4">
            {[
              ["MEGTALÁLÁS", network.claims.total],
              ["ELFOGADVA", network.claims.accepted],
              ["FIZIKAI", network.claims.physical],
              ["DIGITÁLIS", network.claims.digital],
            ].map(([label, value]) => (
              <div className="flex-1" key={String(label)}>
                <p
                  className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {label}
                </p>
                <p className="mt-2 text-3xl font-normal text-zinc-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-zinc-900 pt-5">
            <span className="text-sm text-zinc-400">
              <strong className="font-normal text-zinc-100">{network.spots.total}</strong> saját spot
            </span>
            <span className="text-sm text-zinc-400">
              <strong className="font-normal text-zinc-100">{network.spots.active}</strong> aktív
            </span>
            <span className="text-sm text-zinc-400">
              <strong className="font-normal text-zinc-100">{network.claims.pending}</strong> függőben
            </span>
            <span className="text-sm text-zinc-400">
              <strong className="font-normal text-zinc-100">{network.claims.rejected}</strong> elutasítva
            </span>
          </div>
        </section>


        <footer className="flex flex-col gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-zinc-700"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            VÁLLALHATATLAN / USER NODE
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-zinc-700"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            STATUS · {CIRCLE_LABELS[circle.code]}
          </p>
        </footer>
      </div>

      {openOrder && (
        <button
          type="button"
          aria-label="Rendelés részleteinek bezárása"
          onClick={() => setOpenOrderId(null)}
          className="fixed inset-0 z-30 cursor-default bg-black/60 backdrop-blur-[2px]"
        />
      )}

      {openOrder && (
        <aside className="fixed inset-x-3 bottom-3 z-40 max-h-[78vh] overflow-y-auto border border-zinc-700/80 bg-[#050505] p-5 shadow-2xl sm:left-auto sm:right-5 sm:top-20 sm:bottom-auto sm:w-[min(34rem,calc(100vw-2rem))] sm:p-6">
          <div className="flex items-start justify-between gap-5 border-b border-zinc-800 pb-4">
            <div>
              {sectionEyebrow("RENDELÉS")}
              <h3 className={heroHeadline.className + " mt-2 text-2xl text-zinc-100"}>{openOrder.label}</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpenOrderId(null)}
              className="text-2xl leading-none text-zinc-600 transition-colors hover:text-zinc-100"
              aria-label="Bezárás"
            >
              ×
            </button>
          </div>

          <div className="mt-5 border-b border-zinc-900 pb-5">
            <div className="flex items-center gap-3">
              {!getReceivedAt(openOrder) && isProcessingStatus(openOrder.status) && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-lime-300"
                  aria-hidden="true"
                />
              )}
              <span className="text-lg font-semibold uppercase tracking-[0.08em] text-lime-200">
                {getReceivedAt(openOrder) ? "ÁTVÉVE" : statusLabel(openOrder.status)}
              </span>
            </div>
            {getReceivedAt(openOrder) ? (
              <p className="mt-2 text-sm text-zinc-500">
                Átvétel visszaigazolva · {formatDateTime(getReceivedAt(openOrder))}
              </p>
            ) : openOrder.status === "paid" ? (
              <p className="mt-2 text-base leading-7 text-zinc-300">
                V. hamarosan felveszi veled a kapcsolatot.
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {openOrder.items.map((item, itemIndex) => (
              <div key={`${openOrder.id}-drawer-${itemIndex}`} className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-base text-zinc-200">{item.name}</p>
                  <p
                    className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {item.quantity} DB{item.variant ? ` · ${item.variant}` : ""}
                  </p>
                </div>
                <p className="text-sm text-zinc-400">{formatHuf(item.lineTotalHuf)}</p>
              </div>
            ))}
          </div>

          {!getReceivedAt(openOrder) &&
            ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(openOrder.status) && (
              <button
                type="button"
                disabled={receivingOrderKey === `${openOrder.source}-${openOrder.id}`}
                onClick={() => void markOrderReceived(openOrder)}
                className="mt-7 border-b border-lime-400/60 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-200 transition-colors hover:border-lime-200 hover:text-white disabled:cursor-wait disabled:opacity-50"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {receivingOrderKey === `${openOrder.source}-${openOrder.id}`
                  ? "FELDOLGOZÁS…"
                  : "ÁTVETTEM"}
              </button>
            )}
        </aside>
      )}
    </main>
  )
}
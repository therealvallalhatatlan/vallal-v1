"use client"

import { useMemo, useRef, useState } from "react"
import { Check, ChevronDown, Pencil, X } from "lucide-react"
import type { DashboardAccountResponse, DashboardUnifiedOrder } from "@/types/dashboard"

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
  outside: "KÖRÖN KÍVÜL",
  a: "A KÖR",
  inner: "BELSŐ KÖR",
  core: "SZŰK BELSŐ KÖR",
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
  const { user, circle, orders, purchases, network } = account
  const [nickname, setNickname] = useState(user.nickname ?? "")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInputRef] = useState(() => ({ current: null as HTMLInputElement | null }))
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)
  const [receivingOrderKey, setReceivingOrderKey] = useState<string | null>(null)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const displayName = nickname.trim() || user.email || "NODE"
  const avatarLetter = displayName.charAt(0).toUpperCase() || "N"

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

      window.location.reload()
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
        <header className="border-b border-zinc-800/90 pb-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700/80 bg-zinc-950 text-xl font-black text-lime-200">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="h-full w-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  avatarLetter
                )}
              </div>

              <div className="min-w-0">
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
                        className="w-full max-w-xl border-0 border-b border-lime-400/60 bg-transparent px-0 py-1 text-3xl font-normal tracking-tight text-zinc-50 outline-none placeholder:text-zinc-700 sm:text-4xl"
                        style={{ fontFamily: "var(--font-heading), serif" }}
                        placeholder="BECSENÉV"
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
                    className="group mt-1 flex max-w-full items-center gap-3 text-left"
                    aria-label="Becenév szerkesztése"
                  >
                    <h1 className="truncate text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
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
                  className="mt-2 truncate text-[13px] text-zinc-500 sm:text-sm"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  {user.email ?? "—"}
                </p>
                <p
                  className="mt-1.5 text-[10px] uppercase tracking-[0.24em] text-zinc-700"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  CSATLAKOZÁS · {formatDate(user.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-end justify-between gap-6 lg:min-w-[18rem]">
              <div>
                {sectionEyebrow("AKTIVITÁS")}
                <p className="mt-2 text-3xl font-normal tracking-tight text-zinc-100">
                  {totalNetworkActivity}
                </p>
                <p
                  className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  HÁLÓZATI JEL / PONT
                </p>
              </div>

              <div className="text-right">
                {sectionEyebrow("KÖR")}
                <p className="mt-2 text-xl font-normal tracking-[0.04em] text-lime-200">
                  {CIRCLE_LABELS[circle.code]}
                </p>
                <p
                  className="mt-1 text-[10px] uppercase tracking-[0.22em] text-zinc-600"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  AKTÍV STÁTUSZ
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="border-b border-zinc-800/80 py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              {sectionEyebrow("A TE KÖRÖD")}
              <h2 className="mt-2 text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
                {CIRCLE_LABELS[circle.code]}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
                A köröd az eddigi aktivitásod és a Vállalhatatlanban való részvételed alapján alakul.
              </p>
            </div>
            <div
              className="border-l border-lime-400/50 pl-4 text-sm leading-6 text-zinc-400 lg:max-w-xs lg:text-right lg:border-l-0 lg:border-r lg:pr-4"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {circle.code === "outside"
                ? "A rendszer még nem azonosított olyan aktivitást, amely körhöz kötne."
                : "A státuszod jelenleg aktív."}
            </div>
          </div>
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

        <section className="border-b border-zinc-800/80 py-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              {sectionEyebrow("RENDELÉSEIM")}
              <h2 className="mt-2 text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
                Rendelési történet
              </h2>
            </div>
            <span
              className="text-[11px] uppercase tracking-[0.25em] text-zinc-600"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {orders.length} DB
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-base text-zinc-500">
              Még nincs ismert rendelésed.
            </div>
          ) : (
            <div className="mt-6">
              {orders.map((order, index) => {
                const isOpen = openOrderId === order.id
                const processing = !order.user_received_at && isProcessingStatus(order.status)
                const priority = orderNeedsPriority(order)
                const orderKey = `${order.source}-${order.id}`

                return (
                  <article
                    key={orderKey}
                    className="border-t border-zinc-800/70 py-6 last:border-b last:border-zinc-800/70"
                  >
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
                      <div className="min-w-0">
                        <div className="flex items-start gap-4">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                              order.user_received_at
                                ? "bg-lime-300 shadow-[0_0_7px_rgba(163,230,53,0.4)]"
                                : order.status === "fulfilled"
                                  ? "bg-zinc-600"
                                  : "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.45)]"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <h3 className="truncate text-xl font-normal text-zinc-100 sm:text-2xl">
                                {order.label}
                              </h3>
                              <span
                                className="text-[10px] uppercase tracking-[0.18em] text-zinc-600"
                                style={{ fontFamily: "var(--font-mono-tech)" }}
                              >
                                {order.source === "shop" ? "MERCH" : "KÖNYV"}
                              </span>
                            </div>

                            <p
                              className="mt-2 text-[11px] uppercase tracking-[0.18em] text-zinc-600"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              {formatDate(order.created_at)} · #{orderRef(order.id)}
                            </p>

                            <div className="mt-5">
                              <div className="flex flex-wrap items-center gap-3">
                                {processing && (
                                  <span
                                    className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-lime-300"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="text-base font-semibold uppercase tracking-[0.08em] text-lime-200 sm:text-lg">
                                  {order.user_received_at ? "ÁT VÉVE" : statusLabel(order.status)}
                                </span>
                              </div>

                              {order.user_received_at ? (
                                <p className="mt-2 text-base text-zinc-500">
                                  Átvétel visszaigazolva · {formatDateTime(order.user_received_at)}
                                </p>
                              ) : order.status === "paid" ? (
                                <p className="mt-2 text-base leading-7 text-zinc-300">
                                  V. hamarosan felveszi veled a kapcsolatot.
                                </p>
                              ) : order.status === "dispatched" ? (
                                <p className="mt-2 text-base leading-7 text-zinc-300">
                                  A csomag elindult. Ha megtaláltad és átvetted, jelezd itt.
                                </p>
                              ) : order.status === "fulfilled" ? (
                                <p className="mt-2 text-base leading-7 text-zinc-400">
                                  A rendelés teljesítve. Ha már nálad van a csomag, erősítsd meg az átvételt.
                                </p>
                              ) : (
                                <p className="mt-2 text-sm leading-6 text-zinc-500">
                                  A rendelés feldolgozás alatt van.
                                </p>
                              )}

                              {!order.user_received_at &&
                                ["paid", "ready_to_dispatch", "dispatched", "fulfilled"].includes(order.status) && (
                                  <div className="mt-4">
                                    <button
                                      type="button"
                                      disabled={receivingOrderKey === orderKey}
                                      onClick={() => void markOrderReceived(order)}
                                      className="border-b border-lime-400/60 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-200 transition-colors hover:border-lime-200 hover:text-white disabled:cursor-wait disabled:opacity-50"
                                      style={{ fontFamily: "var(--font-mono-tech)" }}
                                    >
                                      {receivingOrderKey === orderKey ? "FELDOLGOZÁS…" : "ÁT VETTEM"}
                                    </button>
                                  </div>
                                )}

                              {receiptError && openOrderId === order.id && (
                                <p
                                  className="mt-3 text-[10px] uppercase tracking-[0.16em] text-rose-400"
                                  style={{ fontFamily: "var(--font-mono-tech)" }}
                                >
                                  {receiptError}
                                </p>
                              )}

                              {priority && (
                                <p
                                  className="mt-4 border-l border-lime-400/50 pl-3 text-[11px] uppercase tracking-[0.16em] text-lime-200/80"
                                  style={{ fontFamily: "var(--font-mono-tech)" }}
                                >
                                  ELSŐ KISZOLGÁLÁS
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-5 border-t border-zinc-900 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                        <div>
                          <p
                            className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                            style={{ fontFamily: "var(--font-mono-tech)" }}
                          >
                            ÖSSZEG
                          </p>
                          <p className="mt-1 text-lg text-zinc-200">
                            {formatHuf(order.amountHuf)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                          className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-100"
                          style={{ fontFamily: "var(--font-mono-tech)" }}
                        >
                          {isOpen ? "BEZÁR" : "RÉSZLETEK"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-6 ml-6 border-l border-zinc-800 pl-5 lg:ml-7">
                        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                          <div>
                            <p
                              className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              TÉTELEK
                            </p>
                            <div className="mt-3 space-y-3">
                              {order.items.map((item, itemIndex) => (
                                <div
                                  key={`${order.id}-item-${itemIndex}`}
                                  className="flex items-baseline justify-between gap-5 border-b border-zinc-900 pb-3 last:border-0"
                                >
                                  <div>
                                    <p className="text-base text-zinc-200">{item.name}</p>
                                    <p
                                      className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600"
                                      style={{ fontFamily: "var(--font-mono-tech)" }}
                                    >
                                      {item.quantity} DB{item.variant ? ` · ${item.variant}` : ""}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-sm text-zinc-400">{formatHuf(item.lineTotalHuf)}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p
                              className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              ADATOK
                            </p>
                            <div className="mt-3 space-y-3 text-sm text-zinc-400">
                              <div>
                                <span className="text-zinc-600">Dátum</span>
                                <span className="float-right text-zinc-300">{formatDateTime(order.created_at)}</span>
                              </div>
                              <div>
                                <span className="text-zinc-600">Azonosító</span>
                                <span className="float-right font-mono text-xs text-zinc-300">#{orderRef(order.id)}</span>
                              </div>
                              {order.deliveryType && (
                                <div>
                                  <span className="text-zinc-600">Kézbesítés</span>
                                  <span className="float-right text-zinc-300">{order.deliveryType.replaceAll("_", " ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="border-b border-zinc-800/80 py-10">
          <div className="flex items-end justify-between gap-5">
            <div>
              {sectionEyebrow("AMIT MEGSZEREZTÉL")}
              <h2 className="mt-2 text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
                Gyűjtemény
              </h2>
            </div>
            <span
              className="text-[11px] uppercase tracking-[0.25em] text-zinc-600"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {purchases.itemCount} DB TÉTEL
            </span>
          </div>

          <div className="mt-7 grid gap-8 md:grid-cols-3">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                RENDELÉSEK
              </p>
              <p className="mt-2 text-4xl font-normal text-zinc-100">{orders.length}</p>
            </div>
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                SZÁMOZOTT PÉLDÁNYOK
              </p>
              <p className="mt-2 text-4xl font-normal text-lime-200">{purchases.numberedCopies.length}</p>
            </div>
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.2em] text-zinc-600"
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
          <div>
            {sectionEyebrow("HÁLÓZATI AKTIVITÁS")}
            <h2 className="mt-2 text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
              A hálózatban hagyott nyom
            </h2>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-8">
            {[
              ["MEGTALÁLÁS", network.claims.total],
              ["ELFOGADVA", network.claims.accepted],
              ["FÁJZIKAI", network.claims.physical],
              ["DIGITÁLIS", network.claims.digital],
            ].map(([label, value]) => (
              <div key={String(label)}>
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

        <section className="border-b border-zinc-800/80 py-10">
          {sectionEyebrow("JELVÉNYEK")}
          <h2 className="mt-2 text-3xl font-normal tracking-tight text-zinc-50 sm:text-4xl">
            Hamarosan
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            A köröd már él. A megszerzett jelvények külön gyűjthető rendszerben fognak megjelenni.
          </p>
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
              <h3 className="mt-2 text-2xl font-normal text-zinc-100">{openOrder.label}</h3>
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
              {!openOrder.user_received_at && isProcessingStatus(openOrder.status) && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-lime-300"
                  aria-hidden="true"
                />
              )}
              <span className="text-lg font-semibold uppercase tracking-[0.08em] text-lime-200">
                {openOrder.user_received_at ? "ÁT VÉVE" : statusLabel(openOrder.status)}
              </span>
            </div>
            {openOrder.user_received_at ? (
              <p className="mt-2 text-sm text-zinc-500">
                Átvétel visszaigazolva · {formatDateTime(openOrder.user_received_at)}
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

          {!openOrder.user_received_at &&
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
                  : "ÁT VETTEM"}
              </button>
            )}
        </aside>
      )}
    </main>
  )
}

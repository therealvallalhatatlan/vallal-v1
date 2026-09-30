"use client"

import { useMemo, useState } from "react"
import type { DashboardAccountResponse, DashboardUnifiedOrder } from "@/types/dashboard"

type Props = {
  account: DashboardAccountResponse
  token: string | null
}

const CIRCLE_STYLES: Record<DashboardAccountResponse["circle"]["code"], string> = {
  outside: "border-zinc-700 bg-zinc-950 text-zinc-300",
  a: "border-sky-500/50 bg-sky-500/5 text-sky-200",
  inner: "border-violet-500/50 bg-violet-500/5 text-violet-200",
  core: "border-lime-400/70 bg-lime-400/5 text-lime-200",
}

const STATUS_LABELS: Record<string, string> = {
  pending: "FIZETÉS FOLYAMATBAN",
  paid: "RENDELÉS FOGADVA",
  ready_to_dispatch: "ÖSSZEKÉSZÍTVE",
  dispatched: "ÚTON VAN",
  fulfilled: "TELJESÍTVE",
  cancelled: "TÖRÖLVE",
  canceled: "TÖRÖLVE",
  payment_failed: "FIZETÉS SIKERTELEN",
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

export default function UserAccountDashboard({ account, token: _token }: Props) {
  const { user, circle, orders, purchases, network } = account
  const [nickname, setNickname] = useState(user.nickname ?? "")
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [openOrderId, setOpenOrderId] = useState<string | null>(null)

  const openOrder = useMemo(
    () => orders.find((order) => order.id === openOrderId) ?? null,
    [openOrderId, orders],
  )

  const saveNickname = async () => {
    setSaveState("saving")
    setNicknameError(null)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${_token ?? ""}`,
        },
        body: JSON.stringify({ nickname }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error || "A becenév mentése nem sikerült.")
      }

      setNickname(payload?.profile?.nickname ?? nickname.trim())
      setSaveState("saved")
    } catch (error) {
      setSaveState("error")
      setNicknameError(error instanceof Error ? error.message : "A becenév mentése nem sikerült.")
    } finally {
      window.setTimeout(() => setSaveState("idle"), 1800)
    }
  }

  const displayName = nickname.trim() || user.email || "NODE"
  const avatarLetter = displayName.charAt(0).toUpperCase() || "N"
  const circleStyle = CIRCLE_STYLES[circle.code]

  return (
    <main className="min-h-screen bg-[#010101] px-4 pb-24 pt-24 text-zinc-100 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="relative overflow-hidden border border-zinc-800 bg-zinc-950/80 p-5 sm:p-7">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(163,230,53,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(163,230,53,0.025)_1px,transparent_1px)] bg-[size:28px_28px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(163,230,53,0.07),transparent_35%)]" />
          </div>

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-3xl font-black text-lime-200">
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

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">SAJÁT FIÓK</p>
              <h1 className="mt-1 truncate text-2xl font-black uppercase tracking-[0.08em] text-zinc-100 sm:text-3xl">
                {displayName}
              </h1>
              <p className="mt-2 truncate text-xs tracking-[0.08em] text-zinc-500">{user.email ?? "—"}</p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
                CSATLAKOZÁS · {formatDate(user.created_at)}
              </p>
            </div>

            <div className={`self-start rounded border px-4 py-3 text-center sm:self-center ${circleStyle}`}>
              <div className="text-[9px] uppercase tracking-[0.3em] opacity-70">A TE KÖRÖD</div>
              <div className="mt-1 text-xs font-black tracking-[0.18em]">{circle.label}</div>
            </div>
          </div>
        </header>

        <section className={`relative overflow-hidden border p-6 ${circleStyle}`}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] opacity-60">A TE KÖRÖD</p>
            <div className="mt-2 text-2xl font-black tracking-[0.1em]">{circle.label}</div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed opacity-70">
              A köröd az eddigi aktivitásod és a Vállalhatatlanban való részvételed alapján alakul.
            </p>
          </div>
        </section>

        {orders.some(orderNeedsPriority) && (
          <section className="border border-lime-400/50 bg-lime-400/[0.035] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-lime-200">II. KÖNYV · ELSŐ KISZOLGÁLÁS</p>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-300">
              A II. könyvre leadott korábbi rendelésedet nyilvántartjuk. Ezek a rendelések az első kiszolgálási körben szerepelnek.
            </p>
          </section>
        )}

        <section className="space-y-4 border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">RENDELÉSEIM</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-[0.08em]">Rendelési történet</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">{orders.length} DB</span>
          </div>

          {orders.length === 0 ? (
            <div className="border border-zinc-900 bg-black/30 p-5 text-sm text-zinc-500">
              Még nincs ismert rendelésed.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const priority = orderNeedsPriority(order)
                const isOpen = openOrderId === order.id

                return (
                  <article key={`${order.source}-${order.id}`} className="border border-zinc-900 bg-black/30">
                    <button
                      type="button"
                      onClick={() => setOpenOrderId(isOpen ? null : order.id)}
                      className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-lime-400/[0.025]"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${order.status === "fulfilled" ? "bg-zinc-700" : "bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.5)]"}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold uppercase tracking-[0.09em] text-zinc-100">
                          {order.label}
                        </span>
                        <span className="mt-1 block text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                          {formatDate(order.created_at)} · #{orderRef(order.id)} · {order.source === "shop" ? "MERCH" : "KÖNYV"}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <span className="block text-xs font-bold text-zinc-100">{formatHuf(order.amountHuf)}</span>
                        <span className="mt-1 block text-[9px] uppercase tracking-[0.2em] text-zinc-600">{statusLabel(order.status)}</span>
                      </span>
                      <span className="text-zinc-600">{isOpen ? "−" : "+"}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-zinc-900 px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">ÁLLAPOT</p>
                              <p className="mt-1 text-sm font-bold text-lime-200">{statusLabel(order.status)}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">RENDELÉS</p>
                              <p className="mt-1 text-sm text-zinc-300">#{orderRef(order.id)} · {formatDateTime(order.created_at)}</p>
                            </div>
                            {order.deliveryType && (
                              <div>
                                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">KÉZBESÍTÉS</p>
                                <p className="mt-1 text-sm text-zinc-300">{order.deliveryType.replaceAll("_", " ")}</p>
                              </div>
                            )}
                            {priority && (
                              <div className="border border-lime-400/30 bg-lime-400/[0.035] p-3 text-xs leading-relaxed text-zinc-300">
                                Ezt a II. könyves rendelést a korábbi megrendelések között elsőként szolgáljuk ki.
                              </div>
                            )}
                          </div>

                          <div className="min-w-44">
                            <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">TÉTELEK</p>
                            <div className="mt-2 space-y-2">
                              {order.items.map((item, index) => (
                                <div key={`${order.id}-item-${index}`} className="border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                                  <p className="text-xs font-semibold text-zinc-200">{item.name}</p>
                                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                                    {item.quantity} DB · {formatHuf(item.lineTotalHuf)}
                                    {item.variant ? ` · ${item.variant}` : ""}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-zinc-900 pt-3 text-right">
                          <span className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">ÖSSZESEN </span>
                          <span className="text-sm font-black text-zinc-100">{formatHuf(order.amountHuf)}</span>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">AMIT MEGSZEREZTÉL</p>
              <h2 className="mt-1 text-xl font-black uppercase tracking-[0.08em]">Gyűjtemény</h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-600">{purchases.itemCount} DB TÉTEL</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">RENDELÉSEK</p>
              <p className="mt-2 text-2xl font-black text-zinc-100">{orders.length}</p>
            </div>
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">SZÁMOZOTT PÉLDÁNYOK</p>
              <p className="mt-2 text-2xl font-black text-lime-200">{purchases.numberedCopies.length}</p>
            </div>
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">HÁLÓZAT</p>
              <p className="mt-2 text-2xl font-black text-zinc-100">{network.claims.accepted}</p>
            </div>
          </div>

          {purchases.numberedCopies.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {purchases.numberedCopies.map((copy) => (
                <div key={copy.copyNumber} className="border border-lime-400/30 bg-lime-400/[0.025] px-4 py-3">
                  <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600">SZÁMOZOTT</p>
                  <p className="mt-1 text-lg font-black tracking-[0.12em] text-lime-200">#{String(copy.copyNumber).padStart(3, "0")}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">HÁLÓZATI AKTIVITÁS</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-[0.08em]">Amit a hálózatban csináltál</h2>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["MEGTALÁLÁS", network.claims.total],
              ["ELFOGADVA", network.claims.accepted],
              ["FIZIKAI", network.claims.physical],
              ["DIGITÁLIS", network.claims.digital],
            ].map(([label, value]) => (
              <div key={String(label)} className="border border-zinc-900 bg-black/30 p-4">
                <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600">{label}</p>
                <p className="mt-2 text-2xl font-black text-zinc-100">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600">SAJÁT SPOTOK</p>
              <p className="mt-2 text-xl font-black text-zinc-100">{network.spots.total}</p>
            </div>
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="text-[9px] uppercase tracking-[0.25em] text-zinc-600">AKTÍV</p>
              <p className="mt-2 text-xl font-black text-zinc-100">{network.spots.active}</p>
            </div>
            <div className="border border-zinc-900 bg-black/30 p-4">
              <p className="mt-2 text-xs text-zinc-400">{network.claims.pending} függőben lévő megtalálás</p>
              <p className="mt-1 text-xs text-zinc-500">{network.claims.rejected} elutasított megtalálás</p>
            </div>
          </div>
        </section>

        <section className="border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">JELVÉNYEK</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-[0.08em]">A jelvényrendszer hamarosan érkezik</h2>
          </div>
          <div className="mt-4 flex min-h-24 items-center justify-center border border-dashed border-zinc-800 bg-black/20 px-4 text-center">
            <p className="max-w-lg text-sm leading-relaxed text-zinc-500">
              A köröd már él. A megszerzett jelvények külön gyűjthető rendszerben fognak megjelenni.
            </p>
          </div>
        </section>

        <section className="border border-zinc-800 bg-zinc-950/60 p-5 sm:p-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">FIÓK BEÁLLÍTÁSOK</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-[0.08em]">Becenév</h2>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value)
                  setSaveState("idle")
                  setNicknameError(null)
                }}
                maxLength={20}
                className="w-full border border-zinc-800 bg-black/60 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-lime-400/60"
                placeholder="pl. bigidy"
              />
              {nicknameError && (
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-rose-400">{nicknameError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={saveNickname}
              disabled={saveState === "saving"}
              className="border border-lime-400/60 bg-lime-400/10 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-lime-200 transition-colors hover:bg-lime-400/15 disabled:opacity-50"
            >
              {saveState === "saving" ? "MENTÉS…" : saveState === "saved" ? "MENTVE" : "MENTÉS"}
            </button>
          </div>
        </section>

        {openOrder && (
          <button
            type="button"
            aria-label="Rendelés bezárása"
            onClick={() => setOpenOrderId(null)}
            className="fixed inset-0 z-40 cursor-default bg-black/60"
          />
        )}

        {openOrder && (
          <div className="fixed inset-x-3 bottom-3 z-50 max-h-[75vh] overflow-y-auto border border-zinc-700 bg-zinc-950 p-5 shadow-2xl sm:inset-x-auto sm:right-5 sm:top-24 sm:bottom-auto sm:w-[min(30rem,calc(100vw-2rem))]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">RENDELÉS</p>
                <h3 className="mt-1 text-lg font-black uppercase tracking-[0.08em] text-zinc-100">{openOrder.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenOrderId(null)}
                className="border border-zinc-800 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-100"
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">STÁTUSZ</p>
                <p className="mt-1 text-sm font-bold text-lime-200">{statusLabel(openOrder.status)}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-600">ÖSSZEG</p>
                <p className="mt-1 text-sm font-bold text-zinc-100">{formatHuf(openOrder.amountHuf)}</p>
              </div>
            </div>
            <div className="mt-4 border-t border-zinc-900 pt-4">
              {openOrder.items.map((item, index) => (
                <div key={`${openOrder.id}-modal-${index}`} className="flex items-center justify-between gap-3 border-b border-zinc-900 py-3 last:border-0">
                  <div>
                    <p className="text-sm text-zinc-200">{item.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                      {item.quantity} DB{item.variant ? ` · ${item.variant}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100">{formatHuf(item.lineTotalHuf)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

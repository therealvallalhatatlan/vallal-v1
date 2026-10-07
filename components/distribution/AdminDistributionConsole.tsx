"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/browser"

type Cell = {
  id: string
  code: string
  name: string
  city: string
  status: string
  commission_default_huf: number
  stripe_connected_account_id: string | null
  stripe_payouts_enabled: boolean
}

type Commission = {
  id: string
  order_id: string
  cell_id: string
  amount_huf: number
  status: string
  stripe_transfer_id: string | null
  created_at: string
  distribution_cells?: {
    name: string
    city: string
  } | null
}

export default function AdminDistributionConsole() {
  const [token, setToken] = useState<string | null>(null)
  const [cells, setCells] = useState<Cell[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: "",
    name: "",
    city: "Budapest",
    owner_email: "",
    commission_default_huf: "",
  })

  async function getToken() {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }

  async function load(accessToken?: string) {
    setLoading(true)
    const authToken = accessToken || token
    if (!authToken) {
      setLoading(false)
      return
    }

    const headers = { Authorization: "Bearer " + authToken }
    const [cellsResponse, commissionsResponse] = await Promise.all([
      fetch("/api/admin/distribution/cells", { headers, cache: "no-store" }),
      fetch("/api/admin/distribution/commissions", { headers, cache: "no-store" }),
    ])

    const cellsJson = await cellsResponse.json()
    const commissionsJson = await commissionsResponse.json()

    if (cellsResponse.ok && cellsJson?.ok) setCells(Array.isArray(cellsJson.cells) ? cellsJson.cells : [])
    if (commissionsResponse.ok && commissionsJson?.ok) setCommissions(Array.isArray(commissionsJson.commissions) ? commissionsJson.commissions : [])
    if (!cellsResponse.ok || !commissionsResponse.ok) setMessage(cellsJson?.error || commissionsJson?.error || "Nem sikerült betölteni az admin adatokat.")
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      const accessToken = await getToken()
      setToken(accessToken)
      if (accessToken) await load(accessToken)
      else setLoading(false)
    })()
  }, [])

  async function createCell() {
    if (!token) return
    setBusyId("create-cell")
    setMessage(null)

    const response = await fetch("/api/admin/distribution/cells", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        ...form,
        commission_default_huf: Number(form.commission_default_huf || 0),
      }),
    })
    const json = await response.json()

    if (!response.ok || !json?.ok) {
      setMessage(json?.error || "A sejt létrehozása nem sikerült.")
      setBusyId(null)
      return
    }

    setForm({ code: "", name: "", city: "Budapest", owner_email: "", commission_default_huf: "" })
    setMessage("Sejt létrehozva 3 könyv + 3 póló induló készlettel.")
    await load()
    setBusyId(null)
  }

  async function connectCell(cellId: string) {
    if (!token) return
    setBusyId(cellId)
    setMessage(null)

    const response = await fetch("/api/admin/distribution/cells/" + encodeURIComponent(cellId) + "/connect", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    })
    const json = await response.json()

    if (!response.ok || !json?.ok || !json?.url) {
      setMessage(json?.error || "A Stripe Connect indítása nem sikerült.")
      setBusyId(null)
      return
    }

    window.location.href = json.url
  }

  async function approveCommission(commissionId: string) {
    if (!token) return
    setBusyId(commissionId)
    setMessage(null)

    const response = await fetch("/api/admin/distribution/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ commission_id: commissionId, action: "approve" }),
    })
    const json = await response.json()

    if (!response.ok || !json?.ok) {
      setMessage(json?.error || "A jutalék utalása nem sikerült.")
      setBusyId(null)
      return
    }

    setMessage("Jutalék kiutalva: " + Number(json.amount_huf || 0).toLocaleString("hu-HU") + " Ft.")
    await load()
    setBusyId(null)
  }

  if (!token) {
    return <main className="min-h-screen bg-black px-5 py-16 text-center text-zinc-400">Admin bejelentkezés szükséges.</main>
  }

  return (
    <main className="min-h-screen bg-[#020202] px-5 py-10 text-zinc-200 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">VÁLLALHATATLAN / DISTRIBUTION ADMIN</p>
        <h1 className="mt-3 text-3xl font-black text-zinc-100">Sejtek és jutalékok</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">A vásárló mindig a központnak fizet. Itt kötöd össze a sejteket Stripe-dal és innen indítod a jóváhagyott jutalékokat.</p>

        <section className="mt-10 border-t border-zinc-800 pt-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-lime-200/60">ÚJ SEJT</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="BP-01" className="border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Budapest Észak" className="border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Budapest" className="border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            <input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} placeholder="sejt@pelda.hu" className="border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            <div className="flex gap-2">
              <input value={form.commission_default_huf} onChange={(e) => setForm({ ...form, commission_default_huf: e.target.value })} placeholder="Jutalék Ft" inputMode="numeric" className="min-w-0 flex-1 border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
              <button type="button" onClick={() => void createCell()} disabled={busyId === "create-cell"} className="border border-lime-200/50 bg-lime-100 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:opacity-50">{busyId === "create-cell" ? "…" : "LÉTREHOZ"}</button>
            </div>
          </div>
        </section>

        <section className="mt-12 border-t border-zinc-800 pt-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-lime-200/60">SEJTEK</p>
          {loading ? <p className="mt-6 text-xs uppercase tracking-[0.2em] text-zinc-600">BETÖLTÉS…</p> : (
            <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
              {cells.length ? cells.map((cell) => (
                <div key={cell.id} className="grid gap-4 px-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-100">{cell.name}</span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">{cell.code} · {cell.city}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">Jutalék / rendelés: {cell.commission_default_huf.toLocaleString("hu-HU")} Ft</p>
                  </div>
                  <div className="text-right">
                    <span className={"text-[10px] uppercase tracking-[0.18em] " + (cell.stripe_payouts_enabled ? "text-lime-100" : "text-zinc-600")}>{cell.stripe_payouts_enabled ? "STRIPE KÉSZ" : "STRIPE NINCS KÉSZ"}</span>
                    <button type="button" onClick={() => void connectCell(cell.id)} disabled={busyId === cell.id} className="ml-4 border border-zinc-700 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 hover:border-lime-200/50 disabled:opacity-50">{busyId === cell.id ? "…" : cell.stripe_connected_account_id ? "ONBOARDING" : "STRIPE BEKÖTÉSE"}</button>
                  </div>
                </div>
              )) : <div className="px-4 py-8 text-sm text-zinc-600">Még nincs sejt.</div>}
            </div>
          )}
        </section>

        <section className="mt-12 border-t border-zinc-800 pt-7">
          <p className="text-[10px] uppercase tracking-[0.25em] text-lime-200/60">JUTALÉKOK</p>
          <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
            {commissions.length ? commissions.map((commission) => (
              <div key={commission.id} className="grid gap-4 px-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-100">{commission.distribution_cells?.name || commission.cell_id}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">ORDER {commission.order_id.slice(0, 8)} · {commission.status}</div>
                  <div className="mt-2 text-lg font-black text-zinc-100">{commission.amount_huf.toLocaleString("hu-HU")} Ft</div>
                </div>
                <button type="button" onClick={() => void approveCommission(commission.id)} disabled={commission.status !== "pending" || busyId === commission.id} className="border border-lime-200/50 bg-lime-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black disabled:cursor-not-allowed disabled:opacity-40">
                  {busyId === commission.id ? "UTALÁS…" : commission.status === "pending" ? "JÓVÁHAGYOM + UTALÁS" : commission.status.toUpperCase()}
                </button>
              </div>
            )) : <div className="px-4 py-8 text-sm text-zinc-600">Nincs függő jutalék.</div>}
          </div>
        </section>

        {message ? <div className="mt-8 border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">{message}</div> : null}
        <a href="/fooldal-3" className="mt-10 inline-block text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-300">← FŐOLDAL-3</a>
      </div>
    </main>
  )
}

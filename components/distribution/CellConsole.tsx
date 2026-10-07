"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/browser"
import { DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF } from "@/lib/distributionNetwork"

type Inventory = {
  id: string
  product_id: string
  product_name: string
  quantity_total: number
  quantity_available: number
}

type Cell = {
  id: string
  code: string
  name: string
  city: string
  status: string
  role: string
  inventory: Inventory[]
}

const FULFILLMENT = [
  ["dead_drop", "DEAD DROP"],
  ["personal", "SZEMÉLYES"],
  ["hu_shipping", "AUTOMATA / HU"],
  ["eu_shipping", "POSTA / EU"],
  ["global_shipping", "POSTA / GLOBAL"],
] as const

export default function CellConsole() {
  const [token, setToken] = useState<string | null>(null)
  const [cells, setCells] = useState<Cell[]>([])
  const [orders, setOrders] = useState<Array<{
    id: string
    created_at: string
    status: string
    amount: number
    delivery_type: string
    distribution_fulfillment_method: string | null
    distribution_product_name: string | null
  }>>([])
  const [cellId, setCellId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [district, setDistrict] = useState("")
  const [locationHint, setLocationHint] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [methods, setMethods] = useState<string[]>(["dead_drop"])

  const currentCell = useMemo(() => cells.find((cell) => cell.id === cellId) || cells[0] || null, [cells, cellId])
  const bookInventory = currentCell?.inventory.find((item) => item.product_id === "book_ii") || null

  async function load() {
    setLoading(true)
    setMessage(null)
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const accessToken = data?.session?.access_token || null
    setToken(accessToken)

    if (!accessToken) {
      setLoading(false)
      return
    }

    const [response, ordersResponse] = await Promise.all([
      fetch("/api/distribution/cell/me", {
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store",
      }),
      fetch("/api/distribution/cell/orders", {
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store",
      }),
    ])
    const json = await response.json()
    const ordersJson = await ordersResponse.json()
    if (ordersResponse.ok && ordersJson?.ok) setOrders(Array.isArray(ordersJson.orders) ? ordersJson.orders : [])
    if (!response.ok || !json?.ok) {
      setMessage(json?.error || "Nem sikerült betölteni a sejtet.")
      setLoading(false)
      return
    }

    setCells(Array.isArray(json.cells) ? json.cells : [])
    if (Array.isArray(json.cells) && json.cells.length) setCellId(json.cells[0].id)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setMessage("A böngésző nem támogatja a helymeghatározást.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6))
        setLng(position.coords.longitude.toFixed(6))
        setMessage("Pozíció betöltve.")
      },
      () => setMessage("Nem sikerült lekérni a pozíciót."),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function toggleMethod(value: string) {
    setMethods((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value],
    )
  }

  async function createDrop() {
    if (!token || !currentCell || !bookInventory) return
    if (!locationHint.trim() || !lat || !lng) {
      setMessage("A helyszín és a koordináta kötelező.")
      return
    }
    if (bookInventory.quantity_available < 1) {
      setMessage("Nincs több könyv a sejtnél.")
      return
    }

    setSaving(true)
    setMessage(null)

    const response = await fetch("/api/distribution/cell/drops", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        cell_id: currentCell.id,
        product_id: "book_ii",
        price_huf: DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF,
        city: currentCell.city,
        district,
        location_hint: locationHint,
        lat: Number(lat),
        lng: Number(lng),
        fulfillment_options: methods,
      }),
    })

    const json = await response.json()
    if (!response.ok || !json?.ok) {
      setMessage(json?.error || "A szpot létrehozása nem sikerült.")
      setSaving(false)
      return
    }

    setDistrict("")
    setLocationHint("")
    setMessage("Szpot létrehozva. A könyv kikerült a sejt készletéből és megjelent az aktív listában.")
    await load()
    setSaving(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-black px-5 py-16 text-center text-xs uppercase tracking-[0.2em] text-zinc-600">SEJT ADATOK BETÖLTÉSE…</div>
  }

  if (!token) {
    return <div className="min-h-screen bg-black px-5 py-16 text-center text-zinc-400">Jelentkezz be a terjesztői felülethez.</div>
  }

  if (!cells.length) {
    return <div className="min-h-screen bg-black px-5 py-16 text-center text-zinc-400">Nincs hozzád rendelt terjesztői sejt.</div>
  }

  return (
    <main className="min-h-screen bg-[#020202] px-5 py-10 text-zinc-200 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">VÁLLALHATATLAN / SEJT</p>
        <div className="mt-3 flex flex-col gap-4 border-b border-zinc-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-zinc-100">{currentCell?.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">{currentCell?.city} · {currentCell?.code}</p>
          </div>
          {cells.length > 1 ? (
            <select value={currentCell?.id} onChange={(event) => setCellId(event.target.value)} className="border border-zinc-700 bg-black px-3 py-2 text-xs uppercase tracking-[0.15em] text-zinc-300">
              {cells.map((cell) => <option key={cell.id} value={cell.id}>{cell.name} / {cell.city}</option>)}
            </select>
          ) : null}
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border border-zinc-800 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">KÖNYV KÉSZLET</p>
            <p className="mt-2 text-4xl font-black text-zinc-100">{bookInventory?.quantity_available ?? 0}</p>
            <p className="mt-1 text-xs text-zinc-500">elérhető példány a sejt készletében</p>
          </div>
          <div className="border border-zinc-800 p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">FOLYAMAT</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">A sejt maga helyezi ki a könyvet, a vásárló központilag fizet, a teljesítés után jutalék jár.</p>
          </div>
        </section>

        <section className="mt-10 border-t border-zinc-800 pt-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">FIZETETT RENDELÉSEK</p>
          <div className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
            {orders.length ? orders.map((order) => (
              <div key={order.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-100">{order.distribution_product_name || "Vállalhatatlan II."}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-600">#{order.id.slice(0, 8)} · {order.distribution_fulfillment_method || order.delivery_type} · {Number(order.amount / 100).toLocaleString("hu-HU")} Ft</div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {order.status === "paid" && (
                    <button type="button" onClick={async () => {
                      if (!token) return
                      await fetch("/api/distribution/cell/orders/" + order.id, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                        body: JSON.stringify({ status: order.distribution_fulfillment_method === "dead_drop" || order.distribution_fulfillment_method === "personal" ? "fulfilled" : "ready_to_dispatch" }),
                      })
                      await load()
                    }} className="border border-zinc-700 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 hover:border-lime-200/50">
                      {order.distribution_fulfillment_method === "dead_drop" || order.distribution_fulfillment_method === "personal" ? "ÁTADVA" : "ÖSSZEKÉSZÍTVE"}
                    </button>
                  )}
                  {order.status === "ready_to_dispatch" && (
                    <button type="button" onClick={async () => {
                      if (!token) return
                      await fetch("/api/distribution/cell/orders/" + order.id, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                        body: JSON.stringify({ status: "dispatched" }),
                      })
                      await load()
                    }} className="border border-zinc-700 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 hover:border-lime-200/50">FELADVA</button>
                  )}
                  {order.status === "dispatched" && (
                    <button type="button" onClick={async () => {
                      if (!token) return
                      await fetch("/api/distribution/cell/orders/" + order.id, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
                        body: JSON.stringify({ status: "fulfilled" }),
                      })
                      await load()
                    }} className="border border-lime-200/50 bg-lime-100 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black">TELJESÍTVE</button>
                  )}
                  <span className="self-center text-[10px] uppercase tracking-[0.16em] text-zinc-600">{order.status}</span>
                </div>
              </div>
            )) : <div className="px-4 py-8 text-sm text-zinc-600">Nincs teljesítésre váró rendelés.</div>}
          </div>
        </section>

        <section className="mt-10 border-t border-zinc-800 pt-7">
          <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">ÚJ SZPOT</p>
          <h2 className="mt-2 text-2xl font-black text-zinc-100">Rakj ki egy könyvet.</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">A könyv azonnal kikerül a saját inventorydból.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Kerület / terület</span>
              <input value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-2 w-full border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={useMyLocation} className="w-full border border-zinc-700 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-300 hover:border-lime-200/50">JELENLEGI POZÍCIÓ</button>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Nyilvános helyszín-hint</span>
            <textarea value={locationHint} onChange={(event) => setLocationHint(event.target.value)} rows={3} placeholder="pl. Nyugati pályaudvar, az óránál" className="mt-2 w-full border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">LAT</span>
              <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" className="mt-2 w-full border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">LNG</span>
              <input value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" className="mt-2 w-full border border-zinc-800 bg-black px-3 py-3 text-sm outline-none focus:border-lime-200/50" />
            </label>
          </div>

          <div className="mt-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">ÁTADÁSI MÓDOK</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {FULFILLMENT.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleMethod(value)} className={"border px-3 py-2 text-[10px] uppercase tracking-[0.18em] " + (methods.includes(value) ? "border-lime-200/50 bg-lime-100/10 text-lime-100" : "border-zinc-800 text-zinc-600")}>{label}</button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => void createDrop()} disabled={saving || !bookInventory?.quantity_available} className="mt-7 w-full border border-lime-200/50 bg-lime-100 px-4 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-black disabled:cursor-not-allowed disabled:opacity-40">
            {saving ? "SZPOT LÉTREHOZÁSA…" : "KÖNYV KIHELYEZÉSE"}
          </button>

          {message ? <p className="mt-4 border border-zinc-800 px-4 py-3 text-sm text-zinc-400">{message}</p> : null}
        </section>

        <a href="/fooldal-3" className="mt-10 inline-block text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-300">← FŐOLDAL</a>
      </div>
    </main>
  )
}

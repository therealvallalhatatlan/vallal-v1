"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/browser"

type Inventory = {
  id: string
  product_id: string
  product_name: string
  unit_price_huf: number
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
  drops: Drop[]
}

type Drop = {
  id: string
  product_id: string
  product_name: string
  price_huf: number
  city: string
  district: string | null
  location_hint: string
  lat: number
  lng: number
  fulfillment_options: string[]
  status: string
  hidden_at: string
  found_at: string | null
  order_id: string | null
  photo_count: number
}

type DropPhoto = { path: string; url: string }
type EditDropDraft = {
  id: string
  product_name: string
  city: string
  status: string
  district: string
  location_hint: string
  lat: string
  lng: string
  fulfillment_options: string[]
  photos: DropPhoto[]
  newPhotos: File[]
}

const BOOKS = [
  { id: "book_i", name: "Vállalhatatlan I." },
  { id: "book_ii", name: "Vállalhatatlan II." },
] as const

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
  const [selectedProductId, setSelectedProductId] = useState<"book_i" | "book_ii">("book_ii")
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [stockQuantity, setStockQuantity] = useState("1")
  const [receivingStock, setReceivingStock] = useState(false)
  const [editingDrop, setEditingDrop] = useState<EditDropDraft | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null)

  const currentCell = useMemo(() => cells.find((cell) => cell.id === cellId) || cells[0] || null, [cells, cellId])
  const selectedInventory = currentCell?.inventory.find((item) => item.product_id === selectedProductId) || null
  const visibleDrops = (currentCell?.drops || []).filter((drop) => drop.status !== "cancelled")

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

    const nextCells: Cell[] = Array.isArray(json.cells) ? json.cells : []
    setCells(nextCells)
    if (nextCells.length) {
      setCellId((current) => current && nextCells.some((cell) => cell.id === current) ? current : nextCells[0].id)
    }
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
    if (!token || !currentCell) return
    if (!locationHint.trim() || !lat || !lng) {
      setMessage("A helyszín és a koordináta kötelező.")
      return
    }
    if (!selectedInventory || selectedInventory.quantity_available < 1) {
      setMessage("Ehhez a kötethez nincs elérhető készlet. Előbb rögzítsd az átvett példányokat.")
      return
    }
    if (!methods.length) {
      setMessage("Válassz legalább egy átadási módot.")
      return
    }
    if (newPhotos.length > 8) {
      setMessage("Egy szpothoz legfeljebb 8 fotót tölthetsz fel.")
      return
    }

    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/distribution/cell/drops", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          cell_id: currentCell.id,
          product_id: selectedProductId,
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
        return
      }

      let photoMessage = ""
      if (newPhotos.length) {
        const photoForm = new FormData()
        newPhotos.forEach((photo) => photoForm.append("photos", photo))
        const photoResponse = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(json.drop_id) + "/photos", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: photoForm,
        })
        const photoJson = await photoResponse.json()
        if (!photoResponse.ok || !photoJson?.ok) {
          photoMessage = " A szpot létrejött, de a fotók feltöltése nem sikerült: " + (photoJson?.error || "ismeretlen hiba") + "."
        }
      }

      setDistrict("")
      setLocationHint("")
      setLat("")
      setLng("")
      setNewPhotos([])
      setPhotoInputKey((value) => value + 1)
      await load()
      setMessage((photoMessage ? "Szpot létrehozva." + photoMessage : "Szpot létrehozva, a fotók is feltöltve.") + " A készlet frissítve.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A szpot létrehozása nem sikerült.")
    } finally {
      setSaving(false)
    }
  }

  async function receiveStock() {
    if (!token || !currentCell) return
    const quantity = Number(stockQuantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setMessage("1 és 100 közötti egész darabszámot adj meg.")
      return
    }
    setReceivingStock(true)
    setMessage(null)
    try {
      const response = await fetch("/api/distribution/cell/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ cell_id: currentCell.id, product_id: selectedProductId, quantity }),
      })
      const json = await response.json()
      if (!response.ok || !json?.ok) {
        setMessage(json?.error === "cell_owner_required"
          ? "Készletet csak a sejt tulajdonosa rögzíthet."
          : json?.error || "A készlet rögzítése nem sikerült.")
        return
      }
      await load()
      setStockQuantity("1")
      setMessage("Készlet rögzítve: +" + quantity + " db " + (BOOKS.find((book) => book.id === selectedProductId)?.name || "könyv") + ". Csak a fizikailag átvett készletet rögzítsd.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A készlet rögzítése nem sikerült.")
    } finally {
      setReceivingStock(false)
    }
  }

  async function getToken() {
    if (token) return token
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }

  async function uploadPhotos(dropId: string, files: File[]) {
    const accessToken = await getToken()
    if (!accessToken || !files.length) return true
    const formData = new FormData()
    files.forEach((file) => formData.append("photos", file))
    const response = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(dropId) + "/photos", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken },
      body: formData,
    })
    const json = await response.json()
    if (!response.ok || !json?.ok) {
      setMessage(json?.error || "A fotók feltöltése nem sikerült.")
      return false
    }
    return true
  }

  async function openEditDrop(drop: Drop) {
    setEditLoadingId(drop.id)
    setMessage(null)
    try {
      const accessToken = await getToken()
      if (!accessToken) {
        setMessage("A bejelentkezés lejárt.")
        return
      }
      const response = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(drop.id), {
        headers: { Authorization: "Bearer " + accessToken },
        cache: "no-store",
      })
      const json = await response.json()
      if (!response.ok || !json?.ok) {
        setMessage(json?.error || "A szpot adatai nem tölthetők be.")
        return
      }
      const record = json.drop
      setEditingDrop({
        id: record.id,
        product_name: record.product_name,
        city: record.city,
        status: record.status,
        district: record.district || "",
        location_hint: record.location_hint || "",
        lat: String(record.lat),
        lng: String(record.lng),
        fulfillment_options: Array.isArray(record.fulfillment_options) ? record.fulfillment_options : ["dead_drop"],
        photos: Array.isArray(record.photos) ? record.photos : [],
        newPhotos: [],
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A szpot adatai nem tölthetők be.")
    } finally {
      setEditLoadingId(null)
    }
  }

  async function saveEditDrop() {
    if (!token || !editingDrop) return
    const latitude = Number(editingDrop.lat)
    const longitude = Number(editingDrop.lng)
    if (!editingDrop.location_hint.trim() || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setMessage("Ellenőrizd a helyszínleírást és a koordinátákat.")
      return
    }
    if (!editingDrop.fulfillment_options.length) {
      setMessage("Legalább egy átadási módot válassz.")
      return
    }

    setEditSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(editingDrop.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          district: editingDrop.district,
          location_hint: editingDrop.location_hint,
          lat: latitude,
          lng: longitude,
          fulfillment_options: editingDrop.fulfillment_options,
          status: editingDrop.status,
          photo_paths: editingDrop.photos.map((photo) => photo.path),
        }),
      })
      const json = await response.json()
      if (!response.ok || !json?.ok) {
        setMessage(json?.error || "A szpot mentése nem sikerült.")
        return
      }

      let photosSaved = true
      if (editingDrop.newPhotos.length) photosSaved = await uploadPhotos(editingDrop.id, editingDrop.newPhotos)
      setEditingDrop(null)
      await load()
      setMessage(photosSaved ? "Szpot mentve." : "A szpot adatai mentve, de a fotók feltöltése nem sikerült.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A szpot mentése nem sikerült.")
    } finally {
      setEditSaving(false)
    }
  }

  async function toggleDropStatus(drop: Drop) {
    const accessToken = await getToken()
    if (!accessToken) return setMessage("A bejelentkezés lejárt.")
    const nextStatus = drop.status === "active" ? "inactive" : "active"
    const response = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(drop.id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
      body: JSON.stringify({ status: nextStatus }),
    })
    const json = await response.json()
    if (!response.ok || !json?.ok) return setMessage(json?.error || "Az állapot módosítása nem sikerült.")
    await load()
    setMessage(nextStatus === "active" ? "A szpot újra aktív." : "A szpot inaktív lett, eltűnt a nyilvános térképről.")
  }

  async function deleteDrop(drop: Drop) {
    if (!window.confirm("Visszavonod ezt a szpotot? Az aktív, el nem adott példány visszakerül a készletbe.")) return
    const accessToken = await getToken()
    if (!accessToken) return setMessage("A bejelentkezés lejárt.")
    const response = await fetch("/api/distribution/cell/drops/" + encodeURIComponent(drop.id), {
      method: "DELETE",
      headers: { Authorization: "Bearer " + accessToken },
    })
    const json = await response.json()
    if (!response.ok || !json?.ok) return setMessage(json?.error || "A szpot visszavonása nem sikerült.")
    await load()
    setMessage("Szpot visszavonva, a könyv visszakerült a készletbe.")
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

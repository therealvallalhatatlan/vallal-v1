"use client"

import { useEffect, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { createClient } from "@/lib/browser"

type AccessDrop = {
  id: string
  product_name: string
  city: string
  district: string | null
  location_hint: string
  lat: number
  lng: number
  fulfillment_method: string | null
  status: string
  found_at: string | null
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ""

export default function DistributionDropView({ dropId }: { dropId: string }) {
  const [drop, setDrop] = useState<AccessDrop | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [collecting, setCollecting] = useState(false)
  const [collected, setCollected] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        window.location.href = "/auth?from=" + encodeURIComponent("/halozat?distribution_drop=" + dropId)
        return
      }

      const response = await fetch("/api/distribution/drops/" + encodeURIComponent(dropId) + "/access", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      })
      const json = await response.json()
      if (cancelled) return
      if (!response.ok || !json?.ok) {
        setError(json?.error || "A spot nem érhető el.")
        return
      }
      setDrop(json.drop)
      setCollected(json.drop.status === "collected")
    }

    void load()
    return () => { cancelled = true }
  }, [dropId])

  useEffect(() => {
    if (!drop || !MAPBOX_TOKEN) return
    const container = document.getElementById("distribution-drop-map")
    if (!container) return

    mapboxgl.accessToken = MAPBOX_TOKEN
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [drop.lng, drop.lat],
      zoom: 16.5,
      attributionControl: false,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right")

    const marker = new mapboxgl.Marker({ color: "#a3e635" })
      .setLngLat([drop.lng, drop.lat])
      .addTo(map)

    return () => {
      marker.remove()
      map.remove()
    }
  }, [drop])

  async function handleCollect() {
    if (!drop || collecting || collected) return

    setCollecting(true)
    setError(null)

    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) {
      setError("A bejelentkezés lejárt.")
      setCollecting(false)
      return
    }

    const formData = new FormData()
    formData.set("message", message)
    if (photo) formData.set("photo", photo)

    const response = await fetch("/api/distribution/drops/" + encodeURIComponent(drop.id) + "/collect", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    })
    const json = await response.json()

    if (!response.ok || !json?.ok) {
      setError(json?.error || "Nem sikerült rögzíteni a megtalálást.")
      setCollecting(false)
      return
    }

    setCollected(true)
    setCollecting(false)
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-zinc-200">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">HÁLÓZAT / HIBA</p>
          <p className="mt-4 text-xl font-bold">{error}</p>
          <a href="/fooldal-3" className="mt-6 inline-block border border-zinc-700 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-zinc-300">VISSZA</a>
        </div>
      </main>
    )
  }

  if (!drop) {
    return <main className="flex min-h-screen items-center justify-center bg-black text-zinc-500">Térkép előkészítése…</main>
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div id="distribution-drop-map" className="h-[52vh] min-h-[360px] w-full border-b border-zinc-800" />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-lime-200/70">FELFEDETT SZPOT</p>
        <h1 className="mt-2 text-3xl font-black">{drop.product_name}</h1>
        <p className="mt-2 text-sm text-zinc-500">{drop.city}{drop.district ? " · " + drop.district : ""}</p>
        <div className="mt-6 border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">HELYSZÍNI INSTRUKCIÓ</p>
          <p className="mt-2 text-base leading-7 text-zinc-300">{drop.location_hint}</p>
        </div>

        {collected ? (
          <div className="mt-8 border border-lime-200/30 bg-lime-100/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-100">MEGTALÁLTAD.</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">A megtalálás rögzítve. Ez a szpot kikerült az aktív listából.</p>
          </div>
        ) : (
          <div className="mt-8 border border-zinc-800 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">MEGTALÁLTAM</p>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Rövid üzenet V.-nek…"
              className="mt-3 w-full border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-200 outline-none focus:border-lime-200/50"
            />
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              onChange={(event) => setPhoto(event.target.files?.[0] || null)}
              className="mt-3 block w-full text-xs text-zinc-500"
            />
            <button
              type="button"
              onClick={() => void handleCollect()}
              disabled={collecting}
              className="mt-5 min-h-12 w-full border border-lime-200/50 bg-lime-100 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-black disabled:opacity-50"
            >
              {collecting ? "RÖGZÍTÉS…" : "MEGTALÁLTAM"}
            </button>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>
        )}

        <a href="/halozat" className="mt-8 inline-block text-[10px] uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-300">← VISSZA A HÁLÓZATRA</a>
      </div>
    </main>
  )
}

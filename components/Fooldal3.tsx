"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw, MapPin, Truck, Clock3, Hand } from "lucide-react"
import Footer from "@/components/Footer"
import MainContent from "@/components/MainContent"
import { createClient } from "@/lib/browser"
import { buildAuthHref } from "@/lib/authRedirect"
import {
  DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF,
  fulfillmentLabel,
  shippingFeeHuf,
  type DistributionFulfillmentMethod,
} from "@/lib/distributionNetwork"

type Drop = {
  id: string
  product_id: string
  product_name: string
  price_huf: number
  city: string
  district: string | null
  location_hint: string
  fulfillment_options: DistributionFulfillmentMethod[]
  hidden_at: string
}

const CITY_ORDER = ["BUDAPEST", "PÉCS", "SZEGED", "BÉCS"]

function elapsedLabel(iso: string) {
  const value = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - value)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "MOST KERÜLT KI"
  if (minutes < 60) return "KINT: " + minutes + " PERC"
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? "KINT: " + hours + " ÓRA " + rest + " PERC" : "KINT: " + hours + " ÓRA"
  const days = Math.floor(hours / 24)
  return "KINT: " + days + " NAP " + (hours % 24) + " ÓRA"
}

export default function Fooldal3() {
  const [drops, setDrops] = useState<Drop[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [city, setCity] = useState("ALL")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDrop, setSelectedDrop] = useState<Drop | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<DistributionFulfillmentMethod | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const fetchDrops = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await fetch(
        "/api/distribution/drops" + (city !== "ALL" ? "?city=" + encodeURIComponent(city) : ""),
        { cache: "no-store" },
      )
      const json = await response.json()
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Nem sikerült betölteni a szpotokat.")
      setDrops(Array.isArray(json.drops) ? json.drops : [])
      setCities(Array.isArray(json.cities) ? json.cities : [])
    } catch (error) {
      console.error("[fooldal-3] drops fetch failed", error)
      setDrops([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [city])

  useEffect(() => { void fetchDrops() }, [fetchDrops])
  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const orderedCities = useMemo(() => {
    const values = Array.from(new Set(CITY_ORDER.concat(cities)))
    return ["ALL"].concat(values)
  }, [cities])

  function openDrop(drop: Drop) {
    setSelectedDrop(drop)
    setSelectedMethod(drop.fulfillment_options[0] || null)
    setCheckoutError(null)
    setCheckoutLoading(false)
  }

  async function startCheckout(drop: Drop, method: DistributionFulfillmentMethod) {
    setCheckoutLoading(true)
    setCheckoutError(null)

    const supabase = createClient()
    const sessionResult = await supabase.auth.getSession()
    const token = sessionResult.data?.session?.access_token || null

    if (!token) {
      window.location.href = buildAuthHref("/fooldal-3?drop=" + encodeURIComponent(drop.id) + "&method=" + encodeURIComponent(method))
      return
    }

    try {
      const response = await fetch("/api/distribution/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          drop_id: drop.id,
          fulfillment_method: method,
        }),
      })

      const json = await response.json()
      if (!response.ok || !json?.ok || !json.url) {
        if (response.status === 401) {
          window.location.href = buildAuthHref("/fooldal-3?drop=" + encodeURIComponent(drop.id) + "&method=" + encodeURIComponent(method))
          return
        }
        throw new Error(json?.error || "A fizetés indítása nem sikerült.")
      }

      window.location.href = json.url
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "A fizetés indítása nem sikerült.")
      setCheckoutLoading(false)
      void fetchDrops(true)
    }
  }

  return (
    <MainContent fullWidth>
      <div className="min-h-screen bg-[#020202] text-zinc-200">
        <header className="mx-auto w-full max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
          <div className="max-w-4xl">
            <p className="text-right text-[18px] font-normal italic leading-relaxed tracking-tight text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Ez nem egy könyv.<br />
              Nincs címe, nincs írója, nincs kiadója.<br />
              Nem kapható a könyvesboltokban.<br />
              Meg kell találnod.
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
          <section aria-labelledby="active-spots">
            <div className="flex flex-row justify-between gap-5 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col">
                <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">01 / AKTÍV SZPOTOK</p>
                <p id="active-spots" className="text-left text-[15px] uppercase font-normal leading-relaxed tracking-normal text-zinc-400 sm:text-base"
                style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  Aktív lelőhelyek
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchDrops(true)}
                disabled={refreshing}
                className="inline-flex gap-4 h-8 px-3 items-center rounded-full bg-lime-300/0 border border-zinc-700/40 text-[10px] font-bold uppercase tracking-[0.2em] text-lime-100 transition hover:border-lime-200/50 hover:text-lime-100 disabled:opacity-50"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Frissítés</span>
                <RefreshCw size={14}  className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap p-1 border border-zinc-800/70 rounded-md">
              {orderedCities.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCity(item)}
                  className={
                    "px-3 py-2 text-[14px] font-bold uppercase transition " +
                    (city === item ? "bg-lime-300/20 rounded-sm text-zinc-100" : "text-zinc-500 hover:text-zinc-200")
                  }
                >
                  {item === "ALL" ? "ÖSSZES" : item}
                </button>
              ))}
            </div>

            <div className="">
              {loading ? (
                <div className="px-4 text-center text-xs uppercase tracking-[0.2em] text-zinc-600">LELŐHELY KERESÉSE…</div>
              ) : drops.length === 0 ? (
                <div className="px-4 py-8">
                  <p className="text-xl font-black tracking-tight text-zinc-100"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                  >Hopp, mindet elkapkodták.</p>
                  <p className="mt-3 max-w-xl text-md leading-4 text-zinc-400">
                    Szólj Vállalhatatlannak, hogy tegyen ki párat.
                  </p>
                  <a
                    href="mailto:hello@vallalhatatlan.online?subject=K%C3%B6vetkez%C5%91%20drop"
                    className="mt-7 inline-flex h-11 items-center rounded-md border border-lime-200/40 px-5 text-[12px] font-bold uppercase tracking-[0.2em] text-lime-100 transition hover:bg-lime-100 hover:text-black"
                  >
                    KÖVETELEM A KÖVETKEZŐ DROPOT
                  </a>
                </div>
              ) : (
                drops.map((drop, index) => (
                  <article key={drop.id} className="mt-4 group grid gap-5 px-4 py-6 sm:grid-cols-[72px_1fr_auto] sm:items-center bg-lime-300/5 border border-zinc-800/70 hover:border-lime-200/50 hover:bg-lime-300/15 rounded-md">
                    <div className="hidden text-right text-3xl font-black tabular-nums text-zinc-800 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-row justify-between items-center gap-3">
                        <h3 className="text-lg font-extrabold tracking-tight text-zinc-100" style={{ fontFamily: "var(--font-mono-tech)" }}>{drop.product_name}</h3>
                        <div className="flex flex-col text-right">
                          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600">{drop.city}</span>
                          <p className="text-[14px] text-lime-100/70">{drop.location_hint}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <div className="text-lg font-bold tabular-nums text-zinc-100">{drop.price_huf.toLocaleString("hu-HU")} Ft</div>
                      <button
                        type="button"
                        onClick={() => openDrop(drop)}
                        className="mt-2 inline-flex h-10 items-center rounded-md border border-lime-200/10 px-4 text-[12px] font-normal uppercase tracking-[0.18em] text-lime-100 transition hover:bg-lime-100 hover:text-black"
                      >
                        MUTASD A PONTOS HELYSZÍNT
                        <MapPin className="ml-2" size={14} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </main>

        {selectedDrop ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="w-full max-w-xl border border-zinc-700/0 bg-[#000000] p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3 className="mt-2 text-2xl font-black text-zinc-100"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                  >{selectedDrop.product_name}</h3>
                  <p className="mt-1 text-[18px] text-zinc-500">{selectedDrop.city}{selectedDrop.district ? " · " + selectedDrop.district : ""}</p>
                </div>
                <button type="button" onClick={() => setSelectedDrop(null)} className="text-4xl text-zinc-600 hover:text-zinc-200" aria-label="Bezárás">×</button>
              </div>

              <div className="mt-2 bg-black/30">
                <p className="text-md leading-6 text-lime-100">
                  A pontos helyszín és az átvételi instrukció a vásárlás után nyílik meg.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {selectedDrop.fulfillment_options.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={
                        "border px-3 py-1 text-left transition" +
                        (selectedMethod === method
                          ? "border-lime-100/0 bg-lime-300 text-zinc-900"
                          : "border-zinc-800/0 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200")
                      }
                    >
                      <div className="text-[19px] font-bold uppercase tracking-[0em]">{fulfillmentLabel(method)}</div>
                      <div className="mt-1 text-[16px] text-zinc-800">
                        {shippingFeeHuf(method) > 0 ? "+ " + shippingFeeHuf(method).toLocaleString("hu-HU") + " Ft szállítás" : "nincs plusz díj"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex items-end justify-between gap-4 border-t border-zinc-800 pt-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">FIZETENDŐ</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-zinc-100">
                    {selectedMethod
                      ? (selectedDrop.price_huf + shippingFeeHuf(selectedMethod)).toLocaleString("hu-HU") + " Ft"
                      : "—"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!selectedMethod || checkoutLoading}
                  onClick={() => selectedMethod && void startCheckout(selectedDrop, selectedMethod)}
                  className="min-h-12 border border-lime-200/50 bg-lime-100 px-5 text-[19px] font-black uppercase tracking-[0em] text-zinc-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading ? "FIZETÉS…" : "LEVADÁSZOM"}
                </button>
              </div>

              {checkoutError ? <p className="mt-4 text-sm text-red-300">{checkoutError}</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      <Footer />
    </MainContent>
  )
}

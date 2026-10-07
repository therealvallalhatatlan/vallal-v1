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
        <header className="mx-auto w-full max-w-6xl px-5 pb-12 pt-16 sm:px-8 sm:pt-24">
          <div className="max-w-4xl">
            <p className="mb-7 text-[10px] uppercase tracking-[0.32em] text-lime-200/70">VÁLLALHATATLAN / DISZTRIBÚCIÓS HÁLÓZAT</p>
            <h1 className="text-4xl font-extrabold leading-[0.98] tracking-tight text-zinc-50 sm:text-6xl">
              Ez nem egy könyv.
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-zinc-400 sm:text-xl sm:leading-9">
              Nincs címe, nincs írója, nincs kiadója.<br />
              Nem kapható a könyvesboltokban.<br />
              <span className="text-zinc-100">Elrejtem, és neked meg kell találnod.</span>
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <section aria-labelledby="active-spots">
            <div className="flex flex-col gap-5 border-t border-zinc-800 pt-7 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">01 / AKTÍV SZPOTOK</p>
                <h2 id="active-spots" className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                  Ami most az utcán van.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => void fetchDrops(true)}
                disabled={refreshing}
                className="inline-flex h-10 items-center gap-2 self-start border border-zinc-700 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-lime-200/50 hover:text-lime-100 disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                FRISSÍTÉS
              </button>
            </div>

            <div className="mt-8 flex flex-wrap border-y border-zinc-800">
              {orderedCities.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCity(item)}
                  className={
                    "px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition " +
                    (city === item ? "bg-zinc-100 text-black" : "text-zinc-500 hover:text-zinc-200")
                  }
                >
                  {item === "ALL" ? "ÖSSZES" : item}
                </button>
              ))}
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-zinc-600">
              A legrégebb óta kint lévő könyv mindig előre kerül.
            </div>

            <div className="mt-5 divide-y divide-zinc-800 border-y border-zinc-800">
              {loading ? (
                <div className="px-4 py-16 text-center text-xs uppercase tracking-[0.2em] text-zinc-600">SZPOTOK KERESÉSE…</div>
              ) : drops.length === 0 ? (
                <div className="px-5 py-16">
                  <p className="text-2xl font-black tracking-tight text-zinc-100">Hopp, mindet elkapkodták.</p>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-500">
                    Szólj Vállalhatatlannak, hogy tegyen ki párat.
                  </p>
                  <a
                    href="mailto:hello@vallalhatatlan.online?subject=K%C3%B6vetkez%C5%91%20drop"
                    className="mt-7 inline-flex h-11 items-center border border-lime-200/40 px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-lime-100 transition hover:bg-lime-100 hover:text-black"
                  >
                    KÖVETELEM A KÖVETKEZŐ DROPOT
                  </a>
                </div>
              ) : (
                drops.map((drop, index) => (
                  <article key={drop.id} className="group grid gap-5 px-4 py-6 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                    <div className="hidden text-right text-3xl font-black tabular-nums text-zinc-800 sm:block">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-lime-200/70">{drop.city}</span>
                        {drop.district ? <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">{drop.district}</span> : null}
                      </div>
                      <h3 className="mt-2 text-xl font-extrabold tracking-tight text-zinc-100">{drop.product_name}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{drop.location_hint}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                        <span className="inline-flex items-center gap-1.5"><Clock3 size={12} /> {elapsedLabel(drop.hidden_at)}</span>
                        {drop.fulfillment_options.map((method) => (
                          <span key={method} className="inline-flex items-center gap-1.5 border border-zinc-800 px-2 py-1 text-zinc-400">
                            {method === "dead_drop" ? <MapPin size={11} /> : method === "personal" ? <Hand size={11} /> : <Truck size={11} />}
                            {fulfillmentLabel(method)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                      <div className="text-lg font-bold tabular-nums text-zinc-100">{drop.price_huf.toLocaleString("hu-HU")} Ft</div>
                      <button
                        type="button"
                        onClick={() => openDrop(drop)}
                        className="mt-2 inline-flex h-10 items-center border border-lime-200/50 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-100 transition hover:bg-lime-100 hover:text-black"
                      >
                        PONTOS HELYSZÍN
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="mt-24 border-t border-zinc-800 pt-7" aria-labelledby="shipping">
            <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">02 / NEM AKARSZ VADÁSZNI?</p>
            <div className="mt-2 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h2 id="shipping" className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                  Kérheted automatába vagy postán is.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
                  Belföld 2 500 Ft, EU 4 500 Ft, globálisan 6 500 Ft szállítás. A rendelés állapotát a Dashboardban követheted.
                </p>
              </div>
              <div className="grid grid-cols-3 border border-zinc-800 text-center">
                <div className="border-r border-zinc-800 px-4 py-4"><div className="text-lg font-black text-zinc-100">2 500</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">HU</div></div>
                <div className="border-r border-zinc-800 px-4 py-4"><div className="text-lg font-black text-zinc-100">4 500</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">EU</div></div>
                <div className="px-4 py-4"><div className="text-lg font-black text-zinc-100">6 500</div><div className="mt-1 text-[9px] uppercase tracking-[0.18em] text-zinc-600">GLOBAL</div></div>
              </div>
            </div>
          </section>
        </main>

        {selectedDrop ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="w-full max-w-xl border border-zinc-700 bg-[#080808] p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-lime-200/70">PONTOS HELYSZÍN / ÁTVÉTEL</p>
                  <h3 className="mt-2 text-2xl font-black text-zinc-100">{selectedDrop.product_name}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{selectedDrop.city}{selectedDrop.district ? " · " + selectedDrop.district : ""}</p>
                </div>
                <button type="button" onClick={() => setSelectedDrop(null)} className="text-2xl text-zinc-600 hover:text-zinc-200" aria-label="Bezárás">×</button>
              </div>

              <div className="mt-7 border border-zinc-800 bg-black/30 p-4">
                <p className="text-sm leading-6 text-zinc-400">
                  A pontos helyszín és az átvételi instrukció a vásárlás után nyílik meg.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {selectedDrop.fulfillment_options.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedMethod(method)}
                      className={
                        "border px-3 py-3 text-left transition " +
                        (selectedMethod === method
                          ? "border-lime-200 bg-lime-100/10 text-lime-100"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200")
                      }
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em]">{fulfillmentLabel(method)}</div>
                      <div className="mt-1 text-xs text-zinc-500">
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
                  className="min-h-12 border border-lime-200/50 bg-lime-100 px-5 text-[10px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading ? "FIZETÉS…" : "BESZÁLLOK"}
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

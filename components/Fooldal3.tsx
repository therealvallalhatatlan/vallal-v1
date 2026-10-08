"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { LocateFixed, MapPin, RefreshCw } from "lucide-react"
import Footer from "@/components/Footer"
import MainContent from "@/components/MainContent"
import { createClient } from "@/lib/browser"
import { buildAuthHref } from "@/lib/authRedirect"
import useUserGeolocation from "@/hooks/useUserGeolocation"
import {
  DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF,
  fulfillmentLabel,
  shippingFeeHuf,
  type DistributionFulfillmentMethod,
} from "@/lib/distributionNetwork"

const DistributionMap = dynamic(() => import("@/components/distribution/DistributionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[460px] items-center justify-center bg-[#09090b] text-[10px] uppercase tracking-[0.25em] text-zinc-600 sm:h-[540px]">
      TÉRKÉP BETÖLTÉSE…
    </div>
  ),
})

type Drop = {
  id: string
  product_name: string
  price_huf: number
  city: string
  district: string | null
  location_hint: string
  fulfillment_options: DistributionFulfillmentMethod[]
  hidden_at: string
  map_lat: number
  map_lng: number
  distance_band: string | null
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
  const { enabled: locationEnabled, location, status: locationStatus, error: locationError, requestPermission, disable } = useUserGeolocation()
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
  const lastQueryRef = useRef<{ lat: number; lng: number; city: string } | null>(null)

  const fetchDrops = useCallback(async (silent = false, forced = false) => {
    const queryLocation = location
    const lastQuery = lastQueryRef.current

    if (
      !forced &&
      queryLocation &&
      lastQuery &&
      lastQuery.city === city
    ) {
      const movedLat = queryLocation.lat - lastQuery.lat
      const movedLng = queryLocation.lng - lastQuery.lng
      const movedMeters = Math.sqrt(movedLat * movedLat + movedLng * movedLng) * 111_320
      if (movedMeters < 150) return
    }

    if (silent) setRefreshing(true)
    else setLoading(true)

    try {
      const response = await fetch("/api/distribution/drops/nearby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: queryLocation?.lat ?? null,
          lng: queryLocation?.lng ?? null,
          city,
        }),
        cache: "no-store",
      })

      const json = await response.json()
      if (!response.ok || !json?.ok) throw new Error(json?.error || "Nem sikerült betölteni a lelőhelyeket.")

      setDrops(Array.isArray(json.drops) ? json.drops : [])
      setCities(Array.isArray(json.cities) ? json.cities : [])

      if (queryLocation) {
        lastQueryRef.current = { lat: queryLocation.lat, lng: queryLocation.lng, city }
      } else {
        lastQueryRef.current = null
      }
    } catch (error) {
      console.error("[fooldal-3] distribution drops fetch failed", error)
      if (!silent) setDrops([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [city, location])

  useEffect(() => {
    void fetchDrops(false, true)
  }, [city]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!location) return
    void fetchDrops(true)
  }, [location?.lat, location?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

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
      window.location.href = buildAuthHref(
        "/fooldal-3?drop=" + encodeURIComponent(drop.id) + "&method=" + encodeURIComponent(method),
      )
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
          window.location.href = buildAuthHref(
            "/fooldal-3?drop=" + encodeURIComponent(drop.id) + "&method=" + encodeURIComponent(method),
          )
          return
        }
        throw new Error(json?.error || "A fizetés indítása nem sikerült.")
      }

      window.location.href = json.url
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "A fizetés indítása nem sikerült.")
      setCheckoutLoading(false)
      void fetchDrops(true, true)
    }
  }

  return (
    <MainContent fullWidth>
      <div className="min-h-screen bg-[#020202] text-zinc-200">
        <header className="mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
          <div className="max-w-4xl">
            <p
              className="text-right text-[18px] font-normal italic leading-relaxed tracking-tight text-zinc-300 sm:text-base"
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
            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-lime-200/60">01 / AKTÍV SZPOTOK</p>
                <p
                  id="active-spots"
                  className="text-left text-[17px] font-normal uppercase leading-relaxed tracking-normal text-zinc-300 sm:text-base"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  Vadásztérkép
                </p>
              </div>

              <button
                type="button"
                onClick={() => void fetchDrops(true, true)}
                disabled={refreshing}
                className="inline-flex h-8 items-center gap-3 self-start rounded-full border border-zinc-700/40 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-lime-100 transition hover:border-lime-200/50 disabled:opacity-50 sm:self-auto"
              >
                Frissítés
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="mt-4 border border-zinc-800/70">
              <div className="border-b border-zinc-800/70 px-4 py-4 sm:px-5">
                {!locationEnabled ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-200">
                        Keresd meg a hozzád legközelebbit
                      </p>
                      <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
                        A pozíciód csak arra kell, hogy a lelőhelyeket hozzád közel soroljuk és a térképet odahúzzuk.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={requestPermission}
                      disabled={locationStatus === "requesting"}
                      className="inline-flex min-h-11 items-center justify-center gap-2 border border-lime-200/50 bg-lime-100 px-5 text-[11px] font-black uppercase tracking-[0.18em] text-black transition hover:bg-lime-300 disabled:opacity-50"
                    >
                      <LocateFixed size={16} />
                      {locationStatus === "requesting" ? "HELY KERESÉSE…" : "POZÍCIÓM MEGOSZTÁSA"}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(163,230,53,.8)]" />
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-200">POZÍCIÓ AKTÍV</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {location ? "A legközelebbi lelőhelyek vannak elöl." : "Pozíció meghatározása…"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={disable}
                      className="self-start text-[10px] uppercase tracking-[0.16em] text-zinc-600 hover:text-zinc-300 sm:self-auto"
                    >
                      POZÍCIÓ KIKAPCSOLÁSA
                    </button>
                  </div>
                )}

                {locationError ? <p className="mt-3 text-xs text-red-300">{locationError}</p> : null}
              </div>

              <div className="p-1">
                {orderedCities.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCity(item)}
                    className={
                      "px-3 py-2 text-[12px] font-bold uppercase transition " +
                      (city === item
                        ? "bg-lime-300/20 rounded-sm text-zinc-100"
                        : "text-zinc-600 hover:text-zinc-200")
                    }
                  >
                    {item === "ALL" ? "ÖSSZES" : item}
                  </button>
                ))}
              </div>

              <div className="overflow-hidden border-t border-zinc-800/70">
                {loading ? (
                  <div className="flex h-[460px] items-center justify-center text-[10px] uppercase tracking-[0.25em] text-zinc-600 sm:h-[540px]">
                    LELŐHELY KERESÉSE…
                  </div>
                ) : (
                  <DistributionMap
                    drops={drops}
                    userLocation={location ? { lat: location.lat, lng: location.lng } : null}
                    onSelectDrop={(drop) => openDrop(drop as Drop)}
                  />
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                    {location ? "HOZZÁD LEGKÖZELEBB" : "AKTÍV LELŐHELYEK"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">{drops.length} aktív lelőhely</p>
                </div>
              </div>

              {drops.length === 0 && !loading ? (
                <div className="px-4 py-8">
                  <p
                    className="text-xl font-black tracking-tight text-zinc-100"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    Hopp, mindet elkapkodták.
                  </p>
                  <p className="mt-3 max-w-xl text-sm leading-5 text-zinc-400">
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
                <div className="mt-3 grid gap-3">
                  {drops.map((drop, index) => (
                    <article
                      key={drop.id}
                      className="group grid gap-4 border border-zinc-800/70 bg-lime-300/5 px-4 py-5 transition hover:border-lime-200/40 hover:bg-lime-300/10 sm:grid-cols-[52px_1fr_auto] sm:items-center"
                    >
                      <div className="hidden text-right text-2xl font-black tabular-nums text-zinc-800 sm:block">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3
                              className="text-lg font-extrabold tracking-tight text-zinc-100"
                              style={{ fontFamily: "var(--font-mono-tech)" }}
                            >
                              {drop.product_name}
                            </h3>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                              {drop.city}{drop.district ? " · " + drop.district : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            {location && drop.distance_band ? (
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime-100/70">{drop.distance_band}</p>
                            ) : null}
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-700">{elapsedLabel(drop.hidden_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                        <div className="text-lg font-bold tabular-nums text-zinc-100">
                          {drop.price_huf.toLocaleString("hu-HU")} Ft
                        </div>
                        <button
                          type="button"
                          onClick={() => openDrop(drop)}
                          className="mt-2 inline-flex h-10 items-center rounded-md border border-lime-200/10 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-lime-100 transition hover:bg-lime-100 hover:text-black"
                        >
                          MUTASD A HELYSZÍNT
                          <MapPin className="ml-2" size={14} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {selectedDrop ? (
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-6">
            <div className="w-full max-w-xl bg-[#000000] p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <h3
                    className="mt-2 text-2xl font-black text-zinc-100"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    {selectedDrop.product_name}
                  </h3>
                  <p className="mt-1 text-[18px] text-zinc-500">
                    {selectedDrop.city}{selectedDrop.district ? " · " + selectedDrop.district : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDrop(null)}
                  className="text-4xl text-zinc-600 hover:text-zinc-200"
                  aria-label="Bezárás"
                >
                  ×
                </button>
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
                          ? " border-lime-100/0 bg-lime-300 text-zinc-900"
                          : " border-zinc-800/0 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200")
                      }
                    >
                      <div className="text-[19px] font-bold uppercase">{fulfillmentLabel(method)}</div>
                      <div className="mt-1 text-[16px] text-zinc-800">
                        {shippingFeeHuf(method) > 0
                          ? "+ " + shippingFeeHuf(method).toLocaleString("hu-HU") + " Ft szállítás"
                          : "nincs plusz díj"}
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
                  className="min-h-12 border border-lime-200/50 bg-lime-100 px-5 text-[19px] font-black uppercase text-zinc-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
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

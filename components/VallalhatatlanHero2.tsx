"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { Montserrat } from "next/font/google"
import { RefreshCw, Volume2, VolumeX } from "lucide-react"
import Reviews from "@/components/Reviews"
import { Badge } from "@/components/Badge"
import Image from "next/image"
import { createClient } from "@/lib/browser"

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  style: ["normal", "italic"],
  weight: "800",
})

type RandomStory = {
  source: "konyv2" | "stories"
  slug: string
  title: string
  text: string
}

export default function VallalhatatlanHero2() {
  type BookCopy = {
    id: string
    copy_number: number
    status: "available" | "reserved" | "sold"
  }

  const [availableCopies, setAvailableCopies] = useState<number[]>([])
  const [randomStory, setRandomStory] = useState<RandomStory | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [pickupMethod, setPickupMethod] = useState<"dead-drop" | "automata">("dead-drop")
  const [selectedCopy, setSelectedCopy] = useState<number | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [purchaseBook, setPurchaseBook] = useState<"01" | "02" | null>(null)
  const [activeBookTab, setActiveBookTab] = useState<"01" | "02">("01")
  const [networkSpots, setNetworkSpots] = useState<Array<{ id: string; spot_type?: "free" | "paid"; type?: "physical" | "virtual"; remaining_quantity?: number | null }>>([])
  const [networkLoading, setNetworkLoading] = useState(false)
  const [networkActivity, setNetworkActivity] = useState<Array<{
    id: string
    kind: "claim" | "spot" | "signal"
    nickname: string
    title: string
    created_at: string
    comment?: string | null
  }>>([])
  const [networkActivityLoading, setNetworkActivityLoading] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Array<{
    id: string
    nickname: string
    avatarUrl: string | null
    score: number
    accepted: number
  }>>([])
  const [onlineUsersLoading, setOnlineUsersLoading] = useState(false)
  const [storyExpanded, setStoryExpanded] = useState(false)
  const [signalDraft, setSignalDraft] = useState("")
  const [signalSending, setSignalSending] = useState(false)
  const [signalStatus, setSignalStatus] = useState<string | null>(null)
  const loadAvailableCopies = async () => {
    try {
      const response = await fetch("/api/inventory", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Inventory unavailable")

      const data = (await response.json()) as { copies?: BookCopy[] }
      const copies = Array.isArray(data.copies) ? data.copies : []
      const available = copies
        .filter((copy) => copy.status === "available")
        .map((copy) => copy.copy_number)
        .filter((number) => Number.isInteger(number) && number >= 1 && number <= 100)

      setAvailableCopies(available)

      if (available.length > 0) {
        setSelectedCopy((current) =>
          current && available.includes(current)
            ? current
            : available[Math.floor(Math.random() * available.length)],
        )
      } else {
        setSelectedCopy(null)
      }
    } catch (error) {
      console.error("Failed to load available copies:", error)
    }
  }

  const randomizeCopy = () => {
    if (availableCopies.length < 2) return

    const choices = availableCopies.filter((copyNumber) => copyNumber !== selectedCopy)
    const next = choices[Math.floor(Math.random() * choices.length)]
    if (next) setSelectedCopy(next)
  }

  const handleAcquire = (bookNumber: "01" | "02") => {
    if (availableCopies.length === 0) return

    if (!selectedCopy || !availableCopies.includes(selectedCopy)) {
      const next = availableCopies[Math.floor(Math.random() * availableCopies.length)]
      if (next) setSelectedCopy(next)
    }

    setPurchaseBook(bookNumber)
  }

  const startCheckout = async () => {
    if (!selectedCopy || checkoutLoading) return

    setCheckoutLoading(true)
    setCheckoutError(null)

    try {
      const response = await fetch("/api/checkout-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          copy_number: selectedCopy,
          delivery_method: pickupMethod,
        }),
      })

      const data = (await response.json()) as {
        success?: boolean
        url?: string
        error?: string
      }

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error || "A fizetés indítása nem sikerült.")
      }

      window.location.href = data.url
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "A fizetés indítása nem sikerült.",
      )
      setCheckoutLoading(false)
      void loadAvailableCopies()
    }
  }

  const loadNetworkSpots = async () => {
    setNetworkLoading(true)
    try {
      const response = await fetch("/api/matrica/spots", { cache: "no-store" })
      if (!response.ok) throw new Error("Network unavailable")
      const data = (await response.json()) as { spots?: Array<{ id: string; spot_type?: "free" | "paid"; type?: "physical" | "virtual"; remaining_quantity?: number | null }> }
      setNetworkSpots(Array.isArray(data.spots) ? data.spots : [])
    } catch (error) {
      console.error("Failed to load network spots:", error)
    } finally {
      setNetworkLoading(false)
    }
  }

  const loadNetworkActivity = async () => {
    setNetworkActivityLoading(true)
    try {
      const [activityResponse, spotsResponse, feedResponse] = await Promise.all([
        fetch("/api/matrica/activity?limit=8", { cache: "no-store" }),
        fetch("/api/matrica/spots", { cache: "no-store" }),
        fetch("/api/feed?limit=8", { cache: "no-store" }),
      ])

      const activityJson = (await activityResponse.json()) as { ok?: boolean; items?: Array<{
        id: string
        created_at: string
        user_alias: string
        spot_title: string
        comment?: string | null
      }> }

      const spotsJson = (await spotsResponse.json()) as { spots?: Array<{
        id: string
        title?: string | null
        created_at?: string
      }> }

      const feedJson = (await feedResponse.json()) as { posts?: Array<{
        id: string
        nickname?: string | null
        body?: string
        created_at: string
      }> }

      const items: Array<{
        id: string
        kind: "claim" | "spot" | "signal"
        nickname: string
        title: string
        created_at: string
        comment?: string | null
      }> = []

      if (activityResponse.ok && activityJson.ok && Array.isArray(activityJson.items)) {
        for (const item of activityJson.items.slice(0, 6)) {
          items.push({
            id: `claim-${item.id}`,
            kind: "claim",
            nickname: item.user_alias,
            title: item.spot_title,
            created_at: item.created_at,
            comment: item.comment,
          })
        }
      }

      if (spotsResponse.ok && Array.isArray(spotsJson.spots)) {
        for (const spot of spotsJson.spots.slice(0, 6)) {
          if (!spot.created_at) continue
          items.push({
            id: `spot-${spot.id}`,
            kind: "spot",
            nickname: "HÁLÓZAT",
            title: spot.title || "ÚJ PONT",
            created_at: spot.created_at,
          })
        }
      }

      if (feedResponse.ok && Array.isArray(feedJson.posts)) {
        for (const post of feedJson.posts.slice(0, 8)) {
          if (!post.created_at || !post.body) continue
          items.push({
            id: `signal-${post.id}`,
            kind: "signal",
            nickname: post.nickname || "ISMERETLEN NYÚL",
            title: post.body,
            created_at: post.created_at,
          })
        }
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setNetworkActivity(items.slice(0, 6))
    } catch (error) {
      console.error("Failed to load network activity:", error)
      setNetworkActivity([])
    } finally {
      setNetworkActivityLoading(false)
    }
  }

  const formatActivityTime = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "?"
    const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
    if (diffSeconds < 60) return `${diffSeconds} mp`
    const diffMinutes = Math.floor(diffSeconds / 60)
    if (diffMinutes < 60) return `${diffMinutes} p`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} ó`
    return `${Math.floor(diffHours / 24)} n`
  }

  const loadOnlineUsers = async () => {
    setOnlineUsersLoading(true)
    try {
      const supabase = (await import("@/lib/browser")).createClient()
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (!token) {
        setOnlineUsers([])
        return
      }

      const response = await fetch("/api/matrica/online-users", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const json = (await response.json()) as {
        ok?: boolean
        users?: Array<{
          id: string
          nickname: string
          avatarUrl: string | null
          score?: number
          accepted?: number
        }>
      }

      if (!response.ok || !json.ok || !Array.isArray(json.users)) {
        setOnlineUsers([])
        return
      }

      setOnlineUsers(
        json.users
          .filter((user) => typeof user?.id === "string" && typeof user?.nickname === "string")
          .map((user) => ({
            id: user.id,
            nickname: user.nickname,
            avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : null,
            score: typeof user.score === "number" ? user.score : 0,
            accepted: typeof user.accepted === "number" ? user.accepted : 0,
          })),
      )
    } catch (error) {
      console.error("Failed to load online users:", error)
      setOnlineUsers([])
    } finally {
      setOnlineUsersLoading(false)
    }
  }

  const loadRandomStory = async () => {
    setStoryLoading(true)

    try {
      const response = await fetch("/api/public/random-story", {
        cache: "no-store",
      })

      if (!response.ok) throw new Error("Random story unavailable")

      const data = (await response.json()) as RandomStory
      setRandomStory(data)
      setStoryExpanded(false)
    } catch (error) {
      console.error("Failed to load random story:", error)
    } finally {
      setStoryLoading(false)
    }
  }

  useEffect(() => {
    void loadAvailableCopies()
    void loadNetworkSpots()
    void loadNetworkActivity()
    void loadOnlineUsers()
    void loadRandomStory()

    const supabase = createClient()
    const channel = supabase
      .channel("homepage-feed-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feed_posts",
        },
        () => {
          void loadNetworkActivity()
        },
      )
      .subscribe()

    return () => {
      void channel.unsubscribe()
    }
  }, [])
  return (
    <>
  <style jsx>{`@keyframes tabIn { from { opacity: 0; transform: translateY(8px); filter: blur(3px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@keyframes modalIn { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <section
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#010101] text-green-200"
      style={{
        paddingBottom: "calc(7.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <div className="pointer-events-none absolute inset-0 fx-stripes opacity-10 mix-blend-plus-lighter" />

      <div className="relative z-20 flex min-h-0 flex-1 flex-col overflow-y-auto px-6">
        <div className="w-full pb-16 pt-16 relative">
          <p
            className="max-w-xl text-right text-[23px] font-normal italic leading-relaxed tracking-tight text-zinc-300 sm:text-base"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
           "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."<br/>
          </p>
        </div>


        <section className="mt-2 w-full" aria-label="Vállalhatatlan könyvek">
          <div className="pt-5">
            <div className="flex items-end justify-between px-4">
              <div className="flex items-end gap-6" role="tablist" aria-label="Könyvkiadások">
                {[{ number: "01", label: "Első Könyv" }, { number: "02", label: "Második Könyv" }].map((tab) => {
                  const active = activeBookTab === tab.number
                  return <button key={tab.number} type="button" role="tab" aria-selected={active} onClick={() => setActiveBookTab(tab.number as "01" | "02")} className="group relative pb-0 text-left">
                    <span className={`block text-[3rem] text-center leading-[0.72] tracking-[0.1em] transition-all duration-500 ${active ? "text-zinc-100" : "text-zinc-800 group-hover:text-zinc-500"}`} style={{ fontFamily: "var(--font-mono-tech)" }}>{tab.number}</span>
                    <span className={`mt-2 block text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 ${active ? "text-lime-100/70" : "text-zinc-700 group-hover:text-zinc-500"}`} style={{ fontFamily: "var(--font-mono-tech)" }}>{tab.label}</span>
                    <span className={`absolute -bottom-2 left-0 h-px bg-lime-100 transition-all duration-500 ${active ? "w-full opacity-80" : "w-0 opacity-0"}`} />
                  </button>
                })}
              </div>
            </div>
            {(() => {
              const books = [{ number: "01", edition: "Első Könyv", subtitle: "második kiadás", video: "/videos/konyv1.mp4", description: "Alámerülünk a kétezres évek füstös, recsegő modemektől hangos, kihajtható telefonos, vadnyugati alvilágába ahol csak a drogok minősége volt viszonylag állandó.", href: "/konyv", cover: "/cover.png" }, { number: "02", edition: "Második Könyv", subtitle: "második kiadás", video: "/videos/konyv2.mp4", description: "A Második Könyv egy éjjel-nappali internetkávézóban játszódik, a nyócker szívében. Autótolvajok, stricik, kurvák, hackerek, drogdílerek, speedes futárok, félőrült zsenik és elveszett figurák alkotják a törzsközönséget. A pult mögött pedig ott állunk mi: Pixi, Wes, Isu és én, Vállalhatatlan. Próbálunk túlélni reggelig, miközben a világ fenekestől felfordul körülöttünk.", href: "/konyv-2", cover: "/cover2.png" }]
              const activeBook = books.find((book) => book.number === activeBookTab) ?? books[0]
              return <article key={activeBook.number} role="tabpanel" className="relative mt-2 overflow-hidden rounded-md rounded-r-none border border-zinc-800 bg-[#050505] shadow-[0_24px_70px_rgba(0,0,0,0.35)] animate-[tabIn_500ms_ease-out]">
                <div className="relative aspect-video w-full overflow-hidden border-b border-zinc-800 bg-black">
                  <video className="absolute inset-0 h-full w-full object-cover" src={activeBook.video} autoPlay muted loop playsInline controls={false} preload="metadata" />
                  <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-end p-4 sm:p-5">
                    <div className="text-right">
                      <p className="text-[12px] uppercase tracking-[0.16em] text-white sm:text-xs" style={{ fontFamily: "var(--font-mono-tech)", textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>{activeBook.edition}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-zinc-300 sm:text-[9px]" style={{ fontFamily: "var(--font-mono-tech)", textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>{activeBook.subtitle}</p>
                      <Image src={activeBook.cover} alt={`${activeBook.edition} borító`} width={103} height={140} className="mt-2 float-right object-contain shadow-2xl shadow-black" />
                    </div>
                  </div>
                </div>
                <div className="px-0 pt-0">
                  <p className="max-w-2xl px-4 py-4 text-sm leading-tight text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>{activeBook.description}</p>
                  <button type="button" onClick={() => handleAcquire(activeBook.number as "01" | "02")} disabled={availableCopies.length === 0} className="group mt-0 flex min-h-14 w-full items-center justify-between rounded-md border-4 border-zinc-100/20 bg-black px-5 py-4 text-left text-zinc-100 transition-all duration-300 hover:bg-zinc-100/10 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 sm:min-h-[62px]" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      <span className="text-base font-normal uppercase tracking-[0.12em] sm:text-lg">Levadászom a gecibe</span>
                      <span className="text-2xl transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            })()}
          </div>
        </section>


        {purchaseBook && (
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
            style={{ animation: 'modalIn 0.3s ease-out both' }}
            role="dialog"
            aria-modal="true"
            aria-label="Könyv megszerzése"
          >
            <button
              type="button"
              onClick={() => setPurchaseBook(null)}
              className="absolute inset-0 cursor-default"
              aria-label="Bezárás"
            />

            <div className="relative z-10 w-full overflow-hidden bg-black">
              <div className="relative border-t border-zinc-800 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setPurchaseBook(null)}
                  className="absolute top-2 right-2 h-8 w-8 text-2xl text-zinc-500 transition-colors hover:text-zinc-100"
                  aria-label="Bezárás"
                >
                  ×
                </button>
              </div>

              <div className="p-4 sm:p-5">

                <div className="mt-4 grid gap-px bg-zinc-800 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPickupMethod("dead-drop")}
                    aria-pressed={pickupMethod === "dead-drop"}
                    className={`px-4 py-5 text-left transition-colors ${pickupMethod === "dead-drop" ? "bg-zinc-900 text-zinc-100 border border-lime-100" : "bg-[#050505] text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <span className="block text-lg uppercase tracking-[0.08em]" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      Dead drop
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      Ingyenes átvétel egy aktív átadóponton, Budapesten.
                    </span>
                    <span className="mt-3 block text-md uppercase tracking-[0.14em] text-lime-100/80" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      +0 HUF
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickupMethod("automata")}
                    aria-pressed={pickupMethod === "automata"}
                    className={`px-4 py-5 text-left transition-colors ${pickupMethod === "automata" ? " bg-zinc-900 text-zinc-100 border border-lime-100" : " bg-[#050505] text-zinc-500 hover:text-zinc-300"}`}
                  >
                    <span className="block text-lg uppercase tracking-[0.08em]" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      Posta automata
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-zinc-400" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      Csomagautomatába, országosan.
                    </span>
                    <span className="mt-3 block text-md uppercase tracking-[0.14em] text-lime-100/80" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      +2 500 HUF
                    </span>
                  </button>
                </div>

                <div className="mt-5 px-2 border-t border-zinc-800 pt-4">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                        VÉGÖSSZEG
                      </p>
                      <p className="mt-1 text-2xl text-zinc-100" style={{ fontFamily: "var(--font-mono-tech)" }}>
                        {pickupMethod === "automata" ? "12 500" : "10 000"} HUF
                      </p>
                    </div>
                    <span className="text-right text-[9px] uppercase tracking-[0.15em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      STRIPE<br />BIZTONSÁGOS FIZETÉS
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void startCheckout()}
                    disabled={!selectedCopy || checkoutLoading}
                    className="mb-6 flex min-h-14 w-full items-center justify-between rounded-md border-2 border-zinc-600 px-3 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-100 transition-all hover:border-lime-100/70 hover:bg-zinc-100/5 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ fontFamily: "var(--font-mono-tech)" }}
                  >
                    <span>{checkoutLoading ? "STRIPE INDÍTÁSA..." : "Megveszem"}</span>
                    <span aria-hidden="true">🤍</span>
                  </button>

                  {checkoutError && (
                    <p className="mt-3 text-xs leading-relaxed text-rose-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      {checkoutError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <section className="mt-4 w-full">
          <Reviews />
        </section>

        <section className="pt-10">
          <div className="pt-4">
            <div className="mb-3 flex items-center justify-between font-mono text-sm uppercase not-italic text-zinc-200 border-t pt-4 pb-1 border-b border-zinc-800">
              <p
                  className="mb-3 text-[11px] uppercase tracking-[0.24em] text-zinc-400"
                  style={{ fontFamily: "var(--font-mono-tech)" }}
                >
                  MILYEN BÁTOR NYUSZI VAGY?
                </p>
            </div>
            <video
              className="rounded-3xl relative left-1/2 mt-0 block w-screen -translate-x-1/2"
              src="/videos/dd3.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              preload="metadata"
            />
            <div className="">
              <p className="mt-6 text-right text-[20px] font-semibold italic leading-relaxed text-zinc-300"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                Terjesztés:<br/><span className="text-lime-100">Dead Drop [ˈdɛd drɒp]</span>
              </p>
              <p className="pt-4 text-right text-sm font-normal italic leading-relaxed text-zinc-300 sm:text-base" style={{ fontFamily: "var(--font-mono-tech)" }}>
                Egy biztonságos helyre elrejtem neked.<br/>Kapsz egy koordinátát, pár fotót és<br/>egy fasza kis leírást. 48 órád van.
              </p>

              <p className="pb-6 pt-4 text-[10px] leading-[1.8] text-zinc-400 text-right"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                Nyugi. Ha 48 órán belül érsz oda és nincs ott - újraküldöm.<br/>De erre még egyszer sem volt szükség.
              </p>
            </div>

            <div className="flex justify-end gap-2 mb-4">
              <div className="relative group">
                <Badge className="cursor-progress text-[11px] rounded-xs tracking-widest px-3 py-1 uppercase border border-lime-100/30 bg-transparent text-zinc-300">Budapest</Badge>
              </div>
              <div className="relative group">
                <Badge className="cursor-not-allowed text-[11px] rounded-none tracking-widest px-3 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">Szeged</Badge>
              </div>
              <div className="relative group">
                <Badge className="cursor-not-allowed text-[11px] rounded-none tracking-widest px-3 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">Pécs</Badge>
              </div>
              <div className="relative group">
                <Badge className="cursor-not-allowed text-[11px] rounded-none tracking-widest px-3 py-1 uppercase border border-zinc-800 bg-transparent text-zinc-600">London</Badge>
              </div>
            </div>


            <div className="bg-black border-t border-l border-b border-zinc-800 pt-9 pb-4 mt-12">
                <video
                  className="rounded-full h-auto w-36 float-right"
                  src="/420.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls={false}
                  preload="metadata"
                />
                <p className="ml-4 text-left pt-12 text-sm font-normal italic leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  Bízhatsz bennem, nyúl vagyok.<br/> 
                  Ha kérdésed van 
                  <Link href="/kapcsolat" className="ml-2 mr-2 text-lime-100 underline" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  itt tudsz  
                  </Link>
                   írni nekem.
                </p>
            </div>
            
          </div>
        </section>
        
        <section className="mt-16 w-full" aria-label="Élő Nyúlhálózat">
          <div className="bg-[#030303]">
            <div className="flex items-center justify-between border-t border-b border-zinc-800 px-0 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-200/60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-100" />
                </span>
                <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  HÁLÓZAT
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                {networkLoading ? "SYNC..." : "SIGNAL OK"}
              </span>
            </div>
            <div className="border-r border-zinc-700">
                <p className="pt-12 mr-4 text-right text-[20px] font-semibold italic leading-normal text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  <span className="text-lime-100">A Hálózat.</span> Hogy ez mire lesz jó,<br/>még mi magunk sem tudjuk.
                </p>
                <p className="pt-4 mr-4 ml-20 text-right text-sm font-normal italic leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                  Ez egy térkép, amin elhelyezhetünk fizikai, vagy digitális dolgokat. Zenét, képet, szöveget, videót, ami az adott helyhez kötődik. 
                  Csak akkor tudod megszerezni, ha ott vagy a helyszínen. 
                </p>
            </div>
            <div className="px-0 pt-6">
              <div className="relative overflow-hidden  border border-zinc-800 bg-black rounded-l-lg">
                <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(190,255,170,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(190,255,170,0.08) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 50% 50%, rgba(190,255,170,0.12), transparent 55%)" }} />
                <div className="relative grid grid-cols-2 gap-px bg-zinc-800 sm:grid-cols-4">
                  {[
                    ["AKTÍV", networkSpots.length.toString().padStart(2, "0")],
                    ["INGYENES", networkSpots.filter((spot) => spot.spot_type !== "paid").length.toString().padStart(2, "0")],
                    ["FIZIKAI", networkSpots.filter((spot) => spot.type === "physical").length.toString().padStart(2, "0")],
                    ["VIRTUÁLIS", networkSpots.filter((spot) => spot.type === "virtual").length.toString().padStart(2, "0")],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-black/90 px-3 py-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>{label}</p>
                      <p className="mt-1 text-2xl leading-none text-zinc-100" style={{ fontFamily: "var(--font-mono-tech)" }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="relative flex items-center justify-between border-t border-zinc-800 px-3 py-3">
                  <p className="max-w-[70%] text-[10px] uppercase tracking-[0.12em] leading-relaxed text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    A hálózat él
                  </p>
                  <button type="button" onClick={() => void loadNetworkSpots()} className="text-[10px] uppercase tracking-[0.16em] text-lime-100/70 transition-colors hover:text-lime-100" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    [ FRISSÍTÉS ]
                  </button>
                </div>
              </div>

              <Link href="/halozat" className="group mt-3 mb-6 flex items-center rounded-lg justify-between border-3 border-zinc-800 px-4 py-4 transition-all duration-300 hover:border-lime-100/50 hover:bg-lime-100/[0.03]">
                <div>
                  <p className="text-sm uppercase tracking-[0.14em] text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    BELÉPÉS A HÁLÓZATBA
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    TÉRKÉP · PONTOK · EMBEREK
                  </p>
                </div>
                <span className="text-3xl text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-lime-100">→</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="w-full border-b border-zinc-800" aria-label="Most történik">
          <div className="flex items-center justify-between border-t border-zinc-800 px-0 py-3" style={{ fontFamily: "var(--font-mono-tech)" }}>
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-200/40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-100" />
              </span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-zinc-200">MOST TÖRTÉNIK</span>
            </div>
            <button
              type="button"
              onClick={() => void loadNetworkActivity()}
              className="text-[9px] uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-lime-100"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              aria-label="Hálózati aktivitás frissítése"
            >
              {networkActivityLoading ? "SYNC..." : "LIVE"}
            </button>
          </div>
          <div className="divide-y divide-zinc-900">
            {networkActivity.length === 0 ? (
              <div className="py-4 text-[10px] uppercase tracking-[0.14em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                {networkActivityLoading ? "Hálózati adatok betöltése..." : "A jel jelenleg csendes."}
              </div>
            ) : (
              networkActivity.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                      <span className="text-lime-100/80">
                        {item.kind === "spot" ? "ÚJ PONT" : `@${item.nickname}`}
                      </span>{" "}
                      {item.kind === "spot"
                        ? "megjelent a hálózatban"
                        : item.kind === "signal"
                          ? "jelet küldött"
                          : "megtalált egy pontot"}
                    </p>
                    <p className={`mt-1 truncate text-[14px] tracking-[0.12em] ${item.kind === "signal" ? "text-zinc-100 normal-case" : "uppercase text-zinc-600"}`} style={{ fontFamily: "var(--font-mono-tech)" }}>
                      {item.title}{item.comment ? ` · "${item.comment}"` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap pt-0.5 text-[11px] uppercase tracking-[0.12em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    {formatActivityTime(item.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
          <Link href="/halozat" className="group flex items-center justify-between border-t border-zinc-900 py-3">
            <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-600 transition-colors group-hover:text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
              TELJES AKTIVITÁS
            </span>
            <span className="text-[12px] text-zinc-700 transition-colors group-hover:text-lime-100">→</span>
          </Link>
        </section>
        <section className="w-full " aria-label="Online nyuszik">
          <div className="flex items-center justify-between border-t border-zinc-900 px-0 py-3">
            <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
              ONLINE NYUSZIK
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
              {onlineUsersLoading ? "SYNC..." : `${onlineUsers.length} ONLINE`}
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 pt-1 pr-2 scrollbar-hide">
            {onlineUsers.length === 0 ? (
              <span className="py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
                {onlineUsersLoading ? "Nyuszik keresése..." : "A hálózat most csendes."}
              </span>
            ) : (
              onlineUsers.map((user) => (
                <Link
                  key={user.id}
                  href="/halozat"
                  className="group flex min-w-[76px] shrink-0 flex-col items-center gap-2"
                  title={`@${user.nickname} · ${user.score} SIGNAL`}
                >
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-zinc-800 bg-zinc-950 transition-all duration-200 group-hover:border-lime-100/60 group-hover:shadow-[0_0_16px_rgba(163,230,53,0.12)]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover grayscale transition-all duration-200 group-hover:grayscale-0" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-base font-bold text-zinc-400">
                        {user.nickname.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-lime-300" />
                  </div>
                  <span className="max-w-[76px] truncate text-[11px] uppercase tracking-[0.08em] text-zinc-600 transition-colors group-hover:text-zinc-300" style={{ fontFamily: "var(--font-mono-tech)" }}>
                    @{user.nickname}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="mt-16 w-full" aria-label="Random Vállalhatatlan Sztori">
          <div
            className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] not-italic text-zinc-200 border-t border-zinc-800 pt-4"
            style={{ fontFamily: "var(--font-mono-tech)" }}
          >
            <span>Random Vállalhatatlan Sztori</span>
            <button
              type="button"
              onClick={() => void loadRandomStory()}
              disabled={storyLoading}
              aria-label="Új random sztori"
              title="Új random sztori"
              className="group flex h-7 w-7 items-center justify-center text-zinc-200 transition-colors hover:text-lime-100 disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                strokeWidth={2.5}
                className={`transition-transform duration-500 ${storyLoading ? "animate-spin" : "group-hover:rotate-180"}`}
              />
            </button>
          </div>

          {randomStory ? (
            <article className="border-t border-zinc-800 pt-10">
              <h3
                className={`${montserrat.className} py-2 text-3xl leading-tighter text-zinc-100`}
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {randomStory.title}
              </h3>

              {(() => {
                const paragraphs = randomStory.text
                  .split(/\n\s*\n/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                const visibleParagraphs = storyExpanded
                  ? paragraphs
                  : paragraphs.slice(0, 2)

                return (
                  <>
                    <div className="relative">
                      <div
                        className={storyExpanded ? "" : "relative max-h-[390px] overflow-hidden"}
                      >
                        {visibleParagraphs.map((paragraph, index) => (
                          <p
                            key={index}
                            className="mt-4 whitespace-pre-line text-md leading-relaxed text-zinc-300"
                            style={{ fontFamily: "var(--font-mono-tech)" }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>

                      {!storyExpanded && paragraphs.length > 2 && (
                        <div
                          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#010101] via-[#010101]/80 to-transparent"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    {paragraphs.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setStoryExpanded((value) => !value)}
                        className="mt-5 flex w-1/2 mx-auto items-center justify-between rounded-md border border-zinc-800 px-3 py-3 text-left text-[11px] uppercase tracking-[0.2em] text-zinc-400 transition-all duration-300 hover:border-lime-100/50 hover:bg-lime-100/[0.03] hover:text-lime-100"
                        style={{ fontFamily: "var(--font-mono-tech)" }}
                        aria-expanded={storyExpanded}
                      >
                        <span>{storyExpanded ? "BEZÁROM" : "OLVASOM TOVÁBB"}</span>
                        <span className="text-base transition-transform duration-300">
                          {storyExpanded ? "↑" : "→"}
                        </span>
                      </button>
                    )}
                  </>
                )
              })()}
            </article>
          ) : (
            <div
              className="border-t border-zinc-800 pt-4 font-mono text-sm italic text-zinc-600"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {storyLoading ? "Sztori betöltése..." : "Nincs elérhető sztori."}
            </div>
          )}
        </section>

        <section className="mt-16 w-full border-t border-zinc-800 pt-4" aria-label="Küldj egy jelet">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] uppercase tracking-[0.14em] text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
                KÜLDJ EGY JELET
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
                Hagyj valamit a következő nyúlnak.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-zinc-800 bg-black">
            <textarea
              value={signalDraft}
              onChange={(event) => {
                setSignalDraft(event.target.value)
                if (signalStatus) setSignalStatus(null)
              }}
              maxLength={240}
              rows={3}
              placeholder="> írj valamit a következő nyúlnak..."
              className="w-full resize-none border-0 bg-transparent px-4 py-4 text-md leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-100 focus:ring-0"
              style={{ fontFamily: "var(--font-mono-tech)" }}
              disabled={signalSending}
            />
            <div className="flex items-center justify-between border-t border-zinc-900 px-3 py-2">
              <span className="text-[9px] uppercase tracking-[0.12em] text-zinc-700" style={{ fontFamily: "var(--font-mono-tech)" }}>
                {signalDraft.length}/240
              </span>
              <button
                type="button"
                onClick={async () => {
                  const body = signalDraft.trim()
                  if (!body || signalSending) return

                  const supabase = createClient()
                  const { data: sessionData } = await supabase.auth.getSession()
                  const token = sessionData?.session?.access_token

                  if (!token) {
                    setSignalStatus("BEJELENTKEZÉS SZÜKSÉGES")
                    return
                  }

                  setSignalSending(true)
                  setSignalStatus(null)

                  try {
                    const response = await fetch("/api/feed", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: "Bearer " + token,
                      },
                      body: JSON.stringify({ body }),
                    })
                    const data = (await response.json()) as { ok?: boolean; error?: string }

                    if (!response.ok || !data.ok) {
                      throw new Error(data.error || "send_failed")
                    }

                    setSignalDraft("")
                    setSignalStatus("JEL ELKÜLDVE")
                    void loadNetworkActivity()
                  } catch (error) {
                    console.error("Failed to send signal:", error)
                    setSignalStatus("A JEL NEM MENT EL")
                  } finally {
                    setSignalSending(false)
                  }
                }}
                disabled={signalSending || !signalDraft.trim()}
                className="border border-lime-100/30 bg-lime-100/[0.04] px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-lime-100/70 transition-all hover:border-lime-100/60 hover:bg-lime-100/[0.08] hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-30"
                style={{ fontFamily: "var(--font-mono-tech)" }}
              >
                {signalSending ? "KÜLDÉS..." : "KÜLDÉS →"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <span
              className={signalStatus === "JEL ELKÜLDVE" ? "text-[9px] uppercase tracking-[0.12em] text-lime-100/70" : "text-[9px] uppercase tracking-[0.12em] text-zinc-700"}
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              {signalStatus || "A jel nyilvános lesz a közösségi feedben."}
            </span>
            <Link href="/feed" className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-zinc-200" style={{ fontFamily: "var(--font-mono-tech)" }}>
              FEED →
            </Link>
          </div>
        </section>
        <div
          className="mt-8 pb-8 pt-6 font-mono text-md leading-relaxed text-zinc-400"
          style={{ fontFamily: "var(--font-mono-tech)" }}
        >
          <div className="mt-8 border-t border-zinc-900 pt-4 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            SIGNAL ORIGIN: REDDIT
            <br />
            STATUS: STILL RUNNING
          </div>
        </div>
      </div>


      </section>
    </>
  )
}

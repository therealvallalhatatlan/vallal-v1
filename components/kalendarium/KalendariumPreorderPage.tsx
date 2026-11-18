"use client"

import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

const UNIT_PRICE_HUF = 12000
const DEPOSIT_HUF = 5000
const BALANCE_HUF = UNIT_PRICE_HUF - DEPOSIT_HUF

const inputClass = "mt-2 min-h-12 w-full rounded-none border border-zinc-700 bg-black/60 px-3 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-lime-200/70 focus:ring-1 focus:ring-lime-200/20 sm:text-sm"
const labelClass = "block font-mono text-[10px] uppercase tracking-[.16em] text-zinc-400"

function formatHuf(value: number) {
  return new Intl.NumberFormat("hu-HU").format(value) + " Ft"
}

export default function KalendariumPreorderPage() {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "shipping">("pickup")
  const [note, setNote] = useState("")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const totals = useMemo(() => {
    const count = Number(quantity) || 1
    return {
      deposit: count * DEPOSIT_HUF,
      balance: count * BALANCE_HUF,
      total: count * UNIT_PRICE_HUF,
    }
  }, [quantity])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!consent) {
      setError("A rendelés leadásához fogadd el az adatkezelési tájékoztatót.")
      return
    }

    setBusy(true)
    try {
      const response = await fetch("/api/kalendarium/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          fullName,
          quantity: Number(quantity),
          fulfillmentMethod,
          note,
          consent: true,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          data.error === "rate_limited"
            ? "Túl sok próbálkozás történt. Kérjük, próbáld újra később."
            : data.error === "payment_unavailable"
              ? "A bankkártyás fizetés jelenleg nem érhető el. Próbáld újra később."
              : data.error === "checkout_failed"
                ? "A fizetési oldal most nem indítható el. Nem történt terhelés. Próbáld újra."
                : "Most nem sikerült elindítani a rendelést. Ellenőrizd az adatokat, majd próbáld újra."
        )
      }
      if (typeof data.url === "string") {
        window.location.assign(data.url)
        return
      }
      throw new Error("A fizetési oldal nem érhető el.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Váratlan hiba történt.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080909] px-4 py-10 text-zinc-100 sm:py-16">
      <div className="mx-auto max-w-xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="font-mono text-[10px] uppercase tracking-[.2em] text-zinc-500 transition hover:text-lime-200">
            Vállalhatatlan
          </a>
          <span className="font-mono text-[9px] uppercase tracking-[.18em] text-zinc-600">VK / 2027</span>
        </header>

        <section className="border border-zinc-700 bg-[#0d1010]">
          <div className="border-b border-zinc-800 px-5 py-6 sm:px-8">
            <p className="font-mono text-[9px] uppercase tracking-[.24em] text-lime-200">Előrendelés</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl" style={{fontFamily:"var(--font-hero)"}}>
              Kalendárium <span className="text-lime-200">2027</span>
            </h1>
          </div>

          <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>E-mail-cím *
                <input
                  className={inputClass}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="email@pelda.hu"
                />
              </label>
              <label className={labelClass}>Név
                <input
                  className={inputClass}
                  autoComplete="name"
                  maxLength={120}
                  value={fullName}
                  onChange={event => setFullName(event.target.value)}
                  placeholder="Név vagy becenév"
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>Példányszám
                <select className={inputClass} value={quantity} onChange={event => setQuantity(event.target.value)}>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(count => (
                    <option key={count} value={String(count)}>{count} db</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>Átvétel módja
                <select
                  className={inputClass}
                  value={fulfillmentMethod}
                  onChange={event => setFulfillmentMethod(event.target.value as "pickup" | "shipping")}
                >
                  <option value="pickup">Személyes / közösségi átvétel</option>
                  <option value="shipping">Postai vagy csomagküldés</option>
                </select>
              </label>
            </div>

            <label className={labelClass}>Megjegyzés <span className="text-zinc-600">(nem kötelező)</span>
              <textarea
                className={inputClass + " min-h-20 resize-y"}
                maxLength={500}
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Egyéb információ..."
              />
            </label>

            <div className="border border-zinc-800 bg-black/50 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-400">Teljes ár · {quantity} db</span>
                <strong className="tabular-nums text-zinc-100">{formatHuf(totals.total)}</strong>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[.15em] text-lime-200">Most fizetendő előleg</span>
                <strong className="text-xl tabular-nums text-lime-200">{formatHuf(totals.deposit)}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-500">Fennmaradó összeg később</span>
                <span className="tabular-nums text-zinc-300">{formatHuf(totals.balance)}</span>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-zinc-600">
                Az 5 000 Ft / példány előleg beleszámít a 12 000 Ft-os vételárba. A fennmaradó 7 000 Ft / példány összegét később, a kiadvány átvétele előtt kell rendezni. A szállítás esetleges díja külön kerül egyeztetésre.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-zinc-500">
              <input
                type="checkbox"
                checked={consent}
                onChange={event => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-lime-200"
              />
              <span>
                Elfogadom az <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-lime-200 underline underline-offset-4">adatkezelési tájékoztatót</a>, és hozzájárulok, hogy a rendeléssel kapcsolatban e-mailben megkeressetek.
              </span>
            </label>

            {error ? (
              <p role="alert" className="border border-red-900/70 bg-red-950/30 p-3 text-xs leading-5 text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex min-h-14 w-full items-center justify-center gap-3 bg-lime-200 px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-black transition hover:bg-lime-100 disabled:cursor-wait disabled:opacity-50"
            >
              {busy
                ? <><Loader2 className="animate-spin" size={16}/> Fizetési oldal indítása...</>
                : <>Előrendelés · {formatHuf(totals.deposit)} előleg <ArrowRight size={16}/></>}
            </button>
            <p className="text-center font-mono text-[9px] uppercase tracking-wider text-zinc-700">
              Biztonságos bankkártyás fizetés a Stripe rendszerén keresztül
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}

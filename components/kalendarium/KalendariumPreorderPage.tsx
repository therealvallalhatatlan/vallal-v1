"use client"

import { FormEvent, useMemo, useState } from "react"
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react"

type PreorderType = "reservation" | "supporter"
type SubmissionResult = { reference: string; preorderType: PreorderType }

const STANDARD_PRICE_HUF = 12000
const SUPPORTER_PRICE_HUF = 10000
const SUPPORTER_DEPOSIT_HUF = 5000
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
  const [preorderType, setPreorderType] = useState<PreorderType>("reservation")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<SubmissionResult | null>(null)

  const totals = useMemo(() => {
    const count = Number(quantity) || 1
    const unitPrice = preorderType === "supporter" ? SUPPORTER_PRICE_HUF : STANDARD_PRICE_HUF
    const deposit = preorderType === "supporter" ? SUPPORTER_DEPOSIT_HUF * count : 0
    return {
      total: unitPrice * count,
      deposit,
      balance: preorderType === "supporter" ? unitPrice * count - deposit : 0,
    }
  }, [quantity, preorderType])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!consent) {
      setError("A beküldéshez fogadd el az adatkezelési tájékoztatót.")
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
          preorderType,
          consent: true,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          data.error === "rate_limited"
            ? "Túl sok próbálkozás történt. Kérjük, próbáld újra később."
            : data.error === "payment_unavailable"
              ? "A támogatói fizetés jelenleg nem érhető el. A sima, ingyenes előjegyzést továbbra is leadhatod."
              : data.error === "checkout_failed"
                ? "A fizetési oldal most nem indítható el. Nem történt terhelés. Próbáld újra."
                : "Most nem sikerült rögzíteni az előjegyzést. Ellenőrizd az adatokat, majd próbáld újra."
        )
      }

      if (typeof data.url === "string") {
        window.location.assign(data.url)
        return
      }

      if (typeof data.reference === "string") {
        setResult({ reference: data.reference, preorderType })
        return
      }
      throw new Error("A rendszer nem adott vissza előjegyzési azonosítót.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Váratlan hiba történt.")
    } finally {
      setBusy(false)
    }
  }

  if (result) {
    return (
      <main className="min-h-screen bg-[#080909] px-4 py-10 text-zinc-100 sm:py-16">
        <div className="mx-auto max-w-xl">
          <header className="mb-8 flex items-center justify-between gap-4">
            <a href="/" className="font-mono text-[10px] uppercase tracking-[.2em] text-zinc-500 hover:text-lime-200">Vállalhatatlan</a>
            <span className="font-mono text-[9px] uppercase tracking-[.18em] text-zinc-600">VK / 2027</span>
          </header>
          <section className="border border-lime-200/30 bg-[#0d1010] p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center border border-lime-200/40 text-lime-200">
              <CheckCircle2 size={24}/>
            </div>
            <p className="mt-6 font-mono text-[9px] uppercase tracking-[.24em] text-lime-200">
              {result.preorderType === "supporter" ? "Támogatói előrendelés elindítva" : "Ingyenes előjegyzés rögzítve"}
            </p>
            <h1 className="mt-3 text-3xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>
              Köszönjük.
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              {result.preorderType === "supporter"
                ? "A támogatói előrendelésedet rögzítettük. A fizetés visszaigazolását és a részleteket e-mailben küldjük."
                : "Az előjegyzésedet rögzítettük. Nem kellett fizetned, és most nincs további teendőd. A részletekkel e-mailben jelentkezünk."}
            </p>
            <div className="mt-6 border border-zinc-800 bg-black p-4">
              <p className="font-mono text-[9px] uppercase tracking-[.2em] text-zinc-600">Azonosító</p>
              <p className="mt-2 font-mono text-sm text-zinc-100">{result.reference}</p>
            </div>
            <a href="/" className="mt-7 inline-flex min-h-12 items-center border border-lime-200/40 px-5 font-mono text-[10px] uppercase tracking-widest text-lime-100">
              Vissza a főoldalra
            </a>
          </section>
        </div>
      </main>
    )
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
            <p className="font-mono text-[9px] uppercase tracking-[.24em] text-lime-200">Előjegyzés / előrendelés</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight sm:text-4xl" style={{fontFamily:"var(--font-hero)"}}>
              Kalendárium <span className="text-lime-200">2027</span>
            </h1>
          </div>

          <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
            <div>
              <p className={labelClass}>Válaszd ki, hogyan szeretnél rendelni</p>
              <div className="mt-2 grid gap-3">
                <label className={`block cursor-pointer border p-4 transition ${preorderType === "reservation" ? "border-lime-200/60 bg-lime-200/[.06]" : "border-zinc-800 bg-black/30 hover:border-zinc-600"}`}>
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="preorderType"
                      value="reservation"
                      checked={preorderType === "reservation"}
                      onChange={() => setPreorderType("reservation")}
                      className="mt-1 accent-lime-200"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="font-mono text-[10px] uppercase tracking-wider text-zinc-100">Sima előjegyzés</strong>
                        <span className="font-mono text-xs text-lime-200">0 Ft most</span>
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-zinc-500">
                        Lefoglalod a tervezett példányszámot. Nem fizetsz most, a rendelés és az átvétel részleteit később egyeztetjük.
                      </span>
                      <span className="mt-2 block font-mono text-[10px] text-zinc-400">Normál ár: 12 000 Ft / példány</span>
                    </span>
                  </span>
                </label>

                <label className={`block cursor-pointer border p-4 transition ${preorderType === "supporter" ? "border-lime-200/60 bg-lime-200/[.06]" : "border-zinc-800 bg-black/30 hover:border-zinc-600"}`}>
                  <span className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="preorderType"
                      value="supporter"
                      checked={preorderType === "supporter"}
                      onChange={() => setPreorderType("supporter")}
                      className="mt-1 accent-lime-200"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="font-mono text-[10px] uppercase tracking-wider text-lime-100">Támogatói előrendelés</strong>
                        <span className="font-mono text-xs text-lime-200">10 000 Ft / db</span>
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-zinc-400">
                        Most 5 000 Ft előleget fizetsz példányonként. A fennmaradó 5 000 Ft-ot később, a kiadvány átvétele előtt rendezed.
                      </span>
                      <span className="mt-2 block font-mono text-[10px] text-lime-200">2 000 Ft kedvezmény a normál árhoz képest</span>
                    </span>
                  </span>
                </label>
              </div>
            </div>

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
                <span className="font-mono text-[10px] uppercase tracking-[.15em] text-lime-200">
                  {preorderType === "supporter" ? "Most fizetendő" : "Most fizetendő"}
                </span>
                <strong className="text-xl tabular-nums text-lime-200">{formatHuf(totals.deposit)}</strong>
              </div>
              {preorderType === "supporter" ? (
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-zinc-500">Fennmaradó összeg később</span>
                  <span className="tabular-nums text-zinc-300">{formatHuf(totals.balance)}</span>
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">A sima előjegyzés nem jelent fizetési kötelezettséget. A végleges rendelésről később egyeztetünk.</p>
              )}
              <p className="mt-4 text-[11px] leading-5 text-zinc-600">
                {preorderType === "supporter"
                  ? "A támogatói ár 10 000 Ft / példány. Az 5 000 Ft előleg ennek része, a fennmaradó 5 000 Ft-ot később kell rendezni."
                  : "A sima előjegyzés ingyenes és nem jár fizetési kötelezettséggel. A normál tervezett ár 12 000 Ft / példány."}
                {" "}A szállítás esetleges díját külön egyeztetjük.
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
                Elfogadom az <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-lime-200 underline underline-offset-4">adatkezelési tájékoztatót</a>, és hozzájárulok, hogy az előjegyzéssel kapcsolatban e-mailben megkeressetek.
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
                ? <><Loader2 className="animate-spin" size={16}/> {preorderType === "supporter" ? "Fizetési oldal indítása..." : "Előjegyzés rögzítése..."}</>
                : preorderType === "supporter"
                  ? <>Támogatói előrendelés · {formatHuf(totals.deposit)} <ArrowRight size={16}/></>
                  : <>Előjegyzés leadása · ingyenes <ArrowRight size={16}/></>}
            </button>
            <p className="text-center font-mono text-[9px] uppercase tracking-wider text-zinc-700">
              {preorderType === "supporter" ? "Biztonságos bankkártyás fizetés a Stripe rendszerén keresztül" : "Nincs fizetés · Nincs kötelezettség"}
            </p>
          </form>
        </section>
      </div>
    </main>
  )
}

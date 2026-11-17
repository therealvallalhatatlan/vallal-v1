"use client"

import { FormEvent, useState } from "react"
import { ArrowDown, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Loader2, PenLine, Store } from "lucide-react"

type Payment = "reserve" | "preorder"
type Result = { reference: string; payment: "unpaid" }

const inputClass = "mt-2 min-h-12 w-full rounded-none border border-zinc-700 bg-black/60 px-3 py-3 text-base text-zinc-100 outline-none placeholder:text-zinc-700 focus:border-lime-200/70 focus:ring-1 focus:ring-lime-200/20 sm:text-sm"
const labelClass = "block font-mono text-[10px] uppercase tracking-[.16em] text-zinc-400"

export default function KalendariumPreorderPage() {
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "shipping">("pickup")
  const [note, setNote] = useState("")
  const [payment, setPayment] = useState<Payment>("reserve")
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Result | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    if (!consent) {
      setError("Az előjegyzéshez fogadd el az adatkezelési tájékoztatót.")
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
          payment,
          consent: true,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          data.error === "rate_limited"
            ? "Túl sok próbálkozás történt. Kérjük, próbáld újra később."
            : data.error === "payment_unavailable"
              ? "A fizetős előrendelés még nem nyílt meg. Az ingyenes előjegyzést továbbra is leadhatod."
              : "Most nem sikerült rögzíteni az előjegyzést. Próbáld újra."
        )
      }
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setResult({ reference: data.reference, payment: data.payment })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Váratlan hiba történt.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080909] text-zinc-100">
      <section className="relative isolate overflow-hidden border-b border-zinc-800 bg-[radial-gradient(ellipse_at_72%_18%,rgba(190,242,100,.10),transparent_42%),linear-gradient(145deg,#101313_0%,#080909_60%)] px-4 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-12">
        <div className="pointer-events-none absolute -right-16 top-10 select-none font-mono text-[180px] font-black leading-none text-white/[.025] sm:right-5 sm:text-[280px]">27</div>
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center justify-between gap-4">
            <a href="/" className="font-mono text-[10px] uppercase tracking-[.2em] text-zinc-500 transition hover:text-lime-200">Vállalhatatlan <span className="text-lime-200">/</span> kiadványok</a>
            <span className="border border-lime-200/30 px-3 py-2 font-mono text-[9px] uppercase tracking-[.18em] text-lime-100/80">Karácsonyi kiadvány · 2027</span>
          </div>

          <div className="mt-16 max-w-4xl sm:mt-24">
            <p className="font-mono text-[10px] uppercase tracking-[.3em] text-lime-200">Egy év. Sokféle valóság.</p>
            <h1 className="mt-5 text-[clamp(3rem,9vw,7.4rem)] font-black uppercase leading-[.82] tracking-[-.055em]" style={{fontFamily:"var(--font-hero)"}}>
              Vállalhatatlan
              <span className="mt-3 block text-lime-200">Kalendárium</span>
              <span className="mt-2 block text-[.53em] tracking-[-.025em] text-zinc-500">2027</span>
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              Naptár, notesz és kalendárium egyetlen tárgyban. Neves és névtelen alkotók munkái,
              közösségi történetek, és azok a vállalkozások, szolgáltatók, akikkel tényleg összeér az életünk.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a href="#elojegyzes" className="inline-flex min-h-12 items-center gap-3 bg-lime-200 px-5 py-3 font-mono text-[10px] font-bold uppercase tracking-[.16em] text-black transition hover:bg-lime-100">
                Előjegyzem a példányom <ArrowRight size={15}/>
              </a>
              <a href="#mi-ez" className="inline-flex min-h-12 items-center gap-2 border border-zinc-700 px-5 py-3 font-mono text-[10px] uppercase tracking-[.16em] text-zinc-300 transition hover:border-zinc-500">
                Mi kerül bele? <ArrowDown size={14}/>
              </a>
            </div>
          </div>
          <div className="mt-20 grid gap-3 border-t border-zinc-800 pt-5 font-mono text-[9px] uppercase tracking-[.18em] text-zinc-600 sm:grid-cols-3">
            <span>01 / Használni</span><span>02 / Olvasni</span><span>03 / Felfedezni</span>
          </div>
        </div>
      </section>

      <section id="mi-ez" className="px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.24em] text-lime-200">Nem csak dátumok</p>
              <h2 className="mt-4 text-4xl font-black uppercase leading-[.92] tracking-tight sm:text-5xl" style={{fontFamily:"var(--font-hero)"}}>
                Egy évre<br/>bekötött<br/><span className="text-lime-200">közösség.</span>
              </h2>
              <p className="mt-6 max-w-sm text-sm leading-7 text-zinc-500">
                A Kalendárium egyszerre praktikus tárgy és közös lenyomat. Olyan emberek kerülnek egymás mellé,
                akik más-más helyről érkeznek, de ugyanahhoz a valósághoz adnak hozzá valamit.
              </p>
            </div>
            <div className="grid gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
              <Feature icon={<CalendarDays size={20}/>} number="12" title="Hónap" text="Dátumok, tervezés, saját jegyzetek és év közbeni kapaszkodók."/>
              <Feature icon={<PenLine size={20}/>} number="∞" title="Alkotás" text="Próza, vers, kép, fotó, grafika és minden, ami nem fér egyetlen fiókba."/>
              <Feature icon={<Store size={20}/>} number="V" title="Arany Oldalak" text="A közösséghez kapcsolódó vállalkozások, alkotók és szolgáltatók elérhetőségei."/>
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-2">
            <div className="border border-zinc-800 bg-[#0d1010] p-6 sm:p-8">
              <div className="flex items-center gap-3 text-lime-200"><BookOpen size={19}/><span className="font-mono text-[9px] uppercase tracking-[.2em]">A kiadványban</span></div>
              <h3 className="mt-5 text-2xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>Művek és nyomok</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-500">Ismert és felfedezésre váró magyar művészek alkotásai, V. szövegei, jegyzetek és képek. Nem rangsor, inkább találkozási pont.</p>
            </div>
            <div className="border border-zinc-800 bg-[#0d1010] p-6 sm:p-8">
              <div className="flex items-center gap-3 text-lime-200"><Store size={19}/><span className="font-mono text-[9px] uppercase tracking-[.2em]">V Crew / Arany Oldalak</span></div>
              <h3 className="mt-5 text-2xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>A közösség gazdasága</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-500">Helyi és online vállalkozások, szolgáltatók, műhelyek és kezdeményezések. Egy kézzel fogható címtár abból, amit a hálózat épít.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="elojegyzes" className="border-y border-zinc-800 bg-[#0d1010] px-4 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.24em] text-lime-200">Helyfoglalás a polcon</p>
            <h2 className="mt-4 text-4xl font-black uppercase leading-[.92] sm:text-5xl" style={{fontFamily:"var(--font-hero)"}}>Kérj egy<br/><span className="text-lime-200">példányt.</span></h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-400">
              Most az érdeklődést és a várható példányszámot mérjük fel. Az előjegyzés ingyenes és nem jár fizetési kötelezettséggel.
              Amikor végleges a nyomdai specifikáció, az ár és az átvétel módja, e-mailben küldjük a részleteket.
            </p>
            <div className="mt-8 border-l border-lime-200/50 pl-4 text-xs leading-6 text-zinc-500">
              Az előjegyzés nem végleges megrendelés. Nem vonunk le pénzt, és az adataidat nem tesszük közzé.
            </div>
          </div>

          <div className="border border-zinc-700 bg-[#080909] p-5 sm:p-8">
            {result ? (
              <div className="py-8">
                <div className="flex h-12 w-12 items-center justify-center border border-lime-200/40 text-lime-200"><CheckCircle2 size={23}/></div>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[.22em] text-lime-200">Előjegyzés rögzítve</p>
                <h3 className="mt-3 text-3xl font-black uppercase" style={{fontFamily:"var(--font-hero)"}}>Találkozunk 2027-ben.</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">Köszönjük az érdeklődést. A részletekkel e-mailben jelentkezünk, amikor megvannak a végleges gyártási és átvételi adatok.</p>
                <div className="mt-6 border border-zinc-800 bg-black p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.2em] text-zinc-600">Előjegyzési azonosító</p>
                  <p className="mt-2 font-mono text-sm text-zinc-200">{result.reference}</p>
                </div>
                <button onClick={()=>{setResult(null);setEmail("");setFullName("");setQuantity("1");setNote("")}} className="mt-7 font-mono text-[10px] uppercase tracking-widest text-lime-200 underline underline-offset-4">Újabb példányt is előjegyzek</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-5">
                  <div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-lime-200">Előjegyzési űrlap</p><p className="mt-1 text-xs text-zinc-500">Fiók nélkül is kitölthető</p></div>
                  <span className="border border-zinc-800 px-3 py-2 font-mono text-[9px] uppercase text-zinc-600">VK / 27</span>
                </div>
                <form onSubmit={submit} className="mt-6 space-y-5">
                  <div>
                    <p className={labelClass}>Hogyan szeretnél csatlakozni?</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-3 border border-lime-200/50 bg-lime-200/[.06] p-4">
                        <input type="radio" name="payment" checked={payment==="reserve"} onChange={()=>setPayment("reserve")} className="mt-1 accent-lime-200"/>
                        <span><span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-lime-100">Ingyenes előjegyzés</span><span className="mt-2 block text-[11px] leading-5 text-zinc-500">Most csak jelzem, hogy kérek egy példányt.</span></span>
                      </label>
                      <label className="flex cursor-not-allowed items-start gap-3 border border-zinc-800 bg-zinc-900/40 p-4 opacity-55">
                        <input type="radio" name="payment" checked={payment==="preorder"} onChange={()=>{}} disabled className="mt-1 accent-lime-200"/>
                        <span><span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fizetős előrendelés</span><span className="mt-2 block text-[11px] leading-5 text-zinc-600">Az ár és a szállítás véglegesítése után nyílik meg.</span></span>
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>E-mail-cím *
                      <input className={inputClass} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@pelda.hu"/>
                    </label>
                    <label className={labelClass}>Név <span className="text-zinc-600">(nem kötelező)</span>
                      <input className={inputClass} autoComplete="name" maxLength={120} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Név vagy becenév"/>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>Példányszám
                      <select className={inputClass} value={quantity} onChange={e=>setQuantity(e.target.value)}>{Array.from({length:10},(_,index)=>index+1).map(n=><option key={n} value={String(n)}>{n} db</option>)}</select>
                    </label>
                    <label className={labelClass}>Átvétel módja
                      <select className={inputClass} value={fulfillmentMethod} onChange={e=>setFulfillmentMethod(e.target.value as "pickup"|"shipping")}>
                        <option value="pickup">Személyes / közösségi átvétel</option>
                        <option value="shipping">Postai vagy csomagküldés</option>
                      </select>
                    </label>
                  </div>

                  <label className={labelClass}>Megjegyzés <span className="text-zinc-600">(nem kötelező)</span>
                    <textarea className={inputClass+" min-h-24 resize-y"} maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="Bármi, amit már most tudnunk érdemes..."/>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-zinc-500">
                    <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-lime-200"/>
                    <span>Elfogadom az <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-lime-200 underline underline-offset-4">adatkezelési tájékoztatót</a>, és hozzájárulok, hogy az előjegyzéssel kapcsolatban e-mailben megkeressetek.</span>
                  </label>

                  {error ? <p role="alert" className="border border-red-900/70 bg-red-950/30 p-3 text-xs leading-5 text-red-200">{error}</p> : null}
                  <button type="submit" disabled={busy} className="flex min-h-14 w-full items-center justify-center gap-3 bg-lime-200 px-5 py-4 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-black transition hover:bg-lime-100 disabled:cursor-wait disabled:opacity-50">
                    {busy ? <><Loader2 className="animate-spin" size={16}/> Rögzítés...</> : <>Előjegyzem, fizetés nélkül <ArrowRight size={16}/></>}
                  </button>
                  <p className="text-center font-mono text-[9px] uppercase tracking-wider text-zinc-700">Nincs fizetés · Nincs automatikus hírlevél · Nincs kötelezettség</p>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 font-mono text-[9px] uppercase tracking-[.18em] text-zinc-700 sm:flex-row">
          <span>Vállalhatatlan / Kalendárium 2027</span><span>Egy közös év lenyomata.</span>
        </div>
      </footer>
    </main>
  )
}

function Feature({icon,number,title,text}:{icon:React.ReactNode;number:string;title:string;text:string}) {
  return <div className="bg-[#090b0b] p-5 sm:p-6">
    <div className="flex items-center justify-between text-lime-200">{icon}<span className="font-mono text-xl">{number}</span></div>
    <h3 className="mt-6 font-mono text-xs font-bold uppercase tracking-[.18em]">{title}</h3>
    <p className="mt-3 text-xs leading-6 text-zinc-600">{text}</p>
  </div>
}

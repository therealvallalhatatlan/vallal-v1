import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "NYOMDAI RIASZTÁS // 100",
  description: "Az első 100 már elfogyott. Most indul a következő 100.",
  robots: { index: false, follow: false },
};

const milestones = [
  { label: "NYOMDA", value: "140 000 / 218 000 Ft", note: "78 000 Ft hiányzik" },
  { label: "KÖVETKEZŐ KÖNYVEK", value: "50 + 50", note: "I. bővített + II. újranyomás" },
  { label: "ELSŐ TERÍTÉS", value: "6 VÁROS", note: "Budapest · Pécs · Szeged · Debrecen · Győr · London" },
];

const founders = [
  { id: "#001", name: "V.", city: "BUDAPEST", status: "ALAPÍTÓ" },
  { id: "#002", name: "ANON", city: "PÉCS", status: "ALAPÍTÓ" },
  { id: "#003", name: "—", city: "SZEGED", status: "NYITVA" },
  { id: "#004", name: "—", city: "DEBRECEN", status: "NYITVA" },
  { id: "#005", name: "—", city: "GYŐR", status: "NYITVA" },
  { id: "#006", name: "—", city: "LONDON", status: "NYITVA" },
];

function Glitch({ children }: { children: React.ReactNode }) {
  return <span className="glitch" data-text={children}>{children}</span>;
}

export default function Page100() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-zinc-100 selection:bg-lime-300 selection:text-black">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.06] mix-blend-screen scanlines" />
      <div className="pointer-events-none fixed inset-0 z-40 vignette" />

      <header className="relative z-10 border-b border-zinc-800/80 bg-black/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-zinc-200 hover:text-lime-200">VÁLLALHATATLAN<span className="text-lime-300">/100</span></a>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600">INTERNAL / PUBLIC</span>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12">
        <div className="mb-5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-600">
          <span>NYOMDAI RIASZTÁS // 001</span>
          <span>STATUS: RUNNING</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-lime-200/70">AZ ELSŐ 100 ELMENT</p>
            <h1 className="mt-3 max-w-4xl text-[clamp(4rem,12vw,10rem)] font-black uppercase leading-[0.82] tracking-[-0.06em] text-zinc-100">
              <Glitch>MOST</Glitch><br />KEZDJÜK<br /><span className="text-lime-300">IGAZÁN.</span>
            </h1>
            <p className="mt-7 max-w-xl font-mono text-sm leading-7 text-zinc-400 sm:text-base">
              50 darab bővített első kötet. A második könyv újranyomva. Az első országos terítés. A Hálózat első fizikai pontjai.
            </p>
          </div>

          <div className="relative overflow-hidden border border-zinc-800 bg-zinc-950">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_45%,rgba(163,230,53,0.12),transparent_42%)]" />
            <div className="relative aspect-[4/5] w-full bg-[#0a0a0a]">
              <Image src="/img/vsztori2.png" alt="V. a Vállalhatatlan világában" fill className="object-cover opacity-90 grayscale contrast-125" sizes="(max-width: 1024px) 100vw, 40vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-300/80">
                <div>V. // WORKROOM</div>
                <div className="mt-1 text-zinc-600">THE NEXT 100 IS BEING BUILT</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-y border-zinc-800 py-5">
          <div className="flex items-end justify-between gap-5 font-mono">
            <div>
              <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-600">NYOMDAI CÉL</div>
              <div className="mt-2 text-4xl font-black tracking-[-0.04em] text-zinc-100 sm:text-6xl">218 000 <span className="text-lg font-normal text-zinc-600">FT</span></div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-[0.22em] text-zinc-600">MEGVAN</div>
              <div className="mt-2 text-3xl font-black text-lime-300 sm:text-5xl">140 000</div>
            </div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-inset ring-zinc-700">
            <div className="h-full bg-lime-300 shadow-[0_0_28px_rgba(163,230,53,0.35)]" style={{ width: "64.22%" }} />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[9px] uppercase tracking-[0.17em] text-zinc-600">
            <span>64% KÉSZ</span><span>78 000 FT HIÁNYZIK</span>
          </div>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden border border-zinc-800 bg-zinc-800 sm:grid-cols-3">
          {milestones.map((item) => (
            <div key={item.label} className="bg-[#070707] p-5 sm:p-6">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-zinc-600">{item.label}</div>
              <div className="mt-3 text-2xl font-black uppercase tracking-[-0.03em] text-zinc-100 sm:text-3xl">{item.value}</div>
              <div className="mt-2 font-mono text-[10px] leading-5 text-zinc-500">{item.note}</div>
            </div>
          ))}
        </div>

        <section className="mt-20 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-lime-200/70">01 / MIÉRT?</div>
            <h2 className="mt-3 text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl">Nem<br />támogatás.<br /><span className="text-lime-300">Indítás.</span></h2>
          </div>
          <div className="space-y-5 border-l border-zinc-800 pl-5 sm:pl-8">
            <p className="font-mono text-sm leading-7 text-zinc-300">Az első 100 példány elfogyott. Most egy olyan kört akarunk elindítani, amivel a könyvek ténylegesen ki tudnak jutni az országba.</p>
            <p className="font-mono text-sm leading-7 text-zinc-500">A pénz egy konkrét nyomdai körre megy. A könyvek innen mennek tovább emberekhez, városokhoz és a Hálózat első pontjaihoz.</p>
            <p className="border-l-2 border-lime-300 pl-4 font-mono text-sm font-bold leading-7 text-zinc-200">Nem befektetés. Nincs hozam. Nincs beszervezés. Van könyv, van nyomda, van következő 100.</p>
          </div>
        </section>

        <section className="mt-20">
          <div className="flex items-end justify-between border-b border-zinc-800 pb-4">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-lime-200/70">02 / ALAPÍTÓI KÖR</div>
              <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.04em] text-zinc-100 sm:text-6xl">Válassz egy példányt.</h2>
            </div>
            <div className="hidden font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600 sm:block">STRIPE / SECURE</div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[
              { code: "A / 01", title: "EGY PÉLDÁNY", price: "10 000 Ft", text: "Egy példány a következő körből. Sorszámozva. A Hálózatba belépve." },
              { code: "B / 02", title: "KÖVETKEZŐ KÖR", price: "25 000 Ft", text: "Több példány + limitált extra az első terítésből." },
              { code: "C / 03", title: "ALAPÍTÓ", price: "50 000 Ft", text: "Nagyobb csomag + alapítói azonosító + meghívás a következő zárt eseményre." },
            ].map((offer) => (
              <article key={offer.code} className="group flex min-h-[310px] flex-col border border-zinc-800 bg-[#070707] p-5 transition-colors hover:border-lime-300/50 sm:p-6">
                <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600"><span>{offer.code}</span><span>V./100</span></div>
                <h3 className="mt-8 text-3xl font-black uppercase leading-none tracking-[-0.04em] text-zinc-100">{offer.title}</h3>
                <div className="mt-4 text-3xl font-black text-lime-300">{offer.price}</div>
                <p className="mt-4 font-mono text-xs leading-6 text-zinc-500">{offer.text}</p>
                <button className="mt-auto flex items-center justify-between border-2 border-zinc-300/80 bg-lime-300/[0.03] px-4 py-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-zinc-100 transition-all hover:border-lime-300 hover:bg-lime-300/10 hover:text-lime-200">
                  MEGSZERZEM <span>↗</span>
                </button>
              </article>
            ))}
          </div>
          <p className="mt-4 font-mono text-[10px] leading-5 text-zinc-700">A fizetés itt még preview állapotban van. A Stripe bekötés külön lépésben történik.</p>
        </section>

        <section className="mt-20">
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-lime-200/70">03 / AZ ELSŐ ÚTVONAL</div>
          <div className="mt-6 overflow-hidden border border-zinc-800 bg-[#060606]">
            <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
              {founders.map((founder) => (
                <div key={founder.id} className="bg-[#060606] p-5">
                  <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600"><span>{founder.id}</span><span className={founder.status === "ALAPÍTÓ" ? "text-lime-300" : "text-zinc-700"}>{founder.status}</span></div>
                  <div className="mt-6 text-2xl font-black uppercase tracking-[-0.03em] text-zinc-100">{founder.city}</div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">{founder.name}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-800 p-5 font-mono text-xs leading-6 text-zinc-500">A Hálózat első pontjai innen indulnak. Nem lánc. Nem jutalék. Csak terítés, találkozások és helyek, ahol történik valami.</div>
          </div>
        </section>

        <section className="mt-20 border-y border-zinc-800 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-lime-200/70">04 / V.</div>
              <h2 className="mt-3 text-5xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-8xl">„A következő<br /><span className="text-lime-300">100</span> nem fog<br />magától elkészülni.”</h2>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-700">V / WORKROOM / 2026</div>
          </div>
        </section>

        <section className="mt-20 pb-8 text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-zinc-600">NYOMDAI RIASZTÁS // 001</div>
          <div className="mt-4 text-6xl font-black tracking-[-0.06em] text-zinc-100 sm:text-8xl">78 000 <span className="text-2xl font-normal text-zinc-600">FT</span></div>
          <p className="mx-auto mt-4 max-w-md font-mono text-xs leading-6 text-zinc-500">Ennyi választja el a következő kört a nyomdától.</p>
          <a href="#alapitok" className="mt-8 inline-flex min-h-14 items-center justify-center border-2 border-lime-300 bg-lime-300 px-8 font-mono text-sm font-black uppercase tracking-[0.14em] text-black transition-all hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(163,230,53,0.28)]">BELÉPEK A KÖVETKEZŐ 100-BA ↗</a>
          <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-700">Stripe hamarosan · Preview / nincs production checkout</p>
        </section>
      </section>

      <style>{`
        .scanlines{background-image:repeating-linear-gradient(to bottom,rgba(255,255,255,.6) 0 1px,transparent 1px 4px);background-size:100% 4px;mix-blend-mode:soft-light}.vignette{background:radial-gradient(ellipse at center,transparent 42%,rgba(0,0,0,.72) 100%)}
        .glitch{position:relative;display:inline-block}.glitch::before,.glitch::after{content:attr(data-text);position:absolute;inset:0;pointer-events:none;opacity:0}.glitch::before{color:#ff335f;transform:translateX(-2px)}.glitch::after{color:#00c8ff;transform:translateX(2px)}.glitch:hover::before,.glitch:hover::after{opacity:.7}
        @media (prefers-reduced-motion:no-preference){.glitch::before{animation:gl1 7s steps(2,end) infinite}.glitch::after{animation:gl2 8s steps(2,end) infinite}@keyframes gl1{0%,92%,100%{opacity:0}93%{opacity:.4;clip-path:inset(12% 0 62% 0)}94%{opacity:.55;clip-path:inset(48% 0 16% 0)}95%{opacity:0}}@keyframes gl2{0%,88%,100%{opacity:0}89%{opacity:.35;clip-path:inset(66% 0 11% 0)}90%{opacity:.5;clip-path:inset(18% 0 54% 0)}91%{opacity:0}}
        }
      `}</style>
    </main>
  );
}

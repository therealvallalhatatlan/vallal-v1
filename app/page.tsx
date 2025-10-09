// app/page.tsx
import Link from "next/link"
import type { Metadata } from "next"
import path from "path"
import fs from "fs/promises"

import { Container } from "@/components/Container"
import { Card } from "@/components/Card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatSequence } from "@/lib/format"
import NetworkMap from "@/components/NetworkMap";
import TweetRotator from "@/components/TweetRotator";
import FAQ from "@/components/FAQ";

export const metadata: Metadata = {
  metadataBase: new URL("https://vallalhatatlan.online"),
  title: {
    default: "Vállalhatatlan — Y2K | Budapest underground a ’90-es évekből",
    template: "%s | Vállalhatatlan",
  },
  description:
    "Vállalhatatlan — Y2K: nyers, urbánus novellák a ’90-es évek és az ezredforduló Budapestjéről. Rave/techno éjszakák, underground szcénák, drogkultúra, identitásválság és könyörtelen őszinteség.",
  alternates: { canonical: "/", languages: { "hu-HU": "/", "en-US": "/en" } },
  openGraph: {
    type: "book",
    url: "/",
    siteName: "Vállalhatatlan",
    title: "Vállalhatatlan — Y2K | Underground Budapest a ’90-es évekből",
    description:
      "Nyers, sötét humorú novellák a ’90-es évek/ezredforduló Budapestjéről: techno, acid, rave, drogkultúra és töréspontok.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Vállalhatatlan — Y2K" }],
    locale: "hu_HU",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan — Y2K",
    description:
      "Underground Budapest a ’90-es években: rave/techno, drogkultúra és kíméletlenül őszinte novellák.",
    images: ["/og.jpg"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  themeColor: "#0ea5a3",
}

// --- counters: unchanged backend logic ---
async function readCountersSupabase() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const resp = await fetch(`${url}/rest/v1/counters?id=eq.main`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    })
    if (!resp.ok) { console.warn("[PAGE] Supabase GET failed:", resp.status, await resp.text()); return null }
    const json = await resp.json()
    if (json && json[0]) {
      const row = json[0]
      return {
        goal: Number(row.goal ?? 100),
        total_sold: Number(row.total_sold ?? row.preorders ?? 0),
        last_sequence_number: Number(row.last_sequence_number ?? 0),
      }
    }
    return null
  } catch (err) {
    console.error("[PAGE] Supabase fetch error:", err)
    return null
  }
}
async function readCountersFile() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    const json = JSON.parse(raw)
    return {
      goal: Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100,
      total_sold: Number.isFinite(Number(json.total_sold ?? json.preorders))
        ? Math.max(0, Number(json.total_sold ?? json.preorders))
        : 0,
      last_sequence_number: Number.isFinite(Number(json.last_sequence_number ?? 0))
        ? Math.max(0, Number(json.last_sequence_number ?? 0))
        : 0,
    }
  } catch {
    return { goal: 100, total_sold: 0, last_sequence_number: 0 }
  }
}
async function readCounters() {
  const sup = await readCountersSupabase()
  if (sup) return sup
  return readCountersFile()
}

export default async function HomePage() {
  const { goal, total_sold, last_sequence_number } = await readCounters()
  const preorders = Math.min(total_sold ?? 0, goal)
  const remaining = Math.max(0, goal - preorders)
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null
  const percent = Math.min(100, Math.max(0, Math.round((preorders / goal) * 100)))
  const soldOut = remaining === 0

  return (
    <Container className="py-8">
      {/* fixed width column on desktop (no responsiveness needed) */}
      <div className="mx-auto w-[min(640px,100vw-32px)] px-4 space-y-12">

        {/* 1) HEADER */}
        <header className="flex items-start justify-between">
          <div>
            <div className="mt-2 text-4xl font-black italic tracking-[-0.04em] text-green-400 crt-glitch">
              Vállalhatatlan <br/>
              <span className="text-sm uppercase tracking-widest">A könyv</span>
            </div>
          </div>

          <div className="text-right bg-black/80 rounded-md p-3 border border-green-300/20">
            <div className="text-green-300/70 text-xs">Következő Drop:</div>
            <div className="text-green-400 text-2xl font-bold leading-tight">
              {soldOut ? "—" : `${formatSequence(yourNumber ?? 1)}`}
            </div>
            <Button
              asChild
              size="sm"
              className="mt-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
              variant="outline"
              disabled={soldOut}
            >
              <Link href={soldOut ? "#" : "/checkout"}>{soldOut ? "Elfogyott" : "Megveszem"}</Link>
            </Button>
          </div>
        </header>

        {/* 
        <Card className="overflow-hidden">
          <div className="aspect-square w-full bg-black">
           
            <img
              src="/video.gif"
              alt="promo animation"
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Card>

*/}



        {/* 4) IDÉZET */}
        <section className="text-green-200/90">
          <blockquote className="italic leading-relaxed">
            "Van egy tudatállapot, amiben meg tudjuk hajlítani a valóságot. Nem tudjuk irányítani, de valami érezhetően megváltozik. A dolgok valószínűtlensége növekszik. Furcsa és szürreális dolgok történnek velünk. Nincs más magyarázatom ezekre a történetekre."
          </blockquote>


          {/* 5) KÉP – könyvborító */}
        <Card className="overflow-hidden mt-6">
          {/* Replace /cover.jpg with your asset */}
          <img src="/vallalhatatlan.png" alt="Vállalhatatlan — könyvborító" className="w-full h-auto object-cover" />
        </Card>


          <p className="mt-8 text-lg text-green-300/70">
             Ez nem egy könyv. 
             Nincs írója, nincs kiadója, és nem kapható a könyvesboltokban.
             Összesen 100 példány készült belőle. 
             Az egyik a tiéd lehet. De meg kell találnod.<br/>
             <span className="text-green-200/90 text-[11px] mt-2 align-top">*Vagy kérheted postán is.</span>
          </p>
          <p className="mt-4 text-sm text-green-300/50">
          </p>
        </section>


        {/* 8) FUTÓSZÖVEG – lassú, kissé elforgatott marquee */}
        <div className="relative rotate-[-6deg] bg-green-500 text-black py-2 select-none overflow-hidden">
          <div className="marquee whitespace-nowrap font-black tracking-wider uppercase">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="mx-6">
                Könyv + Adrenalin + Soundtrack + Letölthető MP3 + Képek
              </span>
            ))}
          </div>
        </div>


          {/* 7) TÉRKÉP – egyelőre kép */}
        <section id="terkep">
          <NetworkMap
            src="/map-base.png"
            markers={[
              { id: "drop-002", x: 0.78, y: 0.72, label: "Drop #002" },
              { id: "drop-003", x: 0.41, y: 0.58, label: "Drop #003" },
              { id: "drop-004", x: 0.25, y: 0.33, label: "Drop #004" },
              { id: "drop-005", x: 0.62, y: 0.21, label: "Drop #005" },
            ]}
            maxActive={4}        // 3-4 aktív, átfedéssel
            appearEveryMs={1200} // ennyi időnként születik az új pont
            lifetimeMs={2600}    // tovább él, így fedni fog a következővel
            glitchEveryMs={3200}
          />
        </section>

            <div
              className="mt-2 text-[13px] text-green-300/70 font-mono"
              aria-live="polite"
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 mt-4 rounded-full bg-green-400 animate-ping text-xs" />
                <TweetRotator
                  className=""
                  heightPx={16}
                  messages={[
                    "Jövő hét elején megy a nyomdába!",
                    "Posta is játszik!",
                    "kurvajó lesz srácoook !!",
                  ]}
                  typeMsPerChar={26}
                  eraseMsPerChar={12}
                  holdAfterTypeMs={1200}
                  holdAfterEraseMs={420}
                />
              </span>
            </div>

        {/* 3) SZÁMLÁLÓ – unchanged */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{preorders}</div>
              <div className="text-green-300/60 text-xs">Előrendelések</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{goal}</div>
              <div className="text-green-300/60 text-xs">Összes Példány</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {soldOut ? "—" : `#${formatSequence(yourNumber ?? 1)}`}
              </div>
              <div className="text-green-300/60 text-xs">A Te Sorszámod</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] text-green-300/80">
              <span>{percent}% funded</span>
              <span>{remaining} remaining</span>
            </div>
            <div className="w-full bg-green-900/30 rounded-full h-3">
              <div className="bg-green-400 h-3 rounded-full transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </Card>


        


        {/* 6) SORSZÁM + CTA + KÉT SOR SZÖVEG */}
        <section className="text-center space-y-4">
          <div className="text-green-300/70 text-sm">A Te példányod sorszáma:</div>
          <div className="text-4xl font-extrabold text-green-400 drop-shadow">{formatSequence(yourNumber ?? 1)}</div>
          <Button
            asChild
            size="lg"
            className="mx-auto border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
            variant="outline"
            disabled={soldOut}
          >
            <Link href={soldOut ? "#" : "/checkout"}>Mutasd Hol Van</Link>
          </Button>
          <div className="text-[12px] text-green-300/70 space-y-1">
            <div>› A drop ára: {formatCurrency(15000)}</div>
            <div>› Vállalhatatlan Klub Tagoknak: {formatCurrency(10000)}</div>
          </div>
        </section>


        {/* 8) FUTÓSZÖVEG – lassú, kissé elforgatott marquee */}
        <div className="relative rotate-[-6deg] bg-green-500 text-black py-2 select-none overflow-hidden">
          <div className="marquee whitespace-nowrap font-black tracking-wider uppercase">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="mx-6">
                Könyv + Adrenalin + Ebook + Zene + Képek
              </span>
            ))}
          </div>
        </div>

        {/*  
        <section className="text-green-200/80 text-sm leading-relaxed">
          A könyvből csak {goal} darab készül, limitált példányszám, sorszámozott, dedikált.
          Minden példányt elrejtek egy helyen, és a koordinátát kapod meg. Nem bolt — élmény.
        </section>
        */}
        <section className="text-green-200/80 text-sm leading-relaxed">
          <FAQ className="mt-16" />
        </section>

        {/* 10) PROFILKÁRTYA + gépelt „tweet” feed */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <img src="/swipe.jpg" alt="Vállalhatatlan" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <div className="font-semibold text-green-300">Vállalhatatlan</div>
              <div className="text-[14px] text-green-300/70 flex gap-3">
                <a href="https://www.reddit.com/r/vallalhatatlan/" target="_blank" className="hover:text-green-400">Reddit</a>
                <a href="https://www.facebook.com/vallalhatatlan2000" target="_blank" className="hover:text-green-400">Facebook</a>
                <a href="mailto:hello@vallalhatatlan.online" className="hover:text-green-400">Email</a>
              </div>
            </div>
          </div>
        </Card>

        <footer className="pb-8 text-center">
          <p className="text-green-300/60 text-[13px]">
            © 2025 created by:{' '}
            <a
              href="https://rickandpam.digital"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-300/60 hover:text-green-400"
            >
              rickandpam.digital
            </a>
          </p>
          <div className="mt-1">
            <Link href="/terms" className="text-green-300/40 text-[11px] hover:text-green-400 mr-4">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-green-300/40 text-[11px] hover:text-green-400">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>

      {/* tiny utilities: marquee + caret + tweet typer */}
      <style>{`
        .marquee { display:inline-block; will-change: transform; animation: marquee 28s linear infinite; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .caret::after { content: '▌'; margin-left: 2px; animation: blink 1s steps(1,end) infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        
        /* 90s CRT/Glitch Effects */
        .crt-glitch {
          position: relative;
          animation: flicker 0.15s infinite linear alternate, rgb-shift 2s infinite;
          text-shadow: 
            2px 0 #ff0000, 
            -2px 0 #00ffff,
            0 0 10px #39FF14;
        }
        
        .crt-glitch::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.03) 50%);
          background-size: 100% 4px;
          pointer-events: none;
          animation: scanlines 0.1s linear infinite;
        }
        
        .crt-glitch::after {
          content: attr(data-text);
          position: absolute;
          left: 2px;
          text-shadow: -2px 0 #ff0000;
          top: 0;
          color: transparent;
          background: transparent;
          overflow: hidden;
          animation: glitch-1 0.6s infinite linear alternate-reverse;
        }
        
        @keyframes flicker {
          0% { opacity: 1; }
          97% { opacity: 1; }
          98% { opacity: 0.98; }
          99% { opacity: 0.96; }
          100% { opacity: 1; }
        }
        
        @keyframes rgb-shift {
          0% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(0);
          }
          20% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(-1px, 0);
          }
          40% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(-1px, 1px);
          }
          60% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(0, 1px);
          }
          80% { 
            text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(1px, 0);
          }
          100% { 
            text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #39FF14;
            transform: translate(0);
          }
        }
        
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }
        
        @keyframes glitch-1 {
          0% { clip: rect(42px, 9999px, 44px, 0); }
          5% { clip: rect(12px, 9999px, 59px, 0); }
          10% { clip: rect(48px, 9999px, 29px, 0); }
          15% { clip: rect(42px, 9999px, 73px, 0); }
          20% { clip: rect(63px, 9999px, 27px, 0); }
          25% { clip: rect(34px, 9999px, 55px, 0); }
          30% { clip: rect(86px, 9999px, 73px, 0); }
          35% { clip: rect(20px, 9999px, 20px, 0); }
          40% { clip: rect(26px, 9999px, 60px, 0); }
          45% { clip: rect(25px, 9999px, 66px, 0); }
          50% { clip: rect(57px, 9999px, 98px, 0); }
          55% { clip: rect(5px, 9999px, 46px, 0); }
          60% { clip: rect(82px, 9999px, 31px, 0); }
          65% { clip: rect(54px, 9999px, 27px, 0); }
          70% { clip: rect(28px, 9999px, 99px, 0); }
          75% { clip: rect(45px, 9999px, 69px, 0); }
          80% { clip: rect(23px, 9999px, 85px, 0); }
          85% { clip: rect(54px, 9999px, 84px, 0); }
          90% { clip: rect(45px, 9999px, 47px, 0); }
          95% { clip: rect(37px, 9999px, 20px, 0); }
          100% { clip: rect(4px, 9999px, 91px, 0); }
        }
      `}</style>

      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){
            const el = document.getElementById('tweet-rotor');
            if(!el) return;
            const items = JSON.parse(el.getAttribute('data-tweets')||'[]');
            let i=0, c=0, dir=1;
            function tick(){
              const txt = items[i] || '';
              c += dir;
              el.textContent = txt.slice(0, c);
              if(dir>0 && c === txt.length){ setTimeout(()=>{dir=-1; tick();}, 1100); return; }
              if(dir<0 && c === 0){ dir = 1; i = (i+1) % items.length; setTimeout(tick, 350); return; }
              setTimeout(tick, dir>0 ? 26 : 12);
            }
            tick();
          })();`,
        }}
      />
    </Container>
  )
}


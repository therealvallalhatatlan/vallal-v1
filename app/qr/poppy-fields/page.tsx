// app/page.tsx
import Link from "next/link"
import type { Metadata, Viewport } from "next"
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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Vállalhatatlan — Y2K" }],
    locale: "hu_HU",
    alternateLocale: ["en_US"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan — Y2K",
    description:
      "Underground Budapest a '90-es években: rave/techno, drogkultúra és kíméletlenül őszinte novellák.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

export const viewport: Viewport = {
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
            <div className="text-2xl font-black italic tracking-[-0.04em] text-green-400 crt-glitch">
              Vállalhatatlan
            </div>
          </div>
        </header>

        <section className="space-y-2 text-center">
            <h1 className="text-3xl font-extrabold text-green-400">dfdgdghdgh</h1>
            <p className="text-green-200/85 leading-relaxed max-w-prose mx-auto">fghfghfghfhgfhfh</p>
        </section>


        <Card className="p-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-green-300">Soundtrack</h3>
            <div className="bg-black/50 rounded-lg overflow-hidden">
              <iframe 
                width="100%" 
                height="300" 
                scrolling="no" 
                frameBorder="no" 
                allow="autoplay" 
                src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A1174725025&color=%2339FF14&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true&visual=true"
                className="w-full"
              />
              <div className="p-2 text-xs text-green-300/70 bg-black/80">
                <a href="https://soundcloud.com/marcoben" title="Marcoben" target="_blank" className="text-green-300/70 hover:text-green-400 no-underline">
                  Marcoben
                </a>
                {' · '}
                <a href="https://soundcloud.com/marcoben/moodyman-im-doing-fine" title="Moodyman - I'm Doing Fine" target="_blank" className="text-green-300/70 hover:text-green-400 no-underline">
                  Moodyman - I'm Doing Fine
                </a>
              </div>
            </div>
          </div>
        </Card>

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


// app/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import path from "path";
import fs from "fs/promises";
import { Container } from "@/components/Container";
import { Card } from "@/components/Card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatSequence } from "@/lib/format";
import NetworkMap from "@/components/NetworkMap";
import FAQ from "@/components/FAQ";
import TabbedShowcase from "@/components/TabbedShowcase";

// ÚJ: kliens komponensek külön fájlokban
import StickyBuyBar from "@/components/StickyBuyBar";
import LightboxTrigger from "@/components/LightboxTrigger";

export const metadata: Metadata = {
  metadataBase: new URL("https://vallalhatatlan.online"),
  title: { default: "Vállalhatatlan — Könyv • Zene • Drop", template: "%s | Vállalhatatlan" },
  description:
    "Vállalhatatlan: kortárs, urbánus novellák + QR-kódos digitális élmény. Dead-drop, soundtrack, vizuálok. Limitált, sorszámozott példányok.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Vállalhatatlan",
    title: "Vállalhatatlan — Könyv • Zene • Drop",
    description:
      "Könyv + Adrenalin + Soundtrack + QR-kódos aloldalak. Budapest alagsora a ’90/2000-es évekből.",
    images: [{ url: "/api/og?title=V%C3%A1llalhatatlan", width: 1200, height: 630 }],
    locale: "hu_HU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan — Könyv • Zene • Drop",
    description: "Nyers, sötét humorú novellák + élő, digitális kiterjesztés. Limitált példányok.",
    images: ["/api/og?title=V%C3%A1llalhatatlan"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  themeColor: "#0ea5a3",
};

// --- számlálók (szerver) ---
async function readCountersSupabase() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const resp = await fetch(`${url}/rest/v1/counters?id=eq.main`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const json = await resp.json();
  const row = json?.[0];
  if (!row) return null;
  return {
    goal: Number(row.goal ?? 100),
    total_sold: Number(row.total_sold ?? row.preorders ?? 0),
    last_sequence_number: Number(row.last_sequence_number ?? 0),
  };
}

async function readCountersFile() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "counters.json"), "utf-8");
    const j = JSON.parse(raw);
    return {
      goal: Number(j.goal ?? 100),
      total_sold: Number(j.total_sold ?? j.preorders ?? 0),
      last_sequence_number: Number(j.last_sequence_number ?? 0),
    };
  } catch {
    return { goal: 100, total_sold: 0, last_sequence_number: 0 };
  }
}

async function readCounters() {
  return (await readCountersSupabase()) ?? (await readCountersFile());
}

export default async function HomePage() {
  const { goal, total_sold, last_sequence_number } = await readCounters();
  const preorders = Math.min(total_sold ?? 0, goal);
  const remaining = Math.max(0, goal - preorders);
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null;
  const percent = Math.min(100, Math.max(0, Math.round((preorders / goal) * 100)));
  const soldOut = remaining === 0;

  return (
    <Container>
      <div className="mx-auto py-10 px-4 space-y-10">
        {/* HERO */}
        <header className="flex flex-col gap-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-black italic tracking-[-0.04em] text-lime-400 crt-glitch">
              Vállalhatatlan
            </h1>
            <p className="mt-3 text-lime-300/80 leading-relaxed max-w-2xl">
              100 példány. Egy városi kaland. Nem boltban veszed meg —{" "}
              <span className="text-lime-200">hanem megtalálod*</span>. Könyv + Adrenalin + MP3
            </p>
            <p className="text-xs text-lime-200">*Kérésre postázom is.</p>

            <div className="mt-5 grid grid-cols-3 gap-4 max-w-lg text-center">
              <Stat label="Előrendelések" value={preorders} />
              <Stat label="Összes példány" value={goal} />
              <Stat
                label="A te sorszámod"
                value={soldOut ? "—" : `#${formatSequence(yourNumber ?? 1)}`}
              />
            </div>

            <div className="mt-5 flex flex-col items-start gap-3">
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="border-lime-400 text-lime-900 bg-lime-400 hover:bg-lime-300 hover:text-black"
                  data-umami-event="hero_buy_click"
                  disabled={soldOut}
                >
                  <Link href={soldOut ? "#" : "/checkout"}>
                    Sorszám lefoglalása – {formatCurrency(15000)}
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
                >
                  <Link href="/konyv">Mi ez?</Link>
                </Button>
              </div>
              <div className="text-[12px] text-lime-300/80 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Stripe • titkosított fizetés</span>
                <span className="opacity-40">|</span>
                <span>Nem jön össze? Teljes visszatérítés</span>
                <span className="opacity-40">|</span>
                <span>Drop-útmutató e-mailben</span>
              </div>
              <div className="mt-1 text-[13px] text-lime-300/70 font-mono">
                {percent}% funded • {remaining} remaining • #{formatSequence(yourNumber ?? 1)} lenne a tiéd
              </div>
            </div>
          </div>
        </header>

        {/* Social proof (ide tegyél valós idézeteket) */}
        <section className="grid  gap-3">
          <Quote author="u/Aggressive_Toucan">„Nehéz leírni, mennnyire hangulatos a késő esti metrón olvasni ezeket, miközben szól a fülemben valami kétezres évekbeli techno/house mix. Nagyon jól írsz!”</Quote>
          <Quote author="u/Cherrydarling">„Bizsergetően jó cucc - és persze teljesen legális. Megcsavar, mélyre visz, szórakoztat - deviáns, abszurd, és azt hiszem őszinte ez a strukturált zűrzavar ami egy jószándékú ámokfutás zseniális leirata.
Sokkal több mint néhány random régi underground story, ez terápiás töltés - élmény.”</Quote>
          <Quote author="u/bober">„Wow. Igazi audiovizuális élmény lesz ez a könyv, várom már a droppot nagyon. Egyelőre nem akarom lelőni a poént, szóval nem hallgatom végig őket, majd szépen a könyvvel együtt.”</Quote>
        </section>

        {/* „Lapozz bele” + soundtrack */}
        <section className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <LightboxTrigger
              label="Lapozz bele (8 oldal)"
              images={["/sample/pages-1-4.png", "/sample/pages-5-8.png"]}
            />
            <Button
              asChild
              variant="outline"
              className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
            >
              <Link href="/music">Hallgasd bele a soundtrackbe</Link>
            </Button>
          </div>
          <TabbedShowcase className="mt-4" />
        </section>

        {/* Nagy vizuál */}
        <Card className="overflow-hidden">
          <img
            src="/vallalhatatlan.png"
            alt="Vállalhatatlan — könyvborító"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </Card>

        {/* Rövid magyarázat */}
        <section className="text-lime-300/80 leading-relaxed space-y-2">
          <p>
            Minden fejezet saját QR-kódot kap, ami a rész világát nyitja meg — zenével, képpel, néha
            helyszínnel. Sorszámozott, dedikált példányok.
          </p>
        </section>

        {/* Progress csík */}
        <Card className="p-4">
          <div className="flex justify-between text-[11px] text-lime-300/80">
            <span>{percent}% funded</span>
            <span>{remaining} remaining</span>
          </div>
          <div className="mt-2 w-full bg-lime-900/30 rounded-full h-3">
            <div className="bg-lime-400 h-3 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
        </Card>

        {/* Másodlagos CTA */}
        <section className="text-center space-y-4">
          <div className="text-lime-300/70 text-sm">A te példányod sorszáma</div>
          <div className="crt-glitch text-4xl font-extrabold text-lime-400 drop-shadow">
            {formatSequence(yourNumber ?? 1)}
          </div>
          <Button
            asChild
            size="lg"
            className="mx-auto border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
            variant="outline"
            data-umami-event="cta_strip_click"
            disabled={soldOut}
          >
            <Link href={soldOut ? "#" : "/checkout"}>Sorszám lefoglalása</Link>
          </Button>
          <div className="text-[12px] text-lime-300/70 space-y-1">
            <div>› A drop ára: {formatCurrency(15000)}</div>
            <div>› Klubtagoknak: {formatCurrency(10000)}</div>
          </div>
        </section>

        {/* Sárga szalag */}
        <div className="relative rotate-[-6deg] bg-lime-500 text-black py-2 select-none overflow-hidden">
          <div className="marquee whitespace-nowrap font-black tracking-wider uppercase">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-2">
                <span>Könyv + Adrenalin + Soundtrack + Letölthető</span>
              </span>
            ))}
          </div>
        </div>

        {/* Térkép */}
        <section id="terkep" aria-labelledby="drops">
          <h2 id="drops" className="sr-only">Drop helyek</h2>
          <NetworkMap
            src="/map-base.png"
            markers={[
              { id: "drop-002", x: 0.78, y: 0.72, label: "Drop #002" },
              { id: "drop-003", x: 0.41, y: 0.58, label: "Drop #003" },
              { id: "drop-004", x: 0.25, y: 0.33, label: "Drop #004" },
              { id: "drop-005", x: 0.62, y: 0.21, label: "Drop #005" },
            ]}
            maxActive={4}
            appearEveryMs={1200}
            lifetimeMs={2600}
            glitchEveryMs={3200}
          />
        </section>

        {/* GYIK */}
        <section className="text-lime-200/80 text-sm leading-relaxed">
          <FAQ className="mt-16" />
        </section>

        <footer className="pb-8 text-center">
          <p className="text-lime-300/60 text-[13px]">
            © 2025 created by{" "}
            <a
              href="https://rickandpam.digital"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime-300/60 hover:text-lime-400"
            >
              rickandpam.digital
            </a>
          </p>
          <div className="mt-1">
            <Link href="/terms" className="text-lime-300/40 text-[11px] hover:text-lime-400 mr-4">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-lime-300/40 text-[11px] hover:text-lime-400">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>

      {/* Sticky buy bar (mobil) */}
      <StickyBuyBar
        soldOut={soldOut}
        price={15000}
        sequence={yourNumber ?? 1}
        percent={percent}
      />

      {/* stílusok */}
      <style>{`
        .marquee { display:inline-block; will-change: transform; animation: marquee 28s linear infinite; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .crt-glitch { position: relative; animation: flicker 0.15s infinite linear alternate, rgb-shift 2s infinite; text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635; }
        .crt-glitch::before { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 50%, rgba(163,230,53,.03) 50%); background-size: 100% 4px; pointer-events: none; animation: scanlines .1s linear infinite; }

        @keyframes flicker { 0%{opacity:1} 97%{opacity:1} 98%{opacity:.98} 99%{opacity:.96} 100%{opacity:1} }
        @keyframes rgb-shift { 0% { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635; transform: translate(0) } 20% { text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #a3e635; transform: translate(-1px,0) } 40% { transform: translate(-1px,1px) } 60% { transform: translate(0,1px) } 80% { transform: translate(1px,0) } 100% { transform: translate(0) } }
        @keyframes scanlines { 0%{transform:translateY(0)} 100%{transform:translateY(4px)} }
      `}</style>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-2xl font-bold text-lime-400">{value}</div>
      <div className="text-lime-300/60 text-xs">{label}</div>
    </div>
  );
}

function Quote({ author, children }: { author: string; children: React.ReactNode }) {
  return (
    <Card className="p-3 border-lime-400/20">
      <div className="text-lime-200 text-sm leading-relaxed">“{children}”</div>
      <div className="mt-2 text-[12px] text-lime-400/80">— {author}</div>
    </Card>
  );
}

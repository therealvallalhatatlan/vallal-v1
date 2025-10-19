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
import TweetRotator from "@/components/TweetRotator";
import FAQ from "@/components/FAQ";
import TabbedShowcase from "@/components/TabbedShowcase";

export const metadata: Metadata = {
  metadataBase: new URL("https://vallalhatatlan.online"),
  title: {
    default: "Vállalhatatlan — Könyv • Zene • Drop",
    template: "%s | Vállalhatatlan",
  },
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
    description:
      "Nyers, sötét humorú novellák + élő, digitális kiterjesztés. Limitált példányok.",
    images: ["/api/og?title=V%C3%A1llalhatatlan"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  category: "books",
  authors: [{ name: "Vállalhatatlan" }],
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  themeColor: "#0ea5a3",
};

// ---------------- Counters (változatlan backend logika) ----------------
async function readCountersSupabase() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const resp = await fetch(`${url}/rest/v1/counters?id=eq.main`, {
      method: "GET",
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!resp.ok) {
      console.warn("[PAGE] Supabase GET failed:", resp.status, await resp.text());
      return null;
    }
    const json = await resp.json();
    if (json && json[0]) {
      const row = json[0];
      return {
        goal: Number(row.goal ?? 100),
        total_sold: Number(row.total_sold ?? row.preorders ?? 0),
        last_sequence_number: Number(row.last_sequence_number ?? 0),
      };
    }
    return null;
  } catch (err) {
    console.error("[PAGE] Supabase fetch error:", err);
    return null;
  }
}
async function readCountersFile() {
  const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json");
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8");
    const json = JSON.parse(raw);
    return {
      goal: Number.isFinite(Number(json.goal)) ? Math.max(1, Number(json.goal)) : 100,
      total_sold: Number.isFinite(Number(json.total_sold ?? json.preorders))
        ? Math.max(0, Number(json.total_sold ?? json.preorders))
        : 0,
      last_sequence_number: Number.isFinite(Number(json.last_sequence_number ?? 0))
        ? Math.max(0, Number(json.last_sequence_number ?? 0))
        : 0,
    };
  } catch {
    return { goal: 100, total_sold: 0, last_sequence_number: 0 };
  }
}
async function readCounters() {
  const sup = await readCountersSupabase();
  if (sup) return sup;
  return readCountersFile();
}

// --------------------------------- Page ---------------------------------
export default async function HomePage() {
  const { goal, total_sold, last_sequence_number } = await readCounters();
  const preorders = Math.min(total_sold ?? 0, goal);
  const remaining = Math.max(0, goal - preorders);
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null;
  const percent = Math.min(100, Math.max(0, Math.round((preorders / goal) * 100)));
  const soldOut = remaining === 0;

  return (
    <Container>

      {/* ---------- HERO / ABOVE THE FOLD ---------- */}
      <div className="mx-auto py-10 px-4 space-y-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-black italic tracking-[-0.04em] text-lime-400 crt-glitch">
              Vállalhatatlan
            </h1>
            <p className="mt-3 text-lime-300/80 leading-relaxed">
              Kortárs, urbánus novellák + QR-kódos digitális réteg. Budapest alagsora
              a ’90/2000-es évekből: rave, identitásválság, rossz döntések és kíméletlen őszinteség.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="sm" className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black" variant="outline">
                <Link href="/konyv">Mi ez a könyv?</Link>
              </Button>
              <Button asChild size="sm" className="bg-lime-400 text-black hover:bg-lime-300">
                <Link href="/novellak">Ugrás a novellákhoz</Link>
              </Button>
              <Button asChild size="sm" className="border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black" variant="outline">
                <Link href="/music">Hallgasd a soundtracket</Link>
              </Button>
            </div>

            <div className="mt-4 text-[13px] text-lime-300/70 font-mono" aria-live="polite">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-lime-400 animate-ping" />
                <TweetRotator
                  heightPx={16}
                  messages={[
                    "Jövő hét elején megy a nyomdába.",
                    "Posta is játszik.",
                    "Számozott, dedikált példányok.",
                  ]}
                  typeMsPerChar={26}
                  eraseMsPerChar={12}
                  holdAfterTypeMs={1200}
                  holdAfterEraseMs={420}
                />
              </span>
            </div>
          </div>

          <aside className="w-full md:w-auto self-stretch md:self-auto text-center rounded-xl border border-lime-400/10 bg-black/60 p-4">
            <div className="text-lime-300/70 text-xs uppercase tracking-widest">Következő Drop</div>
            <div className="text-lime-400 text-4xl md:text-3xl font-extrabold leading-tight mt-1">
              {soldOut ? "—" : `${formatSequence(yourNumber ?? 1)}`}
            </div>
            <div className="mt-2 text-[12px] text-lime-300/70">maradék: {remaining}</div>
            <Button
              asChild
              size="sm"
              className="mt-3 w-full border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black"
              variant="outline"
              disabled={soldOut}
            >
              <Link href={soldOut ? "#" : "/checkout"}>{soldOut ? "Elfogyott" : "Megveszem"}</Link>
            </Button>
          </aside>
        </header>

        {/* ---------- PROOF / VALUE (TabbedShowcase + Key line) ---------- */}
        <section aria-labelledby="value">
          <h2 id="value" className="sr-only">Miért különleges</h2>
          <blockquote className="italic text-lime-200/90">
            Könyv + Adrenalin + Soundtrack + MP3
            <Link
              href="/music"
              aria-label="Játssz bele"
              className="ml-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-lime-400 ring-1 ring-lime-400 hover:bg-lime-400 hover:text-black transition-colors align-middle"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[60%] w-[60%]">
                <polygon points="8,5 19,12 8,19" fill="currentColor" />
              </svg>
            </Link>
          </blockquote>
          <TabbedShowcase className="mt-8" />
        </section>

        {/* ---------- COVER / VISUAL ---------- */}
        <Card className="overflow-hidden">
          <img
            src="/vallalhatatlan.png"
            alt="Vállalhatatlan — könyvborító"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </Card>

        {/* ---------- STORY STRAPLINE ---------- */}
        <section className="text-lime-300/80 leading-relaxed space-y-2">
          <p>
            Ez nem „csak” irodalom. Ez egy átjáró: minden fejezet saját QR-kódot kap, ami a rész világát nyitja meg —
            zenével, képpel, néha helyszínnel.
          </p>
          <p>
            Összesen {goal} példány készül. Sorszámozott. Dedikált. Aki megtalálja, annak története lesz belőle.
          </p>
        </section>

        {/* ---------- COUNTER / PROGRESS ---------- */}
        <Card className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-lime-400">{preorders}</div>
              <div className="text-lime-300/60 text-xs">Előrendelések</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lime-400">{goal}</div>
              <div className="text-lime-300/60 text-xs">Összes példány</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-lime-400">
                {soldOut ? "—" : `#${formatSequence(yourNumber ?? 1)}`}
              </div>
              <div className="text-lime-300/60 text-xs">A te sorszámod</div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[11px] text-lime-300/80">
              <span>{percent}% funded</span>
              <span>{remaining} remaining</span>
            </div>
            <div className="w-full bg-lime-900/30 rounded-full h-3">
              <div className="bg-lime-400 h-3 rounded-full transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </Card>

        {/* ---------- CTA STRIP ---------- */}
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
            disabled={soldOut}
          >
            <Link href={soldOut ? "#" : "/checkout"}>Mutasd, hol van</Link>
          </Button>
          <div className="text-[12px] text-lime-300/70 space-y-1">
            <div>› A drop ára: {formatCurrency(15000)}</div>
            <div>› Klubtagoknak: {formatCurrency(10000)}</div>
          </div>
        </section>

        {/* ---------- MARQUEE ---------- */}
        <div className="relative rotate-[-6deg] bg-lime-500 text-black py-2 select-none overflow-hidden">
          <div className="marquee whitespace-nowrap font-black tracking-wider uppercase">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-2">
                <span>Könyv + Adrenalin + Soundtrack + Letölthető</span>
              </span>
            ))}
          </div>
        </div>

        {/* ---------- MAP / DROPS ---------- */}
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

        {/* ---------- FAQ ---------- */}
        <section className="text-lime-200/80 text-sm leading-relaxed">
          <FAQ className="mt-16" />
        </section>

        {/* ---------- SOCIAL / CONTACT ---------- */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <img src="/swipe.jpg" alt="Vállalhatatlan" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <div className="font-semibold text-lime-300">Vállalhatatlan</div>
              <div className="text-[14px] text-lime-300/70 flex gap-3">
                <a href="https://www.reddit.com/r/vallalhatatlan/" target="_blank" rel="noopener noreferrer" className="hover:text-lime-400">Reddit</a>
                <a href="https://www.facebook.com/vallalhatatlan2000" target="_blank" rel="noopener noreferrer" className="hover:text-lime-400">Facebook</a>
                <a href="mailto:hello@vallalhatatlan.online" className="hover:text-lime-400">Email</a>
              </div>
            </div>
          </div>
        </Card>

        {/* ---------- FOOTER ---------- */}
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

      {/* ---------- Utilities / Effects ---------- */}
      <style>{`
        .marquee { display:inline-block; will-change: transform; animation: marquee 28s linear infinite; }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* CRT/Glitch */
        .crt-glitch { position: relative; animation: flicker 0.15s infinite linear alternate, rgb-shift 2s infinite; text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635; }
        .crt-glitch::before { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 50%, rgba(163,230,53,.03) 50%); background-size: 100% 4px; pointer-events: none; animation: scanlines .1s linear infinite; }

        @keyframes flicker { 0%{opacity:1} 97%{opacity:1} 98%{opacity:.98} 99%{opacity:.96} 100%{opacity:1} }
        @keyframes rgb-shift {
          0% { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff, 0 0 10px #a3e635; transform: translate(0) }
          20% { text-shadow: -2px 0 #ff0000, 2px 0 #00ffff, 0 0 10px #a3e635; transform: translate(-1px,0) }
          40% { transform: translate(-1px,1px) }
          60% { transform: translate(0,1px) }
          80% { transform: translate(1px,0) }
          100% { transform: translate(0) }
        }
        @keyframes scanlines { 0%{transform:translateY(0)} 100%{transform:translateY(4px)} }
      `}</style>
    </Container>
  );
}

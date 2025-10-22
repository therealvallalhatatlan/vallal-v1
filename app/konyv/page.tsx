// app/konyv/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import path from "path";
import fs from "fs/promises";
import { Button } from "@/components/ui/button";
import { formatSequence } from "@/lib/format";

export const metadata: Metadata = {
  title: "Könyv",
  description:
    "Vállalhatatlan – kortárs urbánus novelláskötet és élő, QR-kódos projekt. Ciklusok, dead-drop, zene és vizuálok.",
  alternates: {
    canonical: "https://vallalhatatlan.online/konyv",
  },
  openGraph: {
    title: "Vállalhatatlan – a könyv",
    description:
      "Kortárs urbánus novellák + dead-drop digitális réteg. Ciklusok, zene, vizuálok.",
    url: "https://vallalhatatlan.online/konyv",
    images: [{ url: "/api/og?title=Vállalhatatlan%20–%20a%20könyv" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan – a könyv",
    description:
      "Kortárs urbánus novellák + dead-drop digitális réteg. Ciklusok, zene, vizuálok.",
    images: ["/api/og?title=Vállalhatatlan%20–%20a%20könyv"],
  },
};

const bookSchema = {
  "@context": "https://schema.org",
  "@type": "Book",
  name: "Vállalhatatlan",
  author: { "@type": "Person", name: "Konto Tamás" },
  inLanguage: "hu-HU",
  genre: ["kortárs irodalom", "urbánus fikció"],
  bookEdition: "Első kiadás",
  url: "https://vallalhatatlan.online/konyv",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Kezdőlap",
      item: "https://vallalhatatlan.online",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Könyv",
      item: "https://vallalhatatlan.online/konyv",
    },
  ],
};

// --- counters (same logic as homepage) ---
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
    if (!resp.ok) return null;
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
  } catch {
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
  return (await readCountersSupabase()) ?? (await readCountersFile());
}

export default async function Page() {
  const { goal, total_sold, last_sequence_number } = await readCounters();
  const preorders = Math.min(total_sold ?? 0, goal);
  const remaining = Math.max(0, goal - preorders);
  const yourNumber = remaining > 0 ? Math.min(goal, (last_sequence_number ?? preorders) + 1) : null;
  const soldOut = remaining === 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-invert">
      {/* 1) HEADER */}
      <header className="flex items-start justify-between">
        <div>
          <div className="mt-2 mb-2 text-4xl font-black italic tracking-[-0.04em] text-lime-400 crt-glitch">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              Vállalhatatlan
            </Link> <br/>
          </div>
        </div>
      </header>

     {/* Következő Drop – same look as homepage */}
     <aside className="not-prose mt-2 w-full md:w-auto self-stretch md:self-auto text-center rounded-xl border border-lime-400/10 bg-black/60 p-4">
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

      <h1 className="mb-2 tracking-tight text-lime-400">Könyv + Soundtrack + Kaland</h1>
      <p className="mt-0 text-sm text-zinc-400">Budapest Underground, Y2K hangulat • könyv + digitális réteg</p>

      {/* TL;DR */}
      <div className="mt-6 rounded-xl border border-lime-400/20 bg-black/50 p-4 leading-relaxed">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-lime-300/80">⚡ TL;DR</div>
        <p className="m-0 text-zinc-200">
          A Vállalhatatlan egy Reddites ámokfutásból kinőtt novelláskötet és egy élő, multimédiás, multidimenzionális
          művészeti projekt, amiben te is részt vehetsz.
          <br /><br />
          Nyomtatott, igazi könyv, ami QR-kódokkal nyíló online réteget rejt, soundtrackkel, letölthető zenékkel,
          és valós, felfedezhető helyszínekkel. Egy kaland. Egy védőoltás.
        </p>
      </div>

      <h2 className="mt-8">Miről szól?</h2>
      <p>
        A könyv egy szerelemről, és egy sosemvolt, álomszerű korról szól, amiben egyszerre volt jelen az értelmetlen
        önpusztítás és a mindent elsöprő optimizmus. Mintha csak újjá akartunk volna születni.
      </p>

      {/* Q&A – collapsible */}
      <h2 className="mt-10">Gyors kérdések</h2>
      <div className="space-y-3">
        <details className="group rounded-lg border border-zinc-800 bg-black/40 p-4">
          <summary className="cursor-pointer list-none font-semibold text-zinc-200 marker:content-none">
            Ki a Vállalhatatlan?
          </summary>
          <div className="mt-2 text-zinc-300">
            Egy karakter. Nem létezhet ilyen figura, lehetetlen hogy mindezt túlélte és képes mindezt leírni is.
          </div>
        </details>

        <details className="group rounded-lg border border-zinc-800 bg-black/40 p-4">
          <summary className="cursor-pointer list-none font-semibold text-zinc-200">Mi az a dead-drop?</summary>
          <div className="mt-2 text-zinc-300">
            Egy titkosszolgálati módszer: elrejtett csomag egy valós helyszínen. Meg kell találnod.
            Mintha valami illegálisat csinálnál — pedig nem! Így teljes az élmény.
          </div>
        </details>

        <details className="group rounded-lg border border-zinc-800 bg-black/40 p-4">
          <summary className="cursor-pointer list-none font-semibold text-zinc-200">Kérhetem postán?</summary>
          <div className="mt-2 text-zinc-300">
            Igen, limitált ideig és készlet függvényében. Részletek az oldalon a drop időszakban.
          </div>
        </details>
      </div>

      {/* JSON-LD (Book + Breadcrumb) */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([bookSchema, breadcrumbSchema]),
        }}
      />
    </main>
  );
}
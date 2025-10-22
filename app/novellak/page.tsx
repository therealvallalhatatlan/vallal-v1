// app/novellak/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Novellák",
  description:
    "A Vállalhatatlan novelláinak gyűjtőoldala. Minden cím saját aloldallal, zenével és vizuális rétegekkel.",
  alternates: {
    canonical: "https://vallalhatatlan.online/novellak",
  },
  openGraph: {
    title: "Vállalhatatlan – Novellák",
    description:
      "Az összes novella egy helyen. Zenék, vizuálok, QR-dropok és háttér.",
    url: "https://vallalhatatlan.online/novellak",
    images: [{ url: "/api/og?title=Novell%C3%A1k" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan – Novellák",
    description:
      "Az összes novella egy helyen. Zenék, vizuálok, QR-dropok és háttér.",
    images: ["/api/og?title=Novell%C3%A1k"],
  },
};

type PlaylistJson = {
  title?: string;
  excerpt?: string;
  tracks?: Array<{ title?: string; file?: string }>;
  visuals?: string[];
  // bármi egyéb mező jöhet, toleráljuk
  [key: string]: unknown;
};

type NovellaItem = {
  slug: string;
  title: string;
  excerpt?: string;
  href: string;
  trackCount?: number; // új: badge-hez
};

function humanizeSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

async function readPlaylistIndex(): Promise<NovellaItem[]> {
  const dir = path.join(process.cwd(), "public", "playlists");
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return [];
  }

  const jsonFiles = files
    .filter((f) => f.toLowerCase().endsWith(".json"))
    // ha van saját index.json-od, vedd ki a listából:
    .filter((f) => f.toLowerCase() !== "index.json");

  const items: NovellaItem[] = [];
  for (const file of jsonFiles) {
    const slug = file.replace(/\.json$/i, "");
    const href = `/${slug}`;
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const data = JSON.parse(raw) as PlaylistJson;
      const title = data.title?.toString().trim() || humanizeSlug(slug);
      const excerpt = data.excerpt?.toString().trim();
      const trackCount = Array.isArray(data.tracks) ? data.tracks.length : undefined;
      items.push({ slug, title, excerpt, href, trackCount });
    } catch {
      // hibás JSON esetén is legyen egy bejegyzés kulturált fallbackkel
      items.push({ slug, title: humanizeSlug(slug), href });
    }
  }

  // ha akarsz rendezést: cím szerint
  items.sort((a, b) => a.title.localeCompare(b.title, "hu"));
  return items;
}

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
      name: "Novellák",
      item: "https://vallalhatatlan.online/novellak",
    },
  ],
};

function buildCollectionJsonLd(items: NovellaItem[]) {
  // ItemList + CollectionPage: a keresők és AI-k szeretik
  const itemListElement = items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `https://vallalhatatlan.online${it.href}`,
    name: it.title,
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Vállalhatatlan – Novellák",
      url: "https://vallalhatatlan.online/novellak",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement,
      numberOfItems: items.length,
    },
  ];
}

export default async function Page() {
  const items = await readPlaylistIndex();
  const collectionJsonLd = buildCollectionJsonLd(items);

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

      <h1 className="mb-1 tracking-tight text-lime-400">Novellák</h1>
      <p className="mt-0 text-sm text-zinc-400">Minden cím saját aloldallal, zenével és vizuális rétegekkel</p>

      {/* TL;DR – callout */}
      <div className="mt-6 rounded-xl border border-lime-400/20 bg-black/50 p-4 leading-relaxed not-prose">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-lime-300/80">⚡ Röviden</div>
        <p className="m-0 text-zinc-200">
          <strong>Röviden:</strong> A Vállalhatatlan összes novellája egy helyen. Minden cím saját aloldallal,
          zenével, képekkel és extra kontextussal. A lista folyamatosan frissül.
        </p>
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="mt-6 text-zinc-400 italic">Még nincs publikált novella. Nézz vissza később!</p>
      ) : (
        <ul className="not-prose grid gap-3 sm:grid-cols-2 mt-6">
          {items.map((it) => (
            <li
              key={it.slug}
              className="rounded-2xl border border-white/10 bg-black/30 hover:border-lime-400/40 hover:bg-black/50 transition"
            >
              <a href={it.href} className="block p-4 group">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-snug group-hover:text-lime-300 transition">
                    {it.title}
                  </h3>
                  {typeof it.trackCount === "number" && it.trackCount > 0 && (
                    <span className="shrink-0 rounded-md border border-lime-400/30 bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-lime-300/80">
                      Zene: {it.trackCount}
                    </span>
                  )}
                </div>
                {it.excerpt ? (
                  <p className="mt-2 text-sm opacity-80 line-clamp-3">{it.excerpt}</p>
                ) : (
                  <p className="mt-2 text-sm opacity-60 italic">Kivonat hamarosan…</p>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span>/{it.slug}</span>
                  <span className="opacity-60 group-hover:opacity-100 transition">→</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}

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

      {/* JSON-LD: Breadcrumb + Collection/ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
    </main>

  );
}

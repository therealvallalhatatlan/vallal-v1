// app/projektek/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projektek",
  description:
    "A Vállalhatatlan élő projektjei: dead-drop akciók, QR-kódos aloldalak, digitális kiadás, zenék és közösségi nyomozás.",
  alternates: {
    canonical: "https://vallalhatatlan.online/projektek",
  },
  openGraph: {
    title: "Vállalhatatlan – Projektek",
    description:
      "Dead-drop, level-one aloldalak, digitális kiadás, soundtrack és közösségi nyomozás.",
    url: "https://vallalhatatlan.online/projektek",
    images: [{ url: "/api/og?title=Projektek" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan – Projektek",
    description:
      "Dead-drop, level-one aloldalak, digitális kiadás, soundtrack és közösségi nyomozás.",
    images: ["/api/og?title=Projektek"],
  },
};

type Project = {
  title: string;
  summary: string;
  href?: string; // csak olyan linket adunk meg, ami nálad létezik
};

const projects: Project[] = [
  {
    title: "Dead-drop könyvdropok",
    summary:
      "Időszakos rejtekhelyek a városban. A megtalálóknak QR-kód, hozzáférés és emlék.",
    // ha lesz külön aloldal, ide jöhet majd a /projektek/dead-drop
    href: "/konyv",
  },
  {
    title: "QR-kódos „level-one” aloldalak",
    summary:
      "Minden novella saját oldalt kap zenével, képpel, rövid kontextussal.",
    href: "/novellak",
  },
  {
    title: "Digitális kiadás",
    summary:
      "A könyv web/PDF/EPUB formában is elérhető, rövid regisztráció után.",
    href: "/konyv",
  },
  {
    title: "Soundtrack & vizuál archív",
    summary:
      "Saját lejátszók és vizuális rétegek, hogy a szövegek tényleg „szóljanak”.",
    href: "/music",
  },
  {
    title: "Pendrive-karkötő",
    summary:
      "Fizikai kulcs a digitális térhez (kísérleti széria, limitált darabszám).",
  },
  {
    title: "Közösségi nyomozás (Reddit)",
    summary:
      "Nyomok, spekulációk, sztorik és találat-jelentések a /r/vallalhatatlan közösségben.",
    href: "https://www.reddit.com/r/vallalhatatlan",
  },
];

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
      name: "Projektek",
      item: "https://vallalhatatlan.online/projektek",
    },
  ],
};

function buildCollectionJsonLd(items: Project[]) {
  const itemListElement = items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.title,
    // csak akkor adunk url-t, ha biztosan élő oldalra mutat
    ...(it.href
      ? {
          url: it.href.startsWith("http")
            ? it.href
            : `https://vallalhatatlan.online${it.href}`,
        }
      : {}),
  }));

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Vállalhatatlan – Projektek",
      url: "https://vallalhatatlan.online/projektek",
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement,
      numberOfItems: items.length,
    },
  ];
}

export default function Page() {
  const collectionJsonLd = buildCollectionJsonLd(projects);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 prose prose-invert">
      <h1 className="mb-1 tracking-tight text-lime-400">Projektek</h1>
      <p className="mt-0 text-sm text-zinc-400">
        Dead-drop, level-one aloldalak, digitális kiadás, zenék és közösségi
        nyomozás
      </p>

      {/* TL;DR – callout */}
      <div className="mt-6 rounded-xl border border-lime-400/20 bg-black/50 p-4 leading-relaxed not-prose">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-lime-300/80">
          ⚡ Röviden
        </div>
        <p className="m-0 text-zinc-200">
          <strong>Röviden:</strong> A Vállalhatatlan nem csak könyv, hanem
          többágú, élő projekt: dead-drop akciók, QR-kódos „level-one” aloldalak,
          digitális kiadás, zenék és vizuálok, valamint közösségi nyomozás.
        </p>
      </div>

      {/* Kártyák */}
      <ul className="not-prose grid gap-3 sm:grid-cols-2 mt-6">
        {projects.map((p) => (
          <li
            key={p.title}
            className="rounded-2xl border border-white/10 bg-black/30 hover:border-lime-400/40 hover:bg-black/50 transition"
          >
            {p.href ? (
              <a
                href={p.href}
                className="block p-4 group"
                rel={
                  p.href.startsWith("http")
                    ? "nofollow noopener noreferrer"
                    : undefined
                }
                target={p.href.startsWith("http") ? "_blank" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold leading-snug group-hover:text-lime-300 transition">
                    {p.title}
                  </h3>
                  {p.href.startsWith("http") && (
                    <span className="shrink-0 rounded-md border border-zinc-700/60 bg-black/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400/90">
                      Külső
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm opacity-80">{p.summary}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                  <span className="opacity-70">{p.href}</span>
                  <span className="opacity-60 group-hover:opacity-100 transition">
                    →
                  </span>
                </div>
              </a>
            ) : (
              <div className="p-4">
                <h3 className="text-lg font-semibold leading-snug">{p.title}</h3>
                <p className="mt-2 text-sm opacity-80">{p.summary}</p>
                <div className="mt-3 text-xs text-zinc-500 opacity-70">
                  Hamarosan…
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* JSON-LD: Breadcrumb + Collection/ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd),
        }}
      />
    </main>
  );
}

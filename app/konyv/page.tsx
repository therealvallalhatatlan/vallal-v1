// app/konyv/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

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

export default function Page() {
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

      <h1 className="mb-2 tracking-tight text-lime-400">Könyv + Soundtrack + Kaland</h1>
      <p className="mt-0 text-sm text-zinc-400">Budapest Underground, Y2K hangulat • könyv + digitális réteg</p>

      {/* TL;DR */}
      <div className="mt-6 rounded-xl border border-lime-400/20 bg-black/50 p-4 leading-relaxed">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-lime-300/80">⚡ TL;DR</div>
        <p className="m-0 text-zinc-200">
          A Vállalhatatlan egy Reddites ámokfutásból kinőtt novelláskötet és egy élő, multimédiás, multidimenzionális művészeti projekt, amiben te is részt vehetsz. 
          <br/><br/>Nyomtatott, igazi könyv, ami QR-kódokkal nyíló online réteget rejt, soundtrackkel, letölthető zenékkel,
          és valós, felfedezhető helyszínekkel. Egy kaland. Egy védőoltás.
        </p>
      </div>

      <h2 className="mt-8">Miről szól?</h2>
      <p>
        A könyv egy szerelemről, és egy sosemvolt, álomszerű korról szól, amiben egyszerre volt jelen az értelmetlen önpusztítás és a mindent elsöprő optimizmus.
        Mintha csak újjá akartunk volna születni.
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
            Egy titkosszolgálati módszer: elrejtett csomag egy valós helyszínen.
            Meg kell találnod. Mintha valami illegálisat csinálnál, pedig nem! Így teljesz az élmény.
            Nem szivatás - kaland. Mindig olyan helyen van a csomag ahol könnyen, másokkal való interakció nélkül, biztonságosan hozzáférsz.
            De ha úgy érzed nem kalandoznál postán is megrendelheted. 
          </div>
        </details>
      </div>



      {/* Access */}
      <h2 className="mt-10">Hogyan juthatsz hozzá?</h2>
      <p>
        Limitált példány, alkalmankénti dead-drop csomagokkal (QR + digitális hozzáférés). Emellett elérhető lesz digitálisan
        is: web/PDF/EPUB formátumban.
      </p>

      {/* Fact box */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-black/40 p-4">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-zinc-400">Adatdoboz</div>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
            <dt className="text-zinc-400">Megjelenés</dt>
            <dd className="text-zinc-200">2025</dd>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
            <dt className="text-zinc-400">Terjedelem</dt>
            <dd className="text-zinc-200">168 oldal</dd>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
            <dt className="text-zinc-400">Média</dt>
            <dd className="text-zinc-200">Nyomtatott + digitális</dd>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
            <dt className="text-zinc-400">Kapcsolódók</dt>
            <dd className="text-zinc-200">/music, /novellak, /rolunk</dd>
          </div>
        </dl>
      </div>

      <h2 className="mt-10">Zene & vizuálok</h2>
      <p>
        Minden novella saját lejátszóval és képi világgal érkezik. A lejátszók mellett rövid transzkript/összefoglaló is
        lesz – a keresők és AI-összefoglalók kedvéért.
      </p>

      {/* JSON-LD (Book + Breadcrumb) */}
      <script
        type="application/ld+json"
        // @ts-ignore: JSON string literal
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookSchema) }}
      />
      <script
        type="application/ld+json"
        // @ts-ignore: JSON string literal
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  );
}

// app/rolunk/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rólunk",
  description:
    "A Vállalhatatlan nem csapat és nem is egyetlen ember. Egy jelenség, ami Reddit-kommentekből nőtt át egy másik valóságba.",
  alternates: {
    canonical: "https://vallalhatatlan.online/rolunk",
  },
  openGraph: {
    title: "Vállalhatatlan – Rólunk",
    description:
      "Egy Reddit-szálból indult kísérlet, ami történetté vált. A könyv csak a fedőréteg.",
    url: "https://vallalhatatlan.online/rolunk",
    images: [{ url: "/api/og?title=R%C3%B3lunk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vállalhatatlan – Rólunk",
    description:
      "Egy Reddit-szálból indult kísérlet, ami történetté vált. A könyv csak a fedőréteg.",
    images: ["/api/og?title=R%C3%B3lunk"],
  },
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
      name: "Rólunk",
      item: "https://vallalhatatlan.online/rolunk",
    },
  ],
};

const aboutPageSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Vállalhatatlan – Rólunk",
  url: "https://vallalhatatlan.online/rolunk",
  inLanguage: "hu-HU",
  isPartOf: {
    "@type": "CreativeWork",
    name: "Vállalhatatlan",
    url: "https://vallalhatatlan.online",
  },
  description:
    "A Vállalhatatlan Reddit-kommentekből született, és valós történetekkel fonódott össze. Egy közösség, ami lassan könyvvé vált.",
};

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 prose prose-invert">
      <h1 className="mb-1 tracking-tight text-lime-400">Rólunk</h1>
      <p className="mt-0 text-sm text-zinc-400">
        Multiverzum-átcsúszás, jelenség és kísérlet • a könyv csak a fedőréteg
      </p>

      {/* TL;DR */}
      <div className="mt-6 rounded-xl border border-lime-400/20 bg-black/50 p-4 leading-relaxed not-prose">
        <div className="mb-2 text-[12px] font-mono uppercase tracking-widest text-lime-300/80">
          ⚡ Röviden
        </div>
        <p className="m-0 text-zinc-200">
          A Vállalhatatlan nem csapat és nem is egyetlen ember. Inkább egy
          jelenség, ami áttolódott egy szomszédos valóságból. Ha figyelsz,
          észreveszed a varratokat a napjaid szövetén: hanghibákat, ugrást a
          filmkockák között, apró „nem így emlékszem” pillanatokat. Ott
          csúszunk át.
        </p>
      </div>

      {/* Hogyan indult? */}
      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="prose-h2 m-0">Hogyan indult ez az egész?</h2>
        <p className="prose-p mt-3 text-zinc-300">
          Furcsán. Egy teljesen oda nem illő, túl nyers bejegyzéssel a Redditen.
          Az első poszt alatt percek alatt jött a sav – “nem ide való”, “fake”,
          “kitaláció” – aztán egyetlen komment átütötte a zajt:{" "}
          <span className="italic text-lime-300">„FOLYTASD.”</span>
        </p>
        <p className="prose-p mt-3 text-zinc-300">
          Onnantól valami megmozdult. Pár nap alatt kialakult egy követői
          mag, és néhány hét múlva 980 ember csatlakozott. Többen közülük
          megerősítették, hogy a történetek valósak: valaki például azt írta,
          ott volt Agresszív Lacinál a kocsmában; másik nap feltűnt Stázi is,
          elég ellenségesen.
        </p>
        <p className="prose-p mt-3 text-zinc-300">
          Aki kommentel, elolvassa vagy megszerzi a könyvet, az valójában
          részt vesz a történetben. A határ olvasó és szereplő között itt már
          régen eltűnt.
        </p>
      </section>

      {/* Mi ez az egész? */}
      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="prose-h2 m-0">Mi ez az egész?</h2>
        <p className="prose-p mt-3 text-zinc-300">
          Kísérlet: lehet-e úgy rögzíteni egy élményt, hogy közben mozog? A
          nyomtatott könyv statikus. Az aloldalak, zenék, képek és a dead-drop
          viszont átjárók. Ami tegnap eltűnt, ma máshol bukkan fel. A
          Vállalhatatlan nem brand, hanem eltolódás — attól még, hogy néha úgy
          viselkedik, mint egy könyv.
        </p>
      </section>

      {/* Ki beszél? */}
      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="prose-h2 m-0">Ki beszél?</h2>
        <p className="prose-p mt-3 text-zinc-300">
          Az egyikünk. Vagy ugyanaz, aki egy másik idővonalon már mást választott.
          A döntések nem tűnnek el; áthúzódnak. A könyv ezeknek az áthallásoknak
          a lenyomata: történetek, amik néha előbb történnek meg, mint ahogy
          megtörténnek.
        </p>
      </section>

      {/* Miért rejtett? */}
      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="prose-h2 m-0">Miért van ennyi rejtett rész?</h2>
        <p className="prose-p mt-3 text-zinc-300">
          Mert a történetek nem bírják a direkt fényt. A sötétben pontosabban
          rajzolnak. Aki keresi, megtalálja. (A Redditen néha elejtünk
          morzsákat. Máskor meg felkapja a szél, és viszi magától.)
        </p>
      </section>

      {/* Kapcsolat */}
      <section className="not-prose mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
        <h2 className="prose-h2 m-0">Ha kapcsolatba lépnél</h2>
        <p className="prose-p mt-3 text-zinc-300">
          Keresd a jeleket: QR-kód a pad alatt, satírozott név a pecséten, egy
          ismerős dallam rossz hangszeren. Vagy a{" "}
          <a
            href="https://www.reddit.com/r/vallalhatatlan"
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="text-lime-300 hover:text-lime-200 underline"
          >
            /r/vallalhatatlan
          </a>{" "}
          szélárnyéka. Nem ígérünk választ. Csak visszhangot.
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          —<br />
          <em>Operátor: V.</em>
        </p>
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
    </main>
  );
}

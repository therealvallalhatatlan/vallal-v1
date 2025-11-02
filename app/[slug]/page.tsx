// app/[slug]/page.tsx
import AudioPlayer from "@/components/AudioPlayer";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadPlaylist } from "@/lib/playlistIndex";
import { listSlugs } from "@/lib/playlistIndex";
import { PlaylistSelector } from "@/components/PlaylistSelector";

// ===== Config =====
const SITE_ORIGIN = "https://vallalhatatlan.online";
const FALLBACK_VISUALS = [
  "/img/visuals/noise-01.jpg",
  "/img/visuals/noise-02.jpg",
  "/img/visuals/noise-03.jpg",
];

// Fallback in-code playlist (ha nincs JSON a public/playlists alatt)
const FALLBACK: Record<string, { title: string; file: string }[]> = {
  "holnaptol-leallok": [
    { title: "Intro – Város zaj", file: "holnaptol-leallok/01_intro.mp3" },
    { title: "Szoba – loop", file: "holnaptol-leallok/02_szoba.mp3" },
    { title: "Éjfél – futás", file: "holnaptol-leallok/03_ejfel.mp3" },
  ],
  sample: [
    {
      title: "Bloody Shelby – We The North (Original Mix)",
      file: "sample/Bloody Shelby - We The North (Original Mix).mp3",
    },
  ],
};

// ===== Helpers =====
function humanize(slug: string) {
  return decodeURIComponent(slug)
    .replace(/^\d+-/, "") // Remove leading numbers and dash (e.g., "01-", "02-")
    .replace(/-/g, " ");
}
function firstVisualFrom(data?: { visuals?: string[] } | null) {
  const arr =
    Array.isArray(data?.visuals) && data!.visuals!.length
      ? data!.visuals!
      : FALLBACK_VISUALS;
  return arr[0];
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  if (typeof slug !== "string" || !slug.trim()) {
    notFound();
  }

  // Prevent handling favicon and other static assets
  if (slug === "favicon.ico" || slug.includes(".")) {
    notFound();
  }

  const data = await loadPlaylist(slug);
  
  // Load all available slugs for the dropdown
  const allSlugs = await listSlugs();
  const currentIndex = allSlugs.findIndex(s => s === slug);
  
  // Load all playlist titles for the dropdown
  const playlistOptions = await Promise.all(
    allSlugs.map(async (s, i) => {
      const playlistData = await loadPlaylist(s);
      // For dropdown: keep the numbering prefix, but clean the rest
      const cleanTitle = decodeURIComponent(s).replace(/-/g, ' ')
      const title = (playlistData as any)?.title || cleanTitle
      return { slug: s, title, pageNum: i + 1 };
    })
  );

  // Resilient fallback if JSON missing/invalid
  const tracks = data?.tracks?.length
    ? data.tracks
    : FALLBACK[slug] ?? FALLBACK.sample;
  const visuals =
    Array.isArray(data?.visuals) && data!.visuals!.length
      ? data!.visuals!
      : FALLBACK_VISUALS;
  const excerpt =
    typeof data?.excerpt === "string" ? (data!.excerpt as string) : undefined;
  const displayTitle = humanize(slug);

  return (
    <main className="w-[min(640px,100vw-32px)] px-4 space-y-8 mx-auto p-6 text-zinc-100 text-left">
      <h1 className="text-4xl font-semibold mt-12 mb-4 text-left rgb-title">
        {displayTitle}
      </h1>

      {/* Dropdown selector by title */}
      {allSlugs.length > 1 && (
        <div className="mb-6">
          <PlaylistSelector 
            options={playlistOptions}
            currentPage={currentIndex + 1}
            total={allSlugs.length}
            baseUrl=""
          />
        </div>
      )}

      {excerpt && (
        <p className="text-zinc-300/90 text-base leading-relaxed mb-8 whitespace-pre-line">
          {excerpt}
        </p>
      )}

      <p className="text-xs text-center opacity-35 mb-10">
        <code>public/playlists/{slug}.json</code>
      </p>

      <AudioPlayer tracks={tracks} images={visuals} />

      {/* MusicPlaylist JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicPlaylist",
            name: displayTitle,
            description: excerpt || undefined,
            numTracks: (tracks || []).length,
            track: (tracks || []).map((t: any, i: number) => ({
              "@type": "MusicRecording",
              position: i + 1,
              name: t.title,
              audio: {
                "@type": "AudioObject",
                // path segment encoding to survive spaces/diacritics/symbols
                url: `/api/audio/${t.file
                  .split("/")
                  .map(encodeURIComponent)
                  .join("/")}`,
              },
            })),
          }),
        }}
      />

      {/* BreadcrumbList JSON-LD: Kezdőlap → Novellák → {displayTitle} */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Kezdőlap",
                item: `${SITE_ORIGIN}/`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Novellák",
                item: `${SITE_ORIGIN}/novellak`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: displayTitle,
                item: `${SITE_ORIGIN}/${encodeURIComponent(slug)}`,
              },
            ],
          }),
        }}
      />

      <style>{`
        .rgb-title {
          position: relative;
          text-shadow:
            3px 0 0 rgba(255,0,0,0.85),
            -3px 0 0 rgba(0,255,255,0.85),
            0 2px 0 rgba(0,0,0,0.35);
          filter: contrast(140%) saturate(140%);
        }
      `}</style>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = params;
  if (typeof slug !== "string" || !slug.trim()) return {};
  if (slug === "favicon.ico" || slug.includes(".")) return {};

  const data = await loadPlaylist(slug);
  const title = humanize(slug);
  const desc = (data?.excerpt ?? "").slice(0, 160) || undefined;

  // Dinamikus OG-kép a glitch kompozittal (két vizuál alapján).
  // Az /api/og route a slug-hoz tartozó playlist JSON-ból épít OG-t.
  const ogUrl = `${SITE_ORIGIN}/api/og?slug=${encodeURIComponent(
    slug
  )}&title=${encodeURIComponent(title)}`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/${encodeURIComponent(slug)}` },
    openGraph: {
      title,
      description: desc,
      url: `/${encodeURIComponent(slug)}`,
      images: [{ url: ogUrl }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogUrl],
    },
  };
}

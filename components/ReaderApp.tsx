// components/reader/ReaderApp.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import AudioPlayer2 from "@/components/AudioPlayer2";

export type Story = {
  id: string;
  slug: string;
  title: string;
  readingTime: number; // perc
  order: number;
  text: string;
};

type ReaderAppProps = {
  stories: Story[];
};

const STORAGE_KEY = "vallalhatatlan-reader-state";
const SETTINGS_KEY = "vallalhatatlan-reader-settings";

type ReaderState = {
  lastStorySlug?: string;
  finishedStories?: string[];
};

type PlaylistTrack = {
  title: string;
  file: string;
  durationSec?: number;
};

type PlaylistData = {
  excerpt?: string;
  tracks?: PlaylistTrack[];
  visuals?: string[];
};

// ===== Playlist config / alias mapping =====
const PLAYLIST_BASE = "/playlists"; // physical: /public/playlists/*.json
const PLAYLIST_ALIASES: Record<string, string> = {
  // storySlug: playlistSlug
  "k-hole": "teleki-ter",
  fefe: "fefe-elromlott",
  kirandulas: "kirandulas-a-marsra",
  leharapott: "leharapott-huvelykujj",
  pucer: "pucer-nyaralas",
  vori: "vori-es-a-mentostaska",
  elgazolom: "elgazolom-az-egyik-vasarlomat",
  holnaptol: "holnaptol-leallok",
  szelvedo: "szelvedo-nelkul",
  csernus: "dr-csernus-rambassza",
  hatodik: "hatodik-nap-a-zartosztalyon",
  private: "private-link-netcafe",
};
function buildPlaylistCandidates(slug: string): string[] {
  const out = new Set<string>();
  if (PLAYLIST_ALIASES[slug]) out.add(PLAYLIST_ALIASES[slug]);
  out.add(slug); // raw
  // heuristic expansions (only if not alias already)
  if (!PLAYLIST_ALIASES[slug]) {
    if (slug.startsWith("atropina-")) out.add(slug); // already matches
  }
  return Array.from(out);
}

export default function ReaderApp({ stories }: ReaderAppProps) {
  const firstStory = stories[0];
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(
    firstStory?.slug
  );
  const [readerState, setReaderState] = useState<ReaderState>({});
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastYRef = useRef(0);
  const [showLoader, setShowLoader] = useState(false);

  // settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(19); // alap betűméret px-ben
  const [effectsEnabled, setEffectsEnabled] = useState<boolean>(true);

  // playlist state
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  const currentIndex = useMemo(
    () => stories.findIndex((s) => s.slug === currentSlug),
    [stories, currentSlug]
  );

  const currentStory = useMemo(
    () => (currentIndex >= 0 ? stories[currentIndex] : firstStory),
    [stories, currentIndex, firstStory]
  );

  const userInitial = "V"; // Vállalhatatlan Klubtag

  // Betöltés localStorage-ból (novella progress)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        if (firstStory) {
          const initialState: ReaderState = {
            lastStorySlug: firstStory.slug,
            finishedStories: [firstStory.slug],
          };
          setReaderState(initialState);
          setCurrentSlug(firstStory.slug);
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(initialState)
          );
        }
        return;
      }

      const parsed: ReaderState = JSON.parse(raw);
      setReaderState(parsed);

      if (
        parsed.lastStorySlug &&
        stories.some((s) => s.slug === parsed.lastStorySlug)
      ) {
        setCurrentSlug(parsed.lastStorySlug);
      } else if (firstStory) {
        setCurrentSlug(firstStory.slug);
      }
    } catch {
      if (firstStory) {
        setCurrentSlug(firstStory.slug);
      }
    }
  }, [stories, firstStory]);

  // Betűméret betöltése localStorage-ból
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.fontSize === "number") {
        setFontSize(parsed.fontSize);
      }
     if (typeof parsed.effectsEnabled === "boolean") {
       setEffectsEnabled(parsed.effectsEnabled);
     }
    } catch {
      // ignore
    }
  }, []);

  // Playlist betöltése az aktuális sztorihoz
  useEffect(() => {
    if (!currentStory?.slug) {
      setPlaylist(null);
      return;
    }

    const load = async () => {
      setPlaylistLoading(true);
      try {
        const candidates = buildPlaylistCandidates(currentStory.slug);
        let found: PlaylistData | null = null;
        for (const c of candidates) {
          const url = `${PLAYLIST_BASE}/${c}.json`;
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) {
              console.warn("[playlist][miss]", res.status, url);
              continue;
            }
            const json = (await res.json()) as PlaylistData;
            if (json && (json.tracks?.length || json.excerpt || json.visuals?.length)) {
              console.log("[playlist][hit]", url);
              found = json;
              break;
            } else {
              console.warn("[playlist][empty-structure]", url, json);
            }
          } catch (err) {
            console.warn("[playlist][fetch-error]", c, err);
          }
        }
        setPlaylist(found);
      } catch (e) {
        console.error("Playlist betöltési hiba:", e);
        setPlaylist(null);
      } finally {
        setPlaylistLoading(false);
      }
    };

    load();
  }, [currentStory?.slug]);

  // Mentés localStorage-ba (progress)
  const persistState = (next: ReaderState) => {
    setReaderState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const markAsFinished = (slug: string) => {
    const finished = new Set(readerState.finishedStories || []);
    finished.add(slug);
    persistState({
      ...readerState,
      lastStorySlug: slug,
      finishedStories: Array.from(finished),
    });
  };

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const handleSelectStory = (slug: string) => {
    setCurrentSlug(slug);
    markAsFinished(slug);
    scrollToTop();
    setShowLoader(true);
    setTimeout(() => setShowLoader(false), 700);
  };

  const handleSelectStoryFromMobileToc = (slug: string) => {
    handleSelectStory(slug);
    setMobileTocOpen(false);
  };

  const goPrev = () => {
    if (currentIndex <= 0) return;
    const prevStory = stories[currentIndex - 1];
    handleSelectStory(prevStory.slug);
  };

  const goNext = () => {
    if (currentIndex === -1 || currentIndex >= stories.length - 1) return;
    const nextStory = stories[currentIndex + 1];
    handleSelectStory(nextStory.slug);
  };

  const totalStories = stories.length;
  const finishedCount = readerState.finishedStories?.length || 0;
  const bookProgress = totalStories > 0 ? finishedCount / totalStories : 0;

  // Header show/hide on scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    lastYRef.current = window.scrollY || 0;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const last = lastYRef.current;
      if (y < 16) {
        setHeaderHidden(false);
      } else if (y > last && y > 48) {
        setHeaderHidden(true);
      } else if (y < last - 2) {
        setHeaderHidden(false);
      }
      lastYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const persistSettings = (nextFontSize: number, nextEffects: boolean) => {
    try {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ fontSize: nextFontSize, effectsEnabled: nextEffects })
      );
    } catch {
      // ignore
    }
  };

  // Betűméret módosítása + mentése
  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(36, Math.max(14, prev + delta));
      persistSettings(next, effectsEnabled);
      return next;
    });
  };
 const toggleEffects = () => {
   setEffectsEnabled((prev) => {
     const next = !prev;
     persistSettings(fontSize, next);
     return next;
   });
 };

  return (
    <div className={`flex min-h-[100dvh] ${effectsEnabled ? 'effects-on' : 'effects-off'}`}>
      {showLoader && <div className="story-loader" />}

      {/* Sidebar - tartalomjegyzék (desktop) */}
      <aside className="hidden md:flex w-72 flex-col border-r border-neutral-800 bg-neutral-950/80">
        {/* Brand + user blokk */}
        <div className="px-4 py-4 border-b border-neutral-800 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Vállalhatatlan
            </div>
            <div className="text-sm font-medium text-neutral-300">
              Digitális Reader
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-neutral-800 flex items-center justify-center text-sm font-medium text-neutral-200">
                {userInitial}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-300 truncate max-w-[120px]">
                  Klubtag
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-[0.18em]">
                  belépve
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          {stories.map((story) => {
            const isActive = story.slug === currentStory?.slug;
            const isFinished =
              readerState.finishedStories?.includes(story.slug) ?? false;

            return (
              <button
                key={story.slug}
                onClick={() => handleSelectStory(story.slug)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? "bg-neutral-900 text-neutral-200"
                    : "text-neutral-400 hover:bg-neutral-900/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{story.title}</span>
                  {isFinished && (
                    <span aria-label="kész" className="text-lime-400 text-xs">
                      ✓
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    {story.order}. novella • ~{story.readingTime} perc
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Fő olvasófelület */}
      <div className="flex flex-1 flex-col">
        {/* Header + mobil TOC Sheet */}
        <Sheet open={mobileTocOpen} onOpenChange={setMobileTocOpen}>
          <header
            className={`border-b border-neutral-800 bg-transparent px-4 py-3 flex items-center justify-between sticky top-0 z-20 transition-all duration-300 ease-out ${
              headerHidden
                ? "opacity-0 -translate-y-3 pointer-events-none"
                : "opacity-100 translate-y-0"
            }`}
          >
            {/* Mobil progress legfelül */}
            <div className="absolute left-0 top-0 w-full h-0.5 bg-neutral-900 md:hidden">
              <div
                className="h-full transition-[width]"
                style={{
                  width: `${bookProgress * 100}%`,
                  background: "linear-gradient(90deg,#000,#d4d4d8)",
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              {/* Mobil tartalomjegyzék gomb */}
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="md:hidden text-xs px-2 py-1 border border-neutral-700 rounded-full text-neutral-300"
                >
                  Tartalom
                </button>
              </SheetTrigger>

              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Vállalhatatlan
                </span>
                <span className="text-sm font-medium text-neutral-200">
                  {currentStory
                    ? `${currentStory.order}. novella / ${totalStories}`
                    : "Reader"}
                </span>
              </div>
            </div>

            {/* Könyv progress + Settings (desktop jobb oldal) */}
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end gap-1">
                <span className="text-[11px] text-neutral-400">
                  Könyv progress: {Math.round(bookProgress * 100)}%
                </span>
                <div className="h-0.5 w-36 rounded-full bg-neutral-900 overflow-hidden">
                  <div
                    className="h-full transition-[width]"
                    style={{
                      width: `${bookProgress * 100}%`,
                      background:
                        "linear-gradient(90deg,#000,#2e2e30 35%,#6e6e72 70%,#d4d4d8 100%)",
                    }}
                  />
                </div>
              </div>

              {/* Settings Sheet */}
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="h-9 w-9 flex items-center justify-center rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition"
                    aria-label="Beállítások"
                  >
                    ⚙️
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-72 bg-black text-neutral-100 border-l border-neutral-800"
                >
                  <SheetHeader className="px-4 pt-4">
                    <SheetTitle className="text-sm text-neutral-200">
                      Beállítások
                    </SheetTitle>
                  </SheetHeader>
                  <div className="p-4 space-y-6">
                    {/* Betűméret */}
                    <div className="space-y-2">
                      <p className="text-sm text-neutral-400">Betűméret</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => changeFontSize(-2)}
                          className="px-3 py-1 text-lg border border-neutral-600 rounded hover:bg-neutral-800"
                        >
                          –
                        </button>
                        <span className="text-base font-medium w-12 text-center">
                          {fontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => changeFontSize(2)}
                          className="px-3 py-1 text-lg border border-neutral-600 rounded hover:bg-neutral-800"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-500">
                        Kisebb kijelzőn 16–20px, desktopon 18–24px körül
                        kényelmes.
                      </p>
                    </div>
                    {/* Háttéreffektek toggle */}
                    <div className="space-y-2">
                      <p className="text-sm gradient-effekt-label">Pszichedelikus Effekt™</p>
                      <button
                        type="button"
                        onClick={toggleEffects}
                        className="px-3 py-2 text-sm border border-neutral-600 rounded-full hover:bg-neutral-800 text-neutral-300"
                        aria-pressed={effectsEnabled}
                      >
                        {effectsEnabled ? 'Bekapcsolva' : 'Kikapcsolva'}
                      </button>
                      <p className="text-[11px] text-neutral-500">
                        Kikapcsolás: eltűnnek a színes glitch / CRT rétegek.
                      </p>
                    </div>

                    {/* Theme placeholder */}
                    <div className="space-y-2 opacity-50">
                      <p className="text-sm text-neutral-500">
                        Theme váltás (hamarosan)
                      </p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Mobil TOC Sheet tartalom */}
          <SheetContent
            side="left"
            className="w-[80vw] max-w-xs bg-neutral-950 border-r border-neutral-800 p-0 flex flex-col"
          >
            <SheetHeader className="px-4 py-3 border-b border-neutral-800">
              <SheetTitle className="text-sm text-neutral-300">
                Tartalomjegyzék
              </SheetTitle>
            </SheetHeader>

            {/* MOBIL: user blokk a sheet tetején */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-200">
                  {userInitial}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-300 truncate max-w-[120px]">
                    Klubtag
                  </span>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-[0.18em]">
                    belépve
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-3">
              {stories.map((story) => {
                const isActive = story.slug === currentStory?.slug;
                const isFinished =
                  readerState.finishedStories?.includes(story.slug) ?? false;

                return (
                  <button
                    key={story.slug}
                    onClick={() => handleSelectStoryFromMobileToc(story.slug)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-neutral-900 text-neutral-200"
                        : "text-neutral-400 hover:bg-neutral-900/70"
                    }`}
                  >
                    <div className="flex items-center justify_between gap-2">
                      <span className="truncate">{story.title}</span>
                      {isFinished && (
                        <span aria-label="kész" className="text-lime-400 text-xs">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>
                        {story.order}. novella • ~{story.readingTime} perc
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        {/* Tartalom */}
        <div
          key={currentStory?.slug}
          className="flex-1 px-6 py-6 md:px-8 md:py-8 fade-in"
        >
          {currentStory ? (
            <article className="mx-auto max-w-[560px] md:max-w-[600px]">
              <header className="mb-4 md:mb-6">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-200">
                  {currentStory.title}
                </h1>
                <div className="mt-2 text-xs text-neutral-400 flex items-center gap-2 flex-wrap">
                  <span>
                    {currentStory.order}. a(z) {totalStories} novellából
                  </span>
                  <span>•</span>
                  <span>~{currentStory.readingTime} perc olvasás</span>
                </div>
              </header>

              {/* Playlist blokk a címsor alatt – AudioPlayer-rel */}
              {playlistLoading && (
                <div className="mb-4 text-xs text-neutral-500">
                  Playlist betöltése…
                </div>
              )}
              {!playlistLoading &&
                playlist &&
                playlist.tracks &&
                playlist.tracks.length > 0 && (
                  <section className="mb-6 space-y-3">
                    <AudioPlayer2
                      tracks={playlist.tracks}
                      images={playlist.visuals ?? []}
                    />
                  </section>
                )}
             {!playlistLoading && !playlist && (
               <div className="mb-6 text-[11px] text-neutral-600">
                 Nincs kapcsolódó playlist (.json nem található a /public{PLAYLIST_BASE} alatt ehhez a slughoz:
                 <code className="ml-1">{currentStory.slug}</code>)
               </div>
             )}
              <section
                className="mt-6 leading-relaxed md:leading-8 text-neutral-400 whitespace-pre-wrap"
                style={{ fontSize: `${fontSize}px` }}
              >
                {currentStory.text}
              </section>
            </article>
          ) : (
            <div className="mx-auto max-w-[720px] text-sm text-neutral-400">
              Nincs elérhető novella.
            </div>
          )}
        </div>

        {/* Alsó navigáció */}
        <footer className="border-t border-neutral-800 bg-neutral-950/80 px-4 py-3">
          <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
            <button
              onClick={goPrev}
              disabled={currentIndex <= 0}
              className="text-xs md:text-sm px-3 py-2 rounded-full border border-neutral-700 text-neutral-300 disabled:opacity-40 disabled:cursor-default hover:bg-neutral-900 transition-colors"
            >
              ← Előző
            </button>

            <div className="text-[11px] text-neutral-500">
              {currentStory
                ? `${currentStory.order}. / ${totalStories}`
                : "\u00A0"}
            </div>

            <button
              onClick={goNext}
              disabled={
                currentIndex === -1 || currentIndex >= stories.length - 1
              }
              className="text-xs md:text-sm px-3 py-2 rounded-full border border-neutral-700 text-neutral-300 disabled:opacity-40 disabled:cursor-default hover:bg-neutral-900 transition-colors"
            >
              Következő →
            </button>
          </div>
        </footer>
      </div>

      {/* Local styles */}
      <style>{`
        @keyframes fadeCrt {
          0% { opacity:0; transform:scaleY(.03) scaleX(1.25); filter:blur(40px) brightness(240%); }
          6% { opacity:1; transform:scaleY(.25) scaleX(1.08); filter:blur(24px) brightness(175%); }
          14% { opacity:.85; transform:scaleY(.92) scaleX(1.02); filter:blur(14px) brightness(145%); }
          28% { opacity:1; transform:scale(1) translate(0); filter:blur(8px) brightness(120%); }
          46% { filter:blur(5px) brightness(110%); }
          64% { filter:blur(3px); }
          78% { transform:scale(1) translateX(0); }
          84% { transform:scale(1) translateX(1px); }
          90% { transform:scale(1) translateX(-1px); }
          100% { opacity:1; filter:blur(0); transform:scale(1) translate(0); }
        }
        @keyframes jitter {
          0%,100% { transform:translate(0,0); }
          20% { transform:translate(1px,-1px); }
          40% { transform:translate(-1px,1px); }
          60% { transform:translate(1px,0); }
          80% { transform:translate(-1px,-1px); }
        }
        @keyframes rgbShift {
          0%,100% { filter:contrast(140%) saturate(140%); }
          25% { filter:hue-rotate(18deg) contrast(155%) saturate(160%); }
          50% { filter:hue-rotate(-14deg) contrast(150%) saturate(155%); }
          75% { filter:hue-rotate(26deg) contrast(160%) saturate(165%); }
        }
        @keyframes scanRoll {
          0% { background-position:0 0; }
          100% { background-position:0 4px; }
        }
        .fade-in {
          position:relative;
          animation:
            fadeCrt 3.2s cubic-bezier(.25,.01,.12,1) .2s both,
            jitter 2.8s steps(2,end) .2s 1;
        }
        .gradient-effekt-label {
          background:linear-gradient(90deg,#00ffa8,#ff2ecf 38%,#6dd3ff 65%,#b5ff5a);
          -webkit-background-clip:text;
          color:transparent;
          filter:brightness(1.15) contrast(1.1);
          letter-spacing:.5px;
        }
        /* Effects ON */
        .effects-on .fade-in::before,
        .effects-on .fade-in::after {
          content:"";
          position:absolute;
          inset:-40px;
          pointer-events:none;
        }
        .effects-on .fade-in::before {
          background:
            radial-gradient(circle at 35% 40%,rgba(0,255,170,.28),transparent 65%),
            radial-gradient(circle at 70% 65%,rgba(255,0,110,.25),transparent 72%);
          filter:blur(26px);
          mix-blend-mode:screen;
          animation: rgbShift 9s linear infinite;
          opacity:.55;
        }
        .effects-on .fade-in::after {
          background:repeating-linear-gradient(0deg,rgba(255,255,255,0.12) 0 1px,rgba(0,0,0,0) 1px 3px);
          animation: scanRoll .22s linear infinite;
          mix-blend-mode:overlay;
          opacity:.18;
        }
        .effects-on .story-loader {
          position:fixed; top:0; left:0; right:0;
          height:4px;
          background:linear-gradient(90deg,#00ff95,#ff0055,#00d0ff,#00ff95);
          background-size:300% 100%;
          animation:glitchBar 0.9s cubic-bezier(.6,.01,.4,1) infinite;
          z-index:40;
          filter:contrast(140%) brightness(1.1);
        }
        .effects-on .story-loader::after {
          content:"";
          position:absolute; inset:0;
          background:repeating-linear-gradient(90deg,rgba(255,255,255,.6) 0 4px,rgba(0,0,0,0) 4px 8px);
          mix-blend-mode:overlay;
          opacity:.35;
          animation:scan 1.2s linear infinite;
        }
        @keyframes glitchBar {
          0% { background-position:0% 50%; transform:translateY(0); }
          50% { background-position:100% 50%; transform:translateY(1px); }
          100% { background-position:0% 50%; transform:translateY(0); }
        }
        @keyframes scan {
          0% { background-position:0 0; }
          100% { background-position:160px 0; }
        }
        /* Effects OFF overrides */
        .effects-off .fade-in { animation: fadeCrt 0.8s ease-out .1s both; }
        .effects-off .fade-in::before,
        .effects-off .fade-in::after { content:none; display:none; }
        .effects-off .story-loader,
        .effects-off .story-loader::after { display:none; content:none; }
      `}</style>
    </div>
  );
}

// :contentReference[oaicite:0]{index=0}

// components/reader/ReaderApp.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";

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

type ReaderState = {
  lastStorySlug?: string;
  finishedStories?: string[];
};

export default function ReaderApp({ stories }: ReaderAppProps) {
  const firstStory = stories[0];
  const [currentSlug, setCurrentSlug] = useState<string | undefined>(
    firstStory?.slug
  );
  const [readerState, setReaderState] = useState<ReaderState>({});
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  const router = useRouter();

  const currentIndex = useMemo(
    () => stories.findIndex((s) => s.slug === currentSlug),
    [stories, currentSlug]
  );

  const currentStory = useMemo(
    () => (currentIndex >= 0 ? stories[currentIndex] : firstStory),
    [stories, currentIndex, firstStory]
  );

  const userInitial = "V"; // Vállalhatatlan Klubtag

  // Betöltés localStorage-ból
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

  // Mentés localStorage-ba
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

  const handleLogout = () => {
    try {
      document.cookie =
        "reader_session=; Max-Age=0; path=/; SameSite=Lax; Secure";
    } catch (e) {
      console.error("Logout cookie hiba:", e);
    } finally {
      router.push("/reader-access");
    }
  };

  return (
    <div className="flex min-h-screen">
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

            <button
              type="button"
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200"
            >
              kilépés
            </button>
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
                    <span className="text-[10px] text-emerald-300 uppercase tracking-[0.15em]">
                      kész
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
          <header className="border-b border-neutral-800 bg-neutral-950/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
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

          {/* Könyv progress mini-bar (desktop) */}
          <div className="hidden md:flex flex-col items-end gap-1">
            <span className="text-[11px] text-neutral-400">
              Könyv progress: {Math.round(bookProgress * 100)}%
            </span>
            <div className="h-1 w-36 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-neutral-300 transition-[width]"
                style={{ width: `${bookProgress * 100}%` }}
              />
            </div>
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

            <button
              type="button"
              onClick={handleLogout}
              className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 hover:text-neutral-200"
            >
              kilépés
            </button>
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{story.title}</span>
                    {isFinished && (
                      <span className="text-[10px] text-emerald-300 uppercase tracking-[0.15em]">
                        kész
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

      {/* Egyszerű csík a könyv progresshez mobilon is */}
      <div className="h-1 w-full bg-neutral-900 md:hidden">
        <div
          className="h-1 bg-neutral-300 transition-[width]"
          style={{ width: `${bookProgress * 100}%` }}
        />
      </div>

      {/* Tartalom */}
      <div className="flex-1 px-4 py-6 md:px-8 md:py-8">
        {currentStory ? (
          <article className="mx-auto max-w-[600px]">
            <header className="mb-6">
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

            <section className="mt-6 text-[19px] md:text-[21px] leading-relaxed md:leading-8 text-neutral-400 whitespace-pre-wrap">
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
            {currentStory ? `${currentStory.order}. / ${totalStories}` : "\u00A0"}
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
  </div>
  );
}

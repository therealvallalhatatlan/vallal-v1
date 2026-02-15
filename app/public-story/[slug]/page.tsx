"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "@/components/Container";
import CtaBuyBox from "@/components/CtaBuyBox";
import { ThemeToggle } from "@/components/ThemeToggle";

interface StoryData {
  slug: string;
  title: string;
  text: string;
  expiresAt: string;
  remainingSeconds: number;
}

const FONT_SIZE_KEY = "publicStoryFontSize";
const FONT_SIZE_MIN = 16;
const FONT_SIZE_MAX = 28;

const clampFontSize = (value: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, value));

function FontSizeControls({
  fontSize,
  onChange,
}: {
  fontSize: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(-1)}
        className="w-6 h-6 rounded-full border border-neutral-800/30 dark:border-yellow-400/30 text-neutral-800 dark:text-yellow-400 hover:bg-neutral-800/10 dark:hover:bg-yellow-400/10 transition-colors text-xs font-semibold"
        aria-label="Betűméret csökkentése"
      >
        a
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        className="w-7 h-7 rounded-full border border-neutral-800/30 dark:border-yellow-400/30 text-neutral-800 dark:text-yellow-400 hover:bg-neutral-800/10 dark:hover:bg-yellow-400/10 transition-colors text-sm font-semibold"
        aria-label="Betűméret növelése"
      >
        A
      </button>
    </div>
  );
}

export default function PublicStoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [videoFading, setVideoFading] = useState(false);
  const [story, setStory] = useState<StoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [fontSize, setFontSize] = useState<number>(20);
  const [headerImageSrc, setHeaderImageSrc] = useState<string>("/og.png");

  // Hide video after 3 seconds with fade out
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setVideoFading(true);
    }, 2500); // Start fading at 2.5s
    
    const hideTimer = setTimeout(() => {
      setShowVideo(false);
    }, 3000); // Fully hide at 3s
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(FONT_SIZE_KEY);
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        setFontSize(clampFontSize(parsed));
      }
    }
  }, []);

  useEffect(() => {
    if (slug) {
      setHeaderImageSrc(`/public-story/${encodeURIComponent(slug)}.jpg`);
    }
  }, [slug]);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = clampFontSize(prev + delta);
      if (next !== prev) {
        window.localStorage.setItem(FONT_SIZE_KEY, String(next));
      }
      return next;
    });
  };

  useEffect(() => {
    async function checkAccessAndLoad() {
      try {
        // First, check/request access
        const accessRes = await fetch("/api/public/story-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });

        const accessData = await accessRes.json();

        if (!accessData.allowed) {
          setError(accessData.expired ? "Az olvasási idő lejárt" : "Hozzáférés megtagadva");
          setExpired(true);
          setLoading(false);
          return;
        }

        // Then load the story
        const storyRes = await fetch(`/api/public/story?slug=${slug}`);

        if (!storyRes.ok) {
          const errorData = await storyRes.json();
          setError(errorData.error || "Hiba történt");
          setExpired(storyRes.status === 403);
          setLoading(false);
          return;
        }

        const storyData = await storyRes.json();
        setStory(storyData);
        setRemainingSeconds(storyData.remainingSeconds);
        setLoading(false);

        // Set up timer to update remaining seconds
        const interval = setInterval(() => {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              setExpired(true);
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 4000); // Update every second

        return () => clearInterval(interval);
      } catch (err) {
        console.error("Error loading story:", err);
        setError("Hiba történt a tartalom betöltésekor");
        setLoading(false);
      }
    }

    checkAccessAndLoad();
  }, [slug]);

  if (loading || showVideo) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3">
          <FontSizeControls fontSize={fontSize} onChange={changeFontSize} />
          <ThemeToggle />
        </div>
        <div className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
          videoFading ? 'opacity-0' : 'opacity-100'
        }`}>
          <video
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            src="/videos/video2.mp4"
          />
        </div>
      </>
    );
  }

  if (error || expired) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-3">
          <FontSizeControls fontSize={fontSize} onChange={changeFontSize} />
          <ThemeToggle />
        </div>
        <Container className="py-20">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/40 dark:bg-black/40 border border-red-500/40 rounded-lg p-8 mb-8">
              <h1 className="text-2xl font-bold text-red-500 mb-4">
                {error || "Az olvasási idő lejárt"}
              </h1>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                A történet csak 10 percig volt elérhető.
              </p>
            </div>
            <CtaBuyBox />
          </div>
        </Container>
      </>
    );
  }

  if (!story) {
    return (
      <>
        <Container className="py-20">
          <div className="flex items-center justify-end gap-3">
            <FontSizeControls fontSize={fontSize} onChange={changeFontSize} />
            <ThemeToggle />
          </div>
          <div className="text-center text-gray-600 dark:text-gray-400">Nincs tartalom</div>
        </Container>
      </>
    );
  }

  return (
    <>
      <Container className="py-20 px-12">
        
        <div className="max-w-3xl mx-auto">
          {/* Timer Header */}
          <div className="sticky top-0 z-10 bg-white/0 dark:bg-black/0 backdrop-blur-sm border-b border-neutral-500/20 mb-8 py-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                A sztori megsemmisül: ⏱  {remainingSeconds} sec múlva <br/>
              </div>
              <div className="dark:text-lime-700 light:text-lime-100 font-mono">
               
              </div>
              <div className="flex items-center gap-3">
                <FontSizeControls fontSize={fontSize} onChange={changeFontSize} />
                <ThemeToggle />
              </div>
            </div>
            {remainingSeconds <= 30 && (
              <div className="mt-2 text-xs text-yellow-500 animate-pulse">
                Figyelem: hamarosan lejár a hozzáférés!
              </div>
            )}
          </div>

          {/* Story Header */}
          <header className="mb-8">
            <div className="mb-6 overflow-hidden rounded-xl border border-neutral-300/40 dark:border-neutral-700/60">
              <img
                src={headerImageSrc}
                alt="Public story cover"
                className="w-full max-h-[420px] object-cover"
                loading="eager"
                onError={() => setHeaderImageSrc("/og.png")}
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-neutral-800 dark:text-neutral-300 mb-4">
              {story.title}
            </h1>
          </header>

          {/* Story Content */}
          <article className="prose prose-invert prose-lime max-w-none">
            <div
              className="text-gray-800 dark:text-gray-400 leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: `${fontSize}px` }}
            >
              {story.text}
            </div>
          </article>

          {/* CTA Section */}
          <div className="mt-16 pt-8 border-t border-lime-500/20">
            <h2 className="text-2xl font-bold text-lime-500 mb-6 text-center">
              Tetszett a történet?
            </h2>
            <CtaBuyBox />
          </div>
        </div>
      </Container>
    </>
  );
}

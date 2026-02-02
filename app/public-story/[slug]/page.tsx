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
        }, 1000); // Update every second

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
        <ThemeToggle />
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
        <ThemeToggle />
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
          <ThemeToggle />
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
          <div className="sticky top-0 z-10 bg-white/0 dark:bg-black/0 backdrop-blur-sm border-b border-lime-500/20 mb-8 py-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Az oldal megsemmisül: ⏱  {remainingSeconds} sec múlva <br/>
              </div>
              <div className="dark:text-lime-700 light:text-lime-100 font-mono">
               
              </div>
              <ThemeToggle />
            </div>
            {remainingSeconds <= 30 && (
              <div className="mt-2 text-xs text-yellow-500 animate-pulse">
                Figyelem: hamarosan lejár a hozzáférés!
              </div>
            )}
          </div>

          {/* Story Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-neutral-800 dark:text-neutral-300 mb-4">
              {story.title}
            </h1>
            <div className="h-px bg-gradient-to-r from-lime-500/0 via-lime-500/50 to-lime-500/0 mb-8" />
          </header>

          {/* Story Content */}
          <article className="prose prose-invert prose-lime max-w-none">
            <div className="text-gray-800 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-xl">
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

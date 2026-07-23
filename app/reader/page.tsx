"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ReaderApp, { Story } from "@/components/ReaderApp";
import { createClient } from "@/lib/browser";
import { useSessionGuard } from "@/hooks/useSessionGuard";
import Navigation from "@/components/Navigation";

const READER_NAV_OFFSET_PX = 84;

export default function ReaderPage() {
  const router = useRouter();
  const { session, loading } = useSessionGuard();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mainNavHidden, setMainNavHidden] = useState(false);
  const supabaseRef = useRef(createClient());
  const fetchedRef = useRef(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastYRef.current = window.scrollY || 0;
    const HIDE_DELTA = 10;
    const SHOW_DELTA = 6;

    const onScroll = () => {
      const y = window.scrollY || 0;
      const last = lastYRef.current;

      if (y < 16) {
        setMainNavHidden(false);
      } else if (y > last && y - last > HIDE_DELTA && y > 56) {
        setMainNavHidden(true);
      } else if (last - y > SHOW_DELTA) {
        setMainNavHidden(false);
      }

      lastYRef.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (fetchedRef.current) return; // Csak egyszer futtatjuk

    if (!session) {
      router.replace("/auth?from=/reader");
      return;
    }

    const fetchStories = async () => {
      setError(null);

      const { data } = await supabaseRef.current.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        setError("Nincs aktív bejelentkezés.");
        return;
      }

      const res = await fetch("/api/reader-stories", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);

        if (res.status === 403 && body?.error === "no_access") {
          router.replace("/reader/no-access?from=/reader");
          return;
        }

        if (res.status === 401) {
          router.replace("/auth?from=/reader");
          return;
        }

        setError(body?.error || "Hiba a történetek betöltésekor.");
        return;
      }

      const body = (await res.json()) as { stories?: Story[] };
      setStories(body.stories || null);
      fetchedRef.current = true; // Jelöljük, hogy betöltöttük
    };

    fetchStories();
  }, [loading, router]); // session NINCS benne!

  if (loading) {
    return <PremiumReaderLoader />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="rounded-xl border border-neutral-800 bg-black/70 px-6 py-4 text-sm text-neutral-200">
          <p className="text-red-300 mb-2 font-semibold">Hiba</p>
          <p>{error}</p>
          <button
            onClick={() => router.replace("/auth?from=/reader")}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-lime-500 bg-lime-500 px-3 py-2 text-xs font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
          >
            Újra belépek
          </button>
        </div>
      </div>
    );
  }

  if (!stories) {
    return <PremiumReaderLoader />;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 3100,
          transform: mainNavHidden ? "translateY(-115%)" : "translateY(0)",
          transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <Navigation />
      </div>

      <div
        className="min-h-screen"
        style={{
          ["--reader-nav-offset" as any]: `${READER_NAV_OFFSET_PX}px`,
        }}
      >
        <ReaderApp
          stories={stories}
          userEmail={(session as any)?.user?.email ?? null}
          avatarUrl={(session as any)?.user?.user_metadata?.avatar_url ?? null}
          onSignOut={async () => {
            setLoggingOut(true);
            await supabaseRef.current.auth.signOut();
            router.replace("/auth?from=/reader");
            setLoggingOut(false);
          }}
        />
      </div>
    </>
  );
}

function PremiumReaderLoader() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06080b] text-neutral-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(163,230,53,0.12),transparent_42%),radial-gradient(circle_at_80%_78%,rgba(200,169,126,0.10),transparent_40%)]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(to_right,rgba(39,39,42,.45)_1px,transparent_1px),linear-gradient(to_bottom,rgba(39,39,42,.45)_1px,transparent_1px)] bg-[size:34px_34px]" />

      <section className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#c8a97e55] bg-black/55 p-8 shadow-[0_0_55px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <span className="reader-loader-ring reader-loader-ring--outer" />
            <span className="reader-loader-ring reader-loader-ring--mid" />
            <span className="reader-loader-core" />
          </div>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#c8a97e]">Reader inicializálás</p>
            <p className="mt-3 text-base font-medium text-neutral-200">Keresem bazdmeg...</p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .reader-loader-ring {
          position: absolute;
          border-radius: 999px;
          border: 2px solid rgba(200, 169, 126, 0.45);
        }

        .reader-loader-ring--outer {
          width: 80px;
          height: 80px;
          animation: readerPulseOuter 1.9s ease-out infinite;
        }

        .reader-loader-ring--mid {
          width: 56px;
          height: 56px;
          border-color: rgba(163, 230, 53, 0.55);
          animation: readerPulseMid 1.35s ease-out infinite;
        }

        .reader-loader-core {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: rgba(163, 230, 53, 0.95);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.35), 0 0 18px rgba(163,230,53,0.68);
          animation: readerCoreBlink 1.2s ease-in-out infinite;
        }

        @keyframes readerPulseOuter {
          0% { transform: scale(0.8); opacity: 0.85; }
          80% { transform: scale(1.08); opacity: 0.2; }
          100% { transform: scale(1.1); opacity: 0; }
        }

        @keyframes readerPulseMid {
          0% { transform: scale(0.85); opacity: 0.9; }
          75% { transform: scale(1.16); opacity: 0.24; }
          100% { transform: scale(1.22); opacity: 0; }
        }

        @keyframes readerCoreBlink {
          0%, 100% { opacity: 0.95; transform: scale(1); }
          50% { opacity: 0.62; transform: scale(0.88); }
        }
      `}</style>
    </main>
  );
}
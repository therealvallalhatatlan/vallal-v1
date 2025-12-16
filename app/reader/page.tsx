"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReaderApp, { Story } from "@/components/ReaderApp";
import { createClient } from "@/lib/browser";
import { useSessionGuard } from "@/hooks/useSessionGuard";

const supabase = createClient();

export default function ReaderPage() {
  const router = useRouter();
  const { session, loading } = useSessionGuard();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace("/auth?from=/reader");
      return;
    }

    const fetchStories = async () => {
      setFetching(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        setError("Nincs aktív bejelentkezés.");
        setFetching(false);
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
        setFetching(false);
        return;
      }

      const body = (await res.json()) as { stories?: Story[] };
      setStories(body.stories || null);
      setFetching(false);
    };

    fetchStories();
  }, [loading, session, router]);

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <img
          src="/cover.png"
          alt="Vállalhatatlan borító"
          className="w-48 md:w-64 h-auto rounded-xl shadow-[0_10px_50px_rgba(0,0,0,0.35)]"
        />
      </div>
    );
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
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-neutral-400">
        Nem találtam történeteket.
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ReaderApp
        stories={stories}
        userEmail={(session as any)?.user?.email ?? null}
        avatarUrl={(session as any)?.user?.user_metadata?.avatar_url ?? null}
        onSignOut={async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          router.replace("/auth?from=/reader");
          setLoggingOut(false);
        }}
      />
    </div>
  );
}

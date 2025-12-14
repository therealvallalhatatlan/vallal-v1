"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/browser";
import { useSessionGuard } from "@/hooks/useSessionGuard";

const supabase = createClient();

type ProfileRow = Record<string, any> | null;

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSessionGuard() as {
    session: { user?: { id?: string; email?: string } } | null;
    loading: boolean;
  };
  const [profile, setProfile] = useState<ProfileRow>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!userId) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setProfile(null);
      } else {
        setProfile(data);
        setDisplayName((data as any)?.nickname ?? "");
        if (!data) {
          setError("Nem található sor ebben a táblában ehhez a felhasználóhoz.");
        }
      }

      setProfileLoading(false);
    };

    loadProfile();
  }, [session]);

  if (loading || (!session && !loading)) {
    return (
      <main className="min-h-screen bg-black text-neutral-100 flex items-center justify-center">
        <p className="text-sm text-neutral-300">Betöltés...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-neutral-100 px-6 py-10">
      <section className="mx-auto w-full max-w-4xl">
        <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">dashboard</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold text-lime-400">Üdv, {displayName || session?.user?.email}</h1>
            <button
              type="button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await supabase.auth.signOut();
                router.replace("/auth");
                setLoggingOut(false);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-100 transition hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-60"
            >
              {loggingOut ? "Kilépés..." : "Kijelentkezés"}
            </button>
          </div>
          <p className="mt-2 text-sm text-neutral-300">
            Itt látod a felhasználói rekordod a Supabase adatbázisban.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span>Megjelenített név</span>
              {saving && <span className="text-xs text-neutral-500">Mentés...</span>}
            </div>

            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Add meg a megjelenített nevet"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-lime-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={saving || !userId}
                onClick={async () => {
                  if (!userId) return;
                  setSaving(true);
                  setError(null);
                  const email = session?.user?.email ?? null;
                  const { data, error } = await supabase
                    .from("users")
                    .update({ nickname: displayName })
                    .eq("id", userId)
                    .select("*")
                    .single();

                  if (error) {
                    setError(error.message);
                  } else {
                    setProfile(data as ProfileRow);
                  }

                  setSaving(false);
                }}
                className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
              >
                Mentés
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <span>Profil adatok</span>
              {profileLoading && <span className="text-xs text-neutral-500">Frissítés...</span>}
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            {profile && !error && (
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-neutral-200">
                {JSON.stringify(profile, null, 2)}
              </pre>
            )}

            {!profile && !profileLoading && !error && (
              <p className="mt-3 text-sm text-neutral-400">
                Nem találtunk rekordot a felhasználóhoz.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

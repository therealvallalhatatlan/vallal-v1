// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/browser";

type LoginPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createClient();
  const router = useRouter();

  // redirect=/valami param kezelése (alap: /reader)
  const redirectParam = searchParams?.redirect;
  const redirectTo =
    (Array.isArray(redirectParam) ? redirectParam[0] : redirectParam) ||
    "/reader";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      // honnan menjen vissza a Supabase a userrel?
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_SITE_URL!;

      const emailRedirectTo = `${origin}/auth/callback?redirect=${encodeURIComponent(
        redirectTo
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
        },
      });

      if (error) throw error;

      setInfo(
        "Ha létezik ez az email cím, küldtünk rá egy belépő linket. Nézd meg a postaládád (és a spamet is)."
      );
      setEmail("");
    } catch (err: any) {
      setError(err.message ?? "Ismeretlen hiba történt.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm border border-neutral-800 rounded-2xl bg-neutral-950/80 p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">
            Vállalhatatlan – belépés
          </h1>
          <p className="text-xs text-neutral-400">
            Írd be az email címed, küldök egy egyszer használható Magic Linket.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Email cím</label>
            <input
              type="email"
              required
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="te@valami.hu"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
          )}

          {info && (
            <p className="text-xs text-emerald-400 whitespace-pre-line">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm px-4 py-2 rounded-full bg-neutral-50 text-black font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-default"
          >
            {loading ? "Küldöm a linket..." : "Magic Link küldése"}
          </button>
        </form>

        <p className="text-[10px] text-neutral-500">
          Belépés után ide irányítalak:{" "}
          <span className="text-neutral-300">{redirectTo}</span>
        </p>
      </div>
    </div>
  );
}

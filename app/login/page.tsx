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

  // redirect param SSR-biztosan
  const redirectParam = searchParams?.redirect;
  const redirectTo =
    (Array.isArray(redirectParam) ? redirectParam[0] : redirectParam) ||
    "/reader";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth: any = supabase.auth;

      if (mode === "login") {
        let err: any | null = null;

        if (typeof auth.signInWithPassword === "function") {
          // Supabase JS v2
          const { error } = await auth.signInWithPassword({
            email,
            password,
          });
          err = error;
        } else if (typeof auth.signIn === "function") {
          // Supabase JS v1
          const { error } = await auth.signIn({
            email,
            password,
          });
          err = error;
        } else {
          throw new Error(
            "Supabase auth kliens rosszul van beállítva (nincs signIn / signInWithPassword)."
          );
        }

        if (err) throw err;
      } else {
        // Regisztráció – signUp mindkét verzióban létezik
        const { error } = await auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }

      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message ?? "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-neutral-800 rounded-2xl bg-neutral-950/80 p-6 space-y-6">
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Belépés" : "Regisztráció"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Jelszó</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm px-4 py-2 rounded-full bg-neutral-50 text-black font-medium hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading
              ? "Tölt..."
              : mode === "login"
              ? "Belépés"
              : "Regisztráció"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
          className="w-full text-xs text-neutral-400 hover:text-neutral-200"
        >
          {mode === "login"
            ? "Még nincs fiókod? Regisztrálj."
            : "Már van fiókod? Lépj be."}
        </button>
      </div>
    </div>
  );
}

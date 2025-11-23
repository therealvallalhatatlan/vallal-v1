// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/reader";

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
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
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
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center px-4">
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
          onClick={() =>
            setMode((m) => (m === "login" ? "register" : "login"))
          }
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

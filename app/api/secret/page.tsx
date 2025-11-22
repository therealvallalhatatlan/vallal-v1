"use client";

import { useState } from "react";

export default function SecretGatePage() {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const searchParams = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search);

  const redirectTo = searchParams?.get("from") || "/secret-area";

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/secret/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError("Ez az email nincs a listán.");
        return;
      }

      setStep("password");
    } catch (err) {
      setError("Valami elszállt, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/secret/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Hibás jelszó.");
        return;
      }

      // siker: cookie beállítva, mehetünk a titkos oldalra
      window.location.href = redirectTo;
    } catch (err) {
      setError("Valami elszállt, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-green-200">
      <div className="w-full max-w-md border border-green-500/40 rounded-xl p-6 space-y-4 bg-black/60 backdrop-blur">
        <h1 className="text-xl font-mono text-green-300">
          /access restricted
        </h1>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email címed</label>
              <input
                type="email"
                className="w-full px-3 py-2 rounded-md bg-black border border-green-500/40 text-sm outline-none focus:border-green-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-green-500/70">
                Csak akkor engedünk tovább, ha az email rajta van a listán.
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md border border-green-500/60 text-sm font-mono hover:bg-green-500/10 disabled:opacity-50"
            >
              {loading ? "Ellenőrzés..." : "Tovább"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <p className="text-xs mb-2 text-green-400">
                Email oké. Add meg a jelszót.
              </p>
              <label className="block text-sm mb-1">Jelszó</label>
              <input
                type="password"
                className="w-full px-3 py-2 rounded-md bg-black border border-green-500/40 text-sm outline-none focus:border-green-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-md border border-green-500/60 text-sm font-mono hover:bg-green-500/10 disabled:opacity-50"
            >
              {loading ? "Beléptetés..." : "Belépés"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

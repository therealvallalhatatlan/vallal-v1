// app/reader-access/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ReaderAccessPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/reader";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reader-login", {
        method: "POST",
        body: new URLSearchParams({
          password,
          redirectTo,
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data?.error ||
            "Nem sikerült a belépés. Ellenőrizd a jelszót (vagy írj rám)."
        );
      }
    } catch (err) {
      setError("Valami elszállt a háttérben. Próbáld meg újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm border border-neutral-800 rounded-2xl bg-neutral-950/80 p-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-neutral-50">
            Vállalhatatlan Reader – belépés
          </h1>
          <p className="text-xs text-neutral-400">
            Zárt klub. Ha megvan a jelszó, itt tudsz belépni az online
            kiadásba.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-neutral-400">Jelszó</label>
            <input
              type="password"
              required
              className="w-full rounded-md bg-black border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm px-4 py-2 rounded-full bg-neutral-50 text-black font-medium hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-default"
          >
            {loading ? "Ellenőrzés..." : "Belépés"}
          </button>
        </form>

        <p className="text-[10px] text-neutral-500">
          Ha megvetted a hozzáférést, de nincs jelszavad, írj:{" "}
          <span className="text-neutral-300">info@valami.hu</span>
        </p>
      </div>
    </div>
  );
}

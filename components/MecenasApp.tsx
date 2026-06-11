"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MIN = 1000;

export default function MecenasApp() {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const parsedAmount = parseInt(amount, 10);
  const isValid = Number.isFinite(parsedAmount) && parsedAmount >= MIN;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValid) {
      setError(`A minimális összeg ${MIN.toLocaleString("hu-HU")} Ft.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mecenas/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error || "Valami hiba történt. Próbáld újra.");
        return;
      }

      router.push(data.url);
    } catch {
      setError("Hálózati hiba. Próbáld újra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 pt-12 pb-24">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-md shadow-xl px-8 py-10">
        {/* Headline */}
        <h1 className="text-3xl md:text-4xl font-black text-zinc-900 leading-tight mb-2">
          Támogatom ezt a faszt!
        </h1>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          Add meg a támogatási összeget forintban. Minimum{" "}
          <span className="font-semibold text-zinc-700">1 000 Ft</span>.
          A fizetés biztonságosan, Stripe-on keresztül történik.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {/* Amount field */}
          <div className="mb-6">
            <label
              htmlFor="amount"
              className="block text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-2"
            >
              Összeg (Ft)
            </label>
            <div className="relative">
              <input
                id="amount"
                type="number"
                inputMode="numeric"
                min={MIN}
                step={1}
                value={amount}
                onChange={(e) => {
                  setError(null);
                  setAmount(e.target.value);
                }}
                placeholder="pl. 3000"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-xl font-bold text-zinc-900 placeholder-zinc-300 outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-400/30 transition-all"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">
                Ft
              </span>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full rounded-xl bg-lime-400 px-6 py-4 text-base font-bold text-black tracking-wide transition-colors hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Átirányítás…" : "Támogatom →"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          A fizetést a{" "}
          <span className="font-semibold">Stripe</span> kezeli.
          Kártyaadatodat mi nem tároljuk.
        </p>
      </div>
    </div>
  );
}

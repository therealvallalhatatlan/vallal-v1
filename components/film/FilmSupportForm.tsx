"use client";

import { useMemo, useState } from "react";
import { storiesMeta } from "@/app/reader/storiesMeta";

const presetAmounts = [0, 5000, 15000, 30000, 50000, 75000, 100000];

export default function FilmSupportForm() {
  const readableStories = storiesMeta.filter((story) => story.type !== "cover");
  const [selectedSlug, setSelectedSlug] = useState(readableStories[0]?.slug || "");
  const [amount, setAmount] = useState(15000);
  const [supporterName, setSupporterName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isZeroSupport = amount === 0;

  const selectedNovella = useMemo(
    () => readableStories.find((novella) => novella.slug === selectedSlug),
    [selectedSlug, readableStories]
  );

  const humanAmount = useMemo(() => {
    return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF" }).format(
      amount
    );
  }, [amount]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(Number(event.target.value));
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value || 0);
    if (Number.isNaN(value)) return;
    setAmount(Math.max(0, Math.min(500000, value)));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedNovella) {
      setMessage("Kérlek válassz ki egy novellát!");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    if (amount === 0) {
      setIsSubmitting(false);
      setMessage("Köszönjük a szavazatodat — a pilot csapatát értesítjük!");
      return;
    }

    try {
      const response = await fetch("/api/film-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          novellaSlug: selectedNovella.slug,
          novellaTitle: selectedNovella.title,
          amount,
          supporterName: supporterName.trim() || null,
        }),
      });

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || "Hiba történt a fizetés indításakor.");
      }

      window.location.href = payload.url;
    } catch (err) {
      console.error(err);
      setMessage("Nem sikerült létrehozni a fizetést. Próbáld újra később.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-16 border-white/0 bg-white/0 p-8"
    >
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-lime-400/80">1. Novella kiválasztása</p>
        <label className="relative block">
          <span className="mb-2 text-lg font-semibold text-white">Melyik legyen a pilot epizód?</span>
          <select
            className="w-full rounded-2xl border border-lime-400/50 bg-black/40 px-4 py-3 text-white focus:border-lime-300 focus:outline-none"
            value={selectedSlug}
            onChange={(event) => setSelectedSlug(event.target.value)}
          >
            {readableStories.map((novella) => (
              <option key={novella.slug} value={novella.slug}>
                {novella.title}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/60">▼</span>
        </label>
      </div>

      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.4em] text-lime-400/80">2. Támogatás megadása</p>
        <div className="flex flex-wrap items-center gap-4">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                amount === preset ? "border border-lime-400 bg-lime-500 text-black" : "border border-white/10 text-white"
              }`}
            >
              {preset === 0
                ? "0 Ft – csak köszönjük"
                : new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF" }).format(preset)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">Összeg: {humanAmount}</p>
          <input
            type="range"
            min={0}
            max={500000}
            step={1000}
            value={amount}
            onChange={handleSliderChange}
            className="w-full accent-lime-400"
          />
          <input
            type="number"
            min={0}
            max={500000}
            value={amount}
            onChange={handleAmountChange}
            className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3 text-white focus:border-lime-300 focus:outline-none"
          />
          <p className="text-sm text-white/70">
            Minimum 0 Ft, maximum ~ Ft. A támogatásod a pilot megvalósítását segíti.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.4em] text-lime-400/80">3. Stáblista név (opcionális)</p>
        <input
          type="text"
          placeholder="Neved, beceneved vagy céged neve neadjisten"
          maxLength={42}
          value={supporterName}
          onChange={(event) => setSupporterName(event.target.value)}
          disabled={isZeroSupport}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-lime-300 focus:outline-none"
        />
        <p className="text-sm text-white/60">
          Ha megadod, felkerülsz a pilot stáblistájára és a köszönőoldalra.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-3xl bg-gradient-to-r from-lime-400 to-emerald-400 px-6 py-4 text-lg font-semibold text-black shadow-[0_10px_40px_rgba(0,0,0,0.45)] transition hover:shadow-[0_15px_60px_rgba(0,0,0,0.55)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Fizetés előkészítése…" : "Támogatom a pilotot"}
        </button>
        {message && <p className="text-sm text-red-400">{message}</p>}
      </div>

      {selectedNovella && (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.4em] text-lime-400/70">Jelenlegi választás</p>
          <p className="text-lg font-semibold text-white">{selectedNovella.title}</p>
          <p className="leading-relaxed text-white/60">
            {`Ezt a novellát olvashatod a Reader /reader/${selectedNovella.slug} oldalon.`}
          </p>
        </div>
      )}
    </form>
  );
}
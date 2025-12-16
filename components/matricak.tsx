"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

export default function Matricak() {
  const stickerImages = useMemo(
    () => [
      "/img/stickers/1.png",
      "/img/stickers/2.png",
      "/img/stickers/3.png",
      "/img/stickers/4.png",
      "/img/stickers/5.png",
      "/img/stickers/6.png",
    ],
    []
  );

  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % stickerImages.length);
    }, 2800);

    return () => clearInterval(id);
  }, [stickerImages.length]);

  return (
    <div className="px-6 py-10 w-full max-w-3xl mx-auto relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="grid gap-8 items-center md:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-3">
            Találkozz a Nyuszival
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            Matricák bazdmeg!
          </h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
            Ragasztható kis provokációk laptopra, bringára vagy villanyoszlopra.
            <span className="line-through"> Tartós, UV-álló matricaív</span> vállalhatatlan minőségű 6x3db kis matrica egy A4-es lapon.
          </p>

          <p className="mt-3 text-lg text-lime-400 leading-relaxed">
            Találkozz a szőke hajú nyuszival, aki átadja neked személyesen.*
          </p>
          <p className="text-xs opacity-60">*Írj és küldöm postán is akár</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-neutral-100 text-xl md:text-2xl">
              18db/A4 - <span className="glitch-text">FREE</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setStatus("idle");
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
              aria-label="Matricák megrendelése"
            >
              Kérem a matricákat
            </button>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800/70 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
            <img
              src={stickerImages[index]}
              alt="Vállalhatatlan matrica"
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-lime-200">
              {stickerImages.map((_, i) => (
                <button
                  key={stickerImages[i]}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition ${i === index ? "bg-lime-400" : "bg-neutral-600"}`}
                  aria-label={`Matricakép ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .glitch-text {
          position: relative;
          color: #fff;
          text-shadow:
            1px 0 #00e5ff,
            -1px 0 #ff2d55,
            0 0 12px rgba(163, 230, 53, 0.6);
          animation:
            glitch-shift 1.6s infinite ease-in-out,
            vhs-flicker 220ms infinite steps(2, end);
        }
        .glitch-text::before,
        .glitch-text::after {
          content: 'FREE';
          position: absolute;
          inset: 0;
          mix-blend-mode: screen;
          opacity: 0.65;
          filter: blur(0.3px);
        }
        .glitch-text::before {
          color: #00e5ff;
          transform: translate(1px, -1px);
        }
        .glitch-text::after {
          color: #ff2d55;
          transform: translate(-1px, 1px);
        }
        @keyframes glitch-shift {
          0% { transform: translate(0, 0); }
          20% { transform: translate(1px, -0.5px); }
          40% { transform: translate(-1px, 0.5px); }
          60% { transform: translate(1.5px, 0); }
          80% { transform: translate(-1px, -1px); }
          100% { transform: translate(0, 0); }
        }
        @keyframes vhs-flicker {
          0%, 100% { opacity: 1; filter: contrast(1.05) saturate(1.05); }
          40% { opacity: 0.88; filter: contrast(1.12) saturate(1.2) blur(0.1px); }
          70% { opacity: 0.94; transform: skewX(-0.4deg); }
        }
        `
      }} />

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-[0_0_40px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-100"
              onClick={() => setIsOpen(false)}
              aria-label="Bezárás"
            >
              ✕
            </button>

            <h4 className="text-2xl font-semibold text-lime-400">Kérem a matricákat</h4>
            <p className="mt-1 text-sm text-neutral-300">Add meg az elérhetőséged, és felvesszük veled a kapcsolatot.</p>

            <form
              className="mt-5 space-y-4"
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
                  setError("Minden mező kötelező.");
                  return;
                }
                setStatus("loading");
                setError(null);

                try {
                  const res = await fetch("/api/matricak", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });

                  if (!res.ok) {
                    const data = await res.json().catch(() => null);
                    setError(data?.error || "Hiba történt a küldés során.");
                    setStatus("error");
                    return;
                  }

                  setStatus("sent");
                  setForm({ name: "", email: "", message: "" });
                } catch (err) {
                  console.error(err);
                  setError("Váratlan hiba történt.");
                  setStatus("error");
                }
              }}
            >
              <label className="block">
                <span className="text-sm text-neutral-200">Név</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-lime-400"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-neutral-200">Email-cím</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-lime-400"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm text-neutral-200">Üzenet</span>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-lime-400"
                  required
                />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {status === "sent" && <p className="text-sm text-lime-400">Üzenet elküldve, hamarosan jelentkezünk!</p>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "loading" ? "Küldés..." : "Küldés"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-neutral-300 hover:text-neutral-100"
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
});

export default function KapcsolatPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/kapcsolat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          message: formData.get("message"),
        }),
      });

      if (!response.ok) throw new Error("Request failed");

      form.reset();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-8">
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <span
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-500"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ KAPCSOLAT ]
            </span>
            <span
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-lime-300/40"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />
              ONLINE
            </span>
          </div>

          <div className="max-w-3xl">
            <h1
              className={`${montserrat.className} pt-6 text-4xl uppercase leading-[0.9] tracking-[-0.03em] text-zinc-100 md:text-6xl`}
            >
              BESZÉLJÜNK.
            </h1>
            <p
              className="mt-6 text-sm leading-relaxed text-zinc-400 md:text-base"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              Ötleted van, kérdésed van, együtt akarsz dolgozni, vagy csak
              mondanál valamit? Írj. Minden üzenet ide fut be.
            </p>
          </div>
        </section>

        <section className="max-w-3xl overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/70">
          <div className="border-b border-zinc-800 px-5 py-4 md:px-7">
            <span
              className="text-[10px] uppercase tracking-[0.18em] text-lime-400/70"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              [ ÚJ ÜZENET ]
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 md:p-7">
            <div>
              <label htmlFor="name" className="mb-2 block text-[9px] uppercase tracking-[0.18em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
                NÉV
              </label>
              <input id="name" name="name" type="text" required maxLength={120} className="w-full rounded-sm border border-zinc-800 bg-black/20 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-lime-400/50" placeholder="Hogy hívnak?" />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-[9px] uppercase tracking-[0.18em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
                EMAIL
              </label>
              <input id="email" name="email" type="email" required maxLength={160} className="w-full rounded-sm border border-zinc-800 bg-black/20 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-lime-400/50" placeholder="te@email.com" />
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-[9px] uppercase tracking-[0.18em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>
                ÜZENET
              </label>
              <textarea id="message" name="message" required maxLength={2000} rows={8} className="w-full resize-y rounded-sm border border-zinc-800 bg-black/20 px-4 py-3 text-sm leading-relaxed text-zinc-100 outline-none transition-colors placeholder:text-zinc-700 focus:border-lime-400/50" placeholder="Mi jár a fejedben?" />
            </div>

            <div className="flex flex-col gap-4 border-t border-zinc-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600" style={{ fontFamily: "var(--font-mono-tech)" }}>
                Címzett: therealvallalhatatlan@gmail.com
              </p>
              <button type="submit" disabled={status === "sending"} className="flex items-center justify-between gap-8 border border-lime-400/40 bg-lime-400/[0.025] px-5 py-3 text-lime-200 transition-all hover:border-lime-300/70 hover:bg-lime-400/[0.07] disabled:cursor-not-allowed disabled:opacity-50" style={{ fontFamily: "var(--font-mono-tech)" }}>
                <span className="text-xs font-bold uppercase tracking-[0.16em]">{status === "sending" ? "KÜLDÉS..." : "ÜZENET KÜLDÉSE"}</span>
                <span>↗</span>
              </button>
            </div>

            <div aria-live="polite">
              {status === "sent" && <p className="text-[11px] uppercase tracking-[0.12em] text-lime-300" style={{ fontFamily: "var(--font-mono-tech)" }}>Üzenet elküldve. Hamarosan jelentkezem.</p>}
              {status === "error" && <p className="text-[11px] uppercase tracking-[0.12em] text-red-300" style={{ fontFamily: "var(--font-mono-tech)" }}>Valami félrement. Próbáld újra.</p>}
            </div>
          </form>
        </section>
      </div>
      <Footer />
    </MainContent>
  );
}

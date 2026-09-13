"use client";

import { FormEvent, useState } from "react";
import MainContent from "@/components/MainContent";
import Footer from "@/components/Footer";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin-ext"], weight: "800" });

type Step = 1 | 2 | 3;

export default function KapcsolatPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [step, setStep] = useState<Step>(1);
  const [userName, setUserName] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/kapcsolat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName, email: userEmail, message: userMessage }),
      });
      if (!response.ok) throw new Error("Request failed");
      setStatus("sent");
    } catch { setStatus("error"); }
  }

  const inputClass = "w-full border-0 border-b border-zinc-800/80 bg-transparent px-0 py-1 text-inherit outline-none transition-all duration-300 placeholder:text-zinc-700 focus:border-lime-400/70 focus:shadow-[0_1px_0_rgba(163,230,53,0.18)]";
  const nextClass = "ml-2 inline-flex border-b border-lime-400/40 pb-0.5 text-lime-200/90 transition-colors hover:border-lime-300 hover:text-lime-100 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <MainContent>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-8">
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500" style={{ fontFamily: "var(--font-mono-tech)" }}>[ KAPCSOLAT ]</span>
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-lime-300/40" style={{ fontFamily: "var(--font-mono-tech)" }}><span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.7)]" />ONLINE</span>
          </div>
          <div className="max-w-3xl">
            <h1 className={`${montserrat.className} pt-6 text-4xl uppercase leading-[0.9] tracking-[-0.03em] text-zinc-100 md:text-6xl`}>BESZÉLJÜNK.</h1>
            <p className="mt-6 text-sm leading-relaxed text-zinc-400 md:text-base" style={{ fontFamily: "var(--font-mono-tech)" }}>Ötleted, kérdésed van, együtt akarsz dolgozni, vagy csak mondanál valamit? Írj.</p>
          </div>
        </section>

        <section className="max-w-4xl">
          <form onSubmit={handleSubmit} className="relative" style={{ fontFamily: "var(--font-mono-tech)" }}>
            <div className="relative min-h-[270px] text-sm leading-[1.9] text-zinc-300 md:text-base">
              <div className={`absolute inset-0 transition-all duration-500 ${step === 1 ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}>
                <label htmlFor="name">Megkérdezhetem hogy hívnak?<span className="ml-2 text-zinc-600">[01]</span></label>
                <div className="mt-3 flex max-w-2xl items-center"><span className="mr-2 text-lime-400/60">&gt;</span><input id="name" name="name" type="text" required autoFocus maxLength={120} value={userName} onChange={e => setUserName(e.target.value)} className={inputClass} placeholder="írd be a neved" onKeyDown={e => { if (e.key === "Enter" && userName.trim()) { e.preventDefault(); setStep(2); } }} /><button type="button" onClick={() => setStep(2)} disabled={!userName.trim()} className={nextClass} aria-label="Tovább">↵</button></div>
                <p className="mt-4 text-[11px] text-zinc-700">ENTER a folytatáshoz</p>
              </div>

              <div className={`absolute inset-0 transition-all duration-500 ${step === 2 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
                <label htmlFor="message">Szevassz <span className="text-zinc-100">{userName || "[user_name]"}</span>!<br />Ide leírhatod mi jár a fejedben.<span className="ml-2 text-zinc-600">[02]</span></label>
                <div className="mt-3 flex max-w-3xl items-start"><span className="mr-2 pt-1 text-lime-400/60">&gt;</span><textarea id="message" name="message" required maxLength={2000} rows={4} value={userMessage} onChange={e => setUserMessage(e.target.value)} className={`${inputClass} resize-none`} placeholder="mondd el..." /></div>
                <div className="mt-4 flex items-center gap-4 text-[11px]"><button type="button" onClick={() => setStep(1)} className="text-zinc-600 transition-colors hover:text-zinc-400">← vissza</button><button type="button" onClick={() => setStep(3)} disabled={!userMessage.trim()} className={nextClass}>tovább ↵</button></div>
              </div>

              <div className={`absolute inset-0 transition-all duration-500 ${step === 3 ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
                <label htmlFor="email">Ez kurvajó! Azonnal továbbítom V.-nek.<br />Az emailcímedet megadnád még?<span className="ml-2 text-zinc-600">[03]</span></label>
                <div className="mt-3 flex max-w-2xl items-center"><span className="mr-2 text-lime-400/60">&gt;</span><input id="email" name="email" type="email" required maxLength={160} value={userEmail} onChange={e => setUserEmail(e.target.value)} className={inputClass} placeholder="te@email.com" autoFocus={step === 3} onKeyDown={e => { if (e.key === "Enter" && userEmail.trim()) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /></div>
                <div className="mt-4 flex items-center gap-4 text-[11px]"><button type="button" onClick={() => setStep(2)} className="text-zinc-600 transition-colors hover:text-zinc-400" disabled={status === "sending"}>← vissza</button><button type="submit" disabled={!userEmail.trim() || status === "sending"} className={nextClass}>{status === "sending" ? "küldöm..." : "mehet ↗"}</button></div>
              </div>
            </div>
            <div aria-live="polite" className="min-h-5">
              {status === "sent" && <p className="text-[11px] uppercase tracking-[0.12em] text-lime-300">Üzenet elküldve. Hamarosan jelentkezem.</p>}
              {status === "error" && <p className="text-[11px] uppercase tracking-[0.12em] text-red-300">Valami félrement. Próbáld újra.</p>}
            </div>
          </form>
        </section>
      </div>
      <Footer />
    </MainContent>
  );
}

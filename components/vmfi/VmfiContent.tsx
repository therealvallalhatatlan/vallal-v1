"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";

export default function VmfiContent() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const form = e.currentTarget as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const res = await fetch("/api/vmfi/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setStatus("Köszönjük! Hamarosan jelentkezünk.");
        form.reset();
      } else {
        setStatus("Hiba történt, próbáld újra később.");
      }
    } catch (err) {
      setStatus("Hálózati hiba, próbáld újra.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto">
      <div className="mb-4">
        <span className="font-mono text-xs tracking-widest text-lime-400 uppercase bg-lime-950/40 border border-lime-500/30 px-3 py-1 rounded-full inline-block">
          VMFI // SYSTEM_STATUS: ONLINE
        </span>
      </div>

      <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-zinc-100 uppercase mb-6">
        Vállalhatatlan Mikro Film Intézet
      </h1>

      <h2 className="text-xl font-bold text-lime-400 mb-4">A mozilátogatás halott. A passzív fogyasztás rák.</h2>

      <div className="text-zinc-300 space-y-4 text-sm lg:text-base leading-relaxed">
        <p>
          A VMFI egy kísérleti mikro-mozihálózat — rövidfilmek, élmények és találkozások hálózata. Célunk, hogy a
          független alkotók számára terepet és közönséget biztosítsunk, ahol a mozi intim, nyers és személyes marad.
        </p>

        <p>
          Nem akarunk helyettesíteni semmit: csak teret adunk a helyi, provokatív, kísérleti hangoknak. Ha filmkészítő
          vagy, zenész, programozó vagy csak szeretnél helyszínt vagy támogatást biztosítani, csatlakozz.
        </p>
      </div>

      <div className="my-6">
        <p className="text-zinc-300 text-sm lg:text-base leading-relaxed">
          Kiket keresünk? Olyan alkotókat és partnereket, akik hajlandóak kockázatot vállalni, rövid formátumban gondolkodni és a
          közösség építésében részt venni. Küldd el a rövid bemutatkozásodat az űrlapon — rövid, tömör és őszinte üzenetet várunk.
        </p>
      </div>

      {/* CTA card */}
      <div className="p-6 rounded-xl bg-zinc-900/90 border border-lime-500/40 shadow-[0_0_20px_rgba(132,204,22,0.1)] my-8">
        <div className="text-zinc-300 text-sm mb-4">
          A független kultúra nem ingyen van, hanem vérből és segítségből épül. Támogasd a hálózat terjeszkedését!
        </div>
        <Link href="/film" className="inline-flex items-center justify-center w-full bg-lime-400 hover:bg-lime-300 text-black font-bold uppercase tracking-wider py-3 px-6 rounded transition-all duration-200 shadow-lg shadow-lime-500/20 hover:shadow-lime-500/40">
          Támogatom a projektet
        </Link>
      </div>

      {/* Contact form */}
      <div className="mt-6">
        <h3 className="text-zinc-100 font-semibold mb-3">Lépj be a hálózatba</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input name="name" placeholder="Név" required className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 rounded p-3 text-sm outline-none transition-all" />
            <input name="email" type="email" placeholder="Email" required className="bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 rounded p-3 text-sm outline-none transition-all" />
          </div>

          <select name="role" defaultValue="Filmes" className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 rounded p-3 text-sm outline-none transition-all">
            <option>Filmes</option>
            <option>Coder</option>
            <option>Zenész</option>
            <option>Színész</option>
            <option>Helyszín/Márka</option>
          </select>

          <textarea name="message" placeholder="Rövid üzenet" rows={4} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 rounded p-3 text-sm outline-none transition-all" />

          <button type="submit" disabled={submitting} className="w-full bg-zinc-900 border border-lime-500/50 text-lime-400 hover:bg-lime-400 hover:text-black font-mono font-bold uppercase py-3 rounded transition-all duration-200">
            {submitting ? "Küldés..." : "Csatlakozom"}
          </button>

          {status && <div className="text-sm text-zinc-300 mt-2">{status}</div>}
        </form>
      </div>
    </section>
  );
}

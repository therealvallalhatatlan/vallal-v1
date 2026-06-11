import Link from "next/link";
import Navigation from "@/components/Navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Köszönjük! – Vállalhatatlan",
};

export default function MecenasKoszonom() {
  return (
    <main className="text-zinc-900">
      <Navigation />
      <div className="min-h-screen flex items-start justify-center px-4 pt-12 pb-24">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/90 backdrop-blur-md shadow-xl px-8 py-10 text-center">
          <div className="text-5xl mb-4">🐇</div>
          <h1 className="text-3xl font-black text-zinc-900 mb-3">
            Köszönjük!
          </h1>
          <p className="text-zinc-600 leading-relaxed mb-8">
            A támogatásod megérkezett. V. hálás — a valóság meghajlítása
            elkezdődhet.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-lime-300"
          >
            Vissza a főoldalra
          </Link>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ShoppingBag, BookOpen, Shield } from "lucide-react";

export default function EventAnnouncement() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 pt-4 pb-0">
      <div className="relative rounded-2xl border border-lime-400/30 bg-zinc-100/100 backdrop-blur-md px-6 py-12 overflow-hidden">
        {/* Subtle glow accent */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(132,204,22,0.04)]" />

        {/* Date badge */}
        <div className="mb-3 inline-block rounded-md bg-black/100 border border-lime-400/20 px-3 py-2 text-sm font-mono font-semibold tracking-widest text-lime-400 uppercase">
          06.28., Vasárnap
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-2xl font-bold text-zinc-900 leading-snug mb-3">
          Vállalhatatlan Intergalaktikus Nyúlvasárnap
        </h2>

        {/* Body */}
        <p className="text-xl text-zinc-800 leading-relaxed mb-6">
          Aznap, közösen meghajlítjuk a valóságot. Támogasd V.-t hogy megcsinálhassa
          amit a fejébe vett!
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-lime-300"
          >
            <ShoppingBag className="h-4 w-4" />
            Veszek egy pólót
          </Link>
          <Link
            href="/konyv-2"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-800"
          >
            <BookOpen className="h-4 w-4" />
            Könyv II. előrendelés
          </Link>
          <Link
            href="/mecenas"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Shield className="h-4 w-4" />
            Mecénás Leszek
          </Link>
        </div>
      </div>
    </div>
  );
}

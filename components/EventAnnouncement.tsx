import Link from "next/link";

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
        <p className="text-xl text-zinc-800 leading-relaxed">
          Aznap meghajlítjuk a valóságot! Támogasd V.-t hogy megcsinálhassa
          amit a fejébe vett!{" "}
          <Link
            href="/shop"
            className="text-lime-600 underline underline-offset-2 hover:text-lime-300 transition-colors"
          >
            Nézd meg a Shop-ot
          </Link>
          {", "}
          <Link
            href="/konyv-2"
            className="text-lime-600 underline underline-offset-2 hover:text-lime-300 transition-colors"
          >
            rendeld meg a könyvet
          </Link>
          {", vagy "}
          <Link
            href="/rendszergazda"
            className="text-lime-600 underline underline-offset-2 hover:text-lime-300 transition-colors"
          >
            legyél Rendszergazda
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

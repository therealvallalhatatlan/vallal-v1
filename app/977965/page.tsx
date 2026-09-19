import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Megvagy :)",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HiddenPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030403] text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(163,230,53,0.045),transparent_42%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(163,230,53,0.018)_1px,transparent_1px)] bg-[size:100%_4px] opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.72)_100%)]" />
      </div>

      <p
        className="relative z-10 px-6 text-center text-3xl tracking-tight text-zinc-100 sm:text-4xl"
        style={{
          fontFamily: "var(--font-heading), serif",
          textShadow: "0 0 18px rgba(163,230,53,0.14)",
        }}
      >
        Megvagy :)
      </p>
    </main>
  );
}

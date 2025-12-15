"use client";

export default function Matricak() {
  return (
    <div className="px-6 py-10 w-full max-w-3xl mx-auto relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="grid gap-8 items-center md:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-3">
            Ingyen matricák
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            Matricák bazdmeg!
          </h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
            Ragasztható kis provokációk laptopra, bringára vagy villanyoszlopra.
            <span className="line-through"> Tartós, UV-álló matricaív</span> vállalhatatlan minőségű 6x3db kis matrica egy A4-es lapon.
          </p>

          <p className="mt-3 text-lg text-lime-400 leading-relaxed">
            Ingyenes! Találkozz valamelyik díleremmel aki átadja neked*
          </p>
          <p className="text-xs opacity-60">*Vagy pénzért elpostázom neked</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-neutral-100 text-xl md:text-2xl">
              18db/A4 - <span className="glitch-text">FREE</span>
            </span>
            <a
              href="mailto:therealvallalhatatlan@gmail.com?subject=Matric%C3%A1k%20rendel%C3%A9s"
              className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
              aria-label="Matricák megrendelése"
            >
              Kérem a matricákat
            </a>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800/70 shadow-[0_0_25px_rgba(0,0,0,0.35)]">
            <img
              src="/img/stickers/1.png"
              alt="Vállalhatatlan matrica"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <style jsx>{`
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
      `}</style>
    </div>
  );
}

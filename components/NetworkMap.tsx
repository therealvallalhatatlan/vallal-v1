// components/NetworkMap.tsx
"use client";

import * as React from "react";
import clsx from "clsx";

export type MapMarker = {
  id: string;
  x: number; // 0..1 (bal=0, jobb=1)
  y: number; // 0..1 (fent=0, lent=1)
  label?: string;
};

type Props = {
  src: string;              // alap térkép kép (pl. /map-base.png)
  alt?: string;
  markers: MapMarker[];     // összes lehetséges marker (rotálunk köztük)
  className?: string;

  // viselkedés
  maxActive?: number;       // egyszerre ennyi látszik (3-4 ajánlott)
  appearEveryMs?: number;   // milyen gyakran spawnol új pont
  lifetimeMs?: number;      // mennyi ideig él egy pont (legyen > appearEveryMs)
  glitchEveryMs?: number;   // ritka vizuális glitch periódus
};

type Active = MapMarker & { spawnId: number; bornAt: number };

export default function NetworkMap({
  src,
  alt = "Hálózati térkép",
  markers,
  className,
  maxActive = 4,
  appearEveryMs = 1200,
  lifetimeMs = 2600,
  glitchEveryMs = 3200,
}: Props) {
  const [glitch, setGlitch] = React.useState(false);
  const [actives, setActives] = React.useState<Active[]>([]);
  const idxRef = React.useRef(0);
  const spawnIdRef = React.useRef(0);

  // véletlenszerű rövid glitch
  React.useEffect(() => {
    let alive = true;
    function arm() {
      const jitter = 400 + Math.random() * 900;
      const t = setTimeout(() => {
        if (!alive) return;
        setGlitch(true);
        setTimeout(() => alive && setGlitch(false), 140 + Math.random() * 120);
        arm();
      }, glitchEveryMs + jitter);
      return t;
    }
    const h = arm();
    return () => {
      alive = false;
      clearTimeout(h);
    };
  }, [glitchEveryMs]);

  // rotáció: új pont jön, a régi még él picit -> átfedés
  React.useEffect(() => {
    if (!markers?.length) return;
    const spawn = () => {
      const i = idxRef.current % markers.length;
      idxRef.current++;
      const m = markers[i];
      const now = Date.now();
      const spawnId = ++spawnIdRef.current;

      setActives((prev) => {
        const next: Active[] = [
          ...prev.filter((a) => now - a.bornAt < lifetimeMs),
          { ...m, spawnId, bornAt: now },
        ];
        while (next.length > maxActive) next.shift();
        return next;
      });

      setTimeout(() => {
        setActives((prev) => prev.filter((a) => a.spawnId !== spawnId));
      }, lifetimeMs + 50);
    };

    // első azonnal, aztán időzítve
    spawn();
    const t = setInterval(spawn, appearEveryMs);
    return () => clearInterval(t);
  }, [markers, maxActive, appearEveryMs, lifetimeMs]);

  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-lg border border-green-400/30 bg-black",
        "shadow-[0_0_30px_rgba(0,255,170,0.08)_inset]",
        className
      )}
    >
      {/* alap térkép */}
      <img
        src={src}
        alt={alt}
        className={clsx(
          "block h-auto w-full select-none object-cover opacity-90",
          "brightness-[0.9] contrast-125 hue-rotate-[8deg]"
        )}
        draggable={false}
      />

      {/* aktív, rotáló pontok */}
      <div className="pointer-events-none absolute inset-0">
        {actives.map((m) => (
          <ActiveMarker
            key={m.spawnId}
            id={m.id}
            x={m.x}
            y={m.y}
            label={m.label}
            bornAt={m.bornAt}
            lifetimeMs={lifetimeMs}
          />
        ))}
      </div>

      {/* radarsöprés */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          background:
            "linear-gradient(90deg, rgba(120,255,200,0) 0%, rgba(120,255,200,0.10) 50%, rgba(120,255,200,0) 100%)",
          animation: "nm_sweep 6.5s linear infinite",
        }}
      />

      {/* CRT scanlines + szemcse */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-75 mix-blend-overlay"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(0,255,170,0.09) 0px, rgba(0,255,170,0.09) 1px, transparent 2px, transparent 3px)",
          animation: "nm_flicker 4s infinite steps(60)",
        }}
      />

      {/* vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0) 60%, rgba(0,0,0,0.28) 100%)",
        }}
      />

      {/* RGB glitch overlay */}
      <div
        aria-hidden
        className={clsx(
          "pointer-events-none absolute inset-0 transition-transform duration-150",
          glitch && "translate-x-0.5 -translate-y-0.5"
        )}
        style={{
          mixBlendMode: "screen",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          filter: "contrast(125%) saturate(150%) drop-shadow(0 0 16px rgba(0,255,170,0.35))",
          opacity: glitch ? 0.55 : 0,
        }}
      />

      {/* finom vertical-jitter */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,170,0.08),transparent_60%)]"
        style={{ animation: "nm_vshift 0.9s infinite steps(2)", mixBlendMode: "screen" }}
      />

      {/* lokális kulcs-animok */}
      <style jsx>{`
        @keyframes nm_sweep {
          from { transform: translateX(-100%); }
          to   { transform: translateX(100%); }
        }
        @keyframes nm_flicker {
          0% { opacity: 0.6; } 2% { opacity: 0.9; } 8% { opacity: 0.55; }
          12% { opacity: 0.78; } 20% { opacity: 0.62; } 100% { opacity: 0.75; }
        }
        @keyframes nm_vshift {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-0.7px); }
          100% { transform: translateY(0px); }
        }
        @keyframes nm_ring {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
          70%  { transform: translate(-50%, -50%) scale(1.15); opacity: 0.0; }
          100% { transform: translate(-50%, -50%) scale(1.15); opacity: 0; }
        }
        @keyframes nm_markerFade {
          0%, 85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes nm_dotGlow {
          0%,100% { box-shadow: 0 0 14px rgba(0,255,170,0.95), 0 0 32px rgba(0,255,170,0.5); }
          50%     { box-shadow: 0 0 22px rgba(0,255,170,1), 0 0 44px rgba(0,255,170,0.7); }
        }
      `}</style>
    </div>
  );
}

/* ------- Egy aktív marker (pixelpontos középre igazítás) ------- */

function ActiveMarker({
  x,
  y,
  label,
  bornAt,
  lifetimeMs,
}: MapMarker & { bornAt: number; lifetimeMs: number }) {
  const left = `${Math.max(0, Math.min(1, x)) * 100}%`;
  const top = `${Math.max(0, Math.min(1, y)) * 100}%`;

  // No JS-driven fade; CSS animation handles opacity
  void bornAt;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top,
        transform: "translate(-50%, -50%)",
        opacity: 1,
        width: 0,
        height: 0,
        animation: `nm_markerFade ${lifetimeMs}ms linear forwards`,
      }}
    >
      {/* középponti „stack” – minden abszolút középre igazítva */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform">
        {/* középpont (erős glow) */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     h-[16px] w-[16px] rounded-full bg-emerald-300
                     ring-[3px] ring-emerald-400
                     shadow-[0_0_16px_rgba(0,255,170,0.85),0_0_36px_rgba(0,255,170,0.45)]"
          style={{ animation: "nm_dotGlow 1.6s ease-in-out infinite" }}
        />

        {/* pulzáló gyűrűk */}
        <Ring size={36} delay={0} />
        <Ring size={64} delay={0.25} />
        <Ring size={96} delay={0.5} />

        {/* célkereszt (középre igazított SVG) */}
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50"
          width="72" height="72" viewBox="0 0 72 72"
        >
          <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(0,255,170,0.35)" strokeDasharray="6 6" />
          <line x1="36" y1="0" x2="36" y2="12" stroke="rgba(0,255,170,0.45)" />
          <line x1="36" y1="60" x2="36" y2="72" stroke="rgba(0,255,170,0.45)" />
          <line x1="0" y1="36" x2="12" y2="36" stroke="rgba(0,255,170,0.45)" />
          <line x1="60" y1="36" x2="72" y2="36" stroke="rgba(0,255,170,0.45)" />
        </svg>
      </div>

      {/* címke külön rétegen (nem tolja el a középpontot) */}
      {label && (
        <span
          className="absolute left-1/2 top-[calc(50%+58px)] -translate-x-1/2 select-none
                     text-[11px] font-mono tracking-wide text-emerald-200/90"
          style={{ textShadow: "0 0 2px rgba(0,255,170,0.9), 0 0 14px rgba(0,255,170,0.35)" }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function Ring({ size, delay = 0 }: { size: number; delay?: number }) {
  return (
    <span
      className="absolute left-1/2 top-1/2 rounded-full border border-emerald-300/70"
      style={{
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        animation: `nm_ring 2.2s ${delay}s ease-out infinite`,
      }}
    />
  );
}

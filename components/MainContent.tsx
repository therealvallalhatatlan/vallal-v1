"use client";

import { ReactNode, useEffect } from "react";
import { useScrollGlitch } from "@/hooks/useScrollGlitch";
import VHSTrackingLines from "./VHSTrackingLines";

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { glitchIntensity } = useScrollGlitch();

  return (
    <main
      className="relative min-h-screen bg-black text-zinc-200 overflow-x-hidden"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
      }}
    >
      {/* Fixed screen crack – top-left corner */}
      <img
        src="/tores.png"
        alt=""
        aria-hidden="true"
        className="fixed pointer-events-none z-[60] w-48 md:w-64 select-none"
        style={{ top: "-30px", left: "-30px" }}
        draggable={false}
      />

      {/* Base CRT scanlines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-40 fx-stripes"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            rgba(0,0,0,.28) 0 1px,
            rgba(0,0,0,0) 3px 4px
          )`,
          opacity: 0.55,
          mixBlendMode: "multiply",
        }}
      />

      {/* VHS sweep effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 fx-vhs"
        style={{
          backgroundImage: `
            linear-gradient(
              to bottom,
              rgba(255,255,255,0.00) 0%,
              rgba(255,255,255,0.06) 25%,
              rgba(255,255,255,0.18) 50%,
              rgba(255,255,255,0.06) 75%,
              rgba(255,255,255,0.00) 100%
            ),
            repeating-linear-gradient(
              to bottom,
              rgba(0,0,0,0.10) 0 2px,
              rgba(0,0,0,0.00) 2px 4px
            )
          `,
          animation: "vhs-line-move 4.6s linear infinite",
        }}
      />

      {/* Scroll-based glitch disruption layer */}
      <div
        className="fixed inset-0 pointer-events-none z-45"
        style={{
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(2px + ${glitchIntensity * 3}px),
            rgba(163, 230, 53, ${glitchIntensity * 0.1}) calc(2px + ${
            glitchIntensity * 3
          }px),
            rgba(163, 230, 53, ${glitchIntensity * 0.1}) calc(4px + ${
            glitchIntensity * 3
          }px)
          )`,
          opacity: glitchIntensity * 0.3,
          mixBlendMode: "overlay",
          animation:
            glitchIntensity > 0.3
              ? `glitch-shift ${0.1 + glitchIntensity * 0.2}s infinite`
              : "none",
        }}
      />

      {/* VHS Tracking Lines */}
      <VHSTrackingLines />

      {/* Main content */}
      <div className="relative z-20">{children}</div>
    </main>
  );
}

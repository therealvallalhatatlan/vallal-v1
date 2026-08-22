"use client";

import { ReactNode } from "react";
import { useScrollGlitch } from "@/hooks/useScrollGlitch";
import VHSTrackingLines from "./VHSTrackingLines";

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { glitchIntensity } = useScrollGlitch();

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-black text-zinc-200"
      style={{
        background:
          "linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)",
      }}
    >
      {/* Base CRT scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-40 fx-stripes"
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

      {/* VHS sweep */}
      <div
        className="pointer-events-none fixed inset-0 z-50 fx-vhs"
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


      {/* VHS tracking lines */}
      <VHSTrackingLines />

      {/* Main content */}
      <div className="w-full h-20"></div>
      <div className="relative z-20">{children}</div>
    </main>
  );
}
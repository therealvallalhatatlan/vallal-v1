"use client";

import React from "react";

export default function CtaBuyBox() {
  // ---- EZT A HÁROM SZÁMOT kell majd csak átírnod ----
  const sold = 45;
  const total = 50;
  const remaining = total - sold;
  const progress = (sold / total) * 100;
  // ---------------------------------------------------

  return (
    <div className="
      w-full max-w-2xl mt-12 mx-auto
      rounded-2xl 
      border border-lime-500/40 
      bg-black/40 
      backdrop-blur-md
      shadow-[0_0_25px_rgba(132,204,22,0.15)]
      p-8 
      flex flex-col items-center gap-6
      relative
      overflow-hidden
    ">
      {/* Glowing border accent */}
      <div className="
        absolute inset-0 rounded-2xl 
        pointer-events-none
        border border-lime-500/10
        shadow-[0_0_30px_rgba(132,204,22,0.35)]
      "></div>

      {/* Text */}
      <div className="text-center text-white">
        <span className="font-bold text-lg">
          {sold} / {total} elkelt
        </span>
        <span className="mx-2 text-gray-400">•</span>
        <span className="text-gray-300">{remaining} maradt</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-zinc-800/60 rounded-full h-3 overflow-hidden border border-zinc-700/50">
        <div
          className="h-full bg-lime-500 transition-all duration-700 shadow-[0_0_10px_rgba(132,204,22,0.8)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Button */}
      <a
        href="/checkout"
        className="
          inline-flex items-center justify-center
          rounded-lg 
          bg-lime-500
          hover:bg-lime-400
          text-black font-semibold 
          px-6 py-3 
          text-base
          shadow-[0_0_18px_rgba(132,204,22,0.6)]
          hover:shadow-[0_0_28px_rgba(132,204,22,0.9)]
          transition-all
        "
      >
        Megveszem a Könyvet
      </a>
    </div>
  );
}

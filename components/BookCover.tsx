"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDE_INTERVAL = 7000; // ms – ennyi időnként váltson
const GLITCH_DURATION = 500; // ms – mennyi ideig tartson a glitch

const slides = [
  {
    src: "/vallalhatatlan.png",
    alt: "Vállalhatatlan könyv borító – 01",
  },
  {
    src: "/vallalhatatlan-2.png",
    alt: "Vállalhatatlan könyv borító – 02",
  },
  {
    src: "/vallalhatatlan-3.png",
    alt: "Vállalhatatlan könyv borító – 02",
  },
  // ha akarsz több képet, ide add hozzá
];

export default function BookCover() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const startCycle = () => {
      setGlitch(true);
      timeout = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % slides.length);
        setGlitch(false);
      }, GLITCH_DURATION);
    };

    const interval = setInterval(startCycle, SLIDE_INTERVAL);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const current = slides[activeIndex];

  return (
    <div
      className="relative w-full max-w-xl mx-auto group cursor-pointer"
      onMouseEnter={() => setGlitch(true)}
      onMouseLeave={() => setGlitch(false)}
    >
      {/* Glow / árnyék */}
      <div className="absolute inset-0 rounded-xl blur-xl opacity-20 bg-green-300 group-hover:opacity-30 transition" />

      {/* VHS overlay (folyamatos, finom) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,0)_0px,rgba(0,0,0,0)_2px,rgba(0,0,0,0.3)_3px)] animate-vhs-roll"
      />

      {/* Glitch rétegek – csak váltáskor / hoverre */}
      {glitch && (
        <>
          <div className="absolute inset-0 mix-blend-screen opacity-40 animate-glitch-slice pointer-events-none">
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-cover rounded-xl opacity-70"
            />
          </div>
          <div className="absolute inset-0 mix-blend-screen opacity-30 animate-glitch-slice2 pointer-events-none">
            <Image
              src={current.src}
              alt={current.alt}
              fill
              className="object-cover rounded-xl opacity-70"
            />
          </div>
        </>
      )}

      {/* Fő kép */}
      <div className="relative rounded-xl overflow-hidden border border-zinc-800">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={900}
          height={1400}
          className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-[1.02]"
          priority
        />
      </div>

      {/* Kis indikátor pöttyök alul (opcionális, de jól néz ki) */}
      <div className="mt-4 flex justify-center gap-2">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-4 rounded-full transition-all ${
              i === activeIndex ? "bg-green-400" : "bg-zinc-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";

const TOTAL_BOOKS = 100;
const SOLD_BOOKS = 89;
const REMAINING_BOOKS = TOTAL_BOOKS - SOLD_BOOKS;
const PROGRESS_PERCENT = Math.min(100, Math.round((SOLD_BOOKS / TOTAL_BOOKS) * 100));

export default function BookCounter() {
  const [isVisible, setIsVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
          }
        });
      },
      {
        threshold: 0.3,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let currentCount = 0;
    const duration = 2000; // 2 seconds
    const increment = SOLD_BOOKS / (duration / 16); // 60fps

    const timer = setInterval(() => {
      currentCount += increment;
      if (currentCount >= SOLD_BOOKS) {
        setDisplayCount(SOLD_BOOKS);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(currentCount));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible]);

  return (
    <section
      ref={sectionRef}
      className="px-4 py-12 md:py-16 lg:py-20 mx-auto w-full max-w-4xl"
    >
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-lime-400/30 bg-black/40 backdrop-blur-md p-6 md:p-10 lg:p-12 shadow-[0_0_30px_rgba(132,204,22,0.2)]">
        {/* VHS Scanlines Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-lime-400/5 to-transparent animate-scan" />
        </div>

        <div className="relative text-center space-y-4 md:space-y-6">
          {/* Main Counter */}
          <div className="space-y-2">
            <div className="text-5xl md:text-7xl lg:text-8xl font-black text-lime-400 crt-heading tracking-tight">
              <span className="inline-block tabular-nums">
                {isVisible ? displayCount : 0}
              </span>
              <span className="text-lime-400/40 mx-2">/</span>
              <span className="text-lime-300/80">{TOTAL_BOOKS}</span>
            </div>
            <p className="text-xs md:text-sm text-lime-300/70 uppercase tracking-[0.2em] md:tracking-widest font-semibold">
              Már {isVisible ? displayCount : 0} példány talált gazdára
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-2xl mx-auto space-y-2">
            <div className="w-full bg-zinc-800/60 rounded-full h-2 md:h-3 overflow-hidden border border-zinc-700/50">
              <div
                className="h-full bg-lime-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(132,204,22,0.8)]"
                style={{
                  width: isVisible ? `${PROGRESS_PERCENT}%` : "0%",
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] md:text-xs text-neutral-400 px-1">
              <span>{PROGRESS_PERCENT}% elkelt</span>
              <span>
                Még <span className="text-lime-400 font-semibold">{REMAINING_BOOKS}</span> példány
                elérhető
              </span>
            </div>
          </div>

          {/* Subtext */}
          <p className="text-xs md:text-sm text-neutral-400 max-w-xl mx-auto">
            Limitált kiadás – ne maradj le a könyvből, amíg van készleten!
          </p>
        </div>

        {/* Pulsing Border Glow */}
        <div className="absolute inset-0 rounded-2xl md:rounded-3xl border border-lime-500/20 animate-pulse pointer-events-none" />
      </div>
    </section>
  );
}

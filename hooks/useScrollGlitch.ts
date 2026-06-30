"use client";

import { useEffect, useState } from "react";

interface ScrollGlitchState {
  glitchIntensity: number;
}

export function useScrollGlitch(): ScrollGlitchState {
  const [glitchIntensity, setGlitchIntensity] = useState(0);

  useEffect(() => {
    let rafId: number;

    const handleScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min(scrollY / docHeight, 1);

        // Medium intensity: ramp up to 0.6 at mid-scroll, then down at bottom
        let intensity = 0;
        if (scrollProgress < 0.5) {
          intensity = scrollProgress * 1.2; // 0 to 0.6
        } else {
          intensity = (1 - scrollProgress) * 1.2; // 0.6 back down to 0
        }

        // Add slight random jitter to create glitch feel
        intensity = Math.min(0.6, intensity + Math.random() * 0.1);

        setGlitchIntensity(intensity);
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return { glitchIntensity };
}

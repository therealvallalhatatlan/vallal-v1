
"use client";
import { useEffect, useState, useRef } from "react";

// Induló ár és időpont (UTC)
const START_PRICE = 5000;
const INCREMENT = 100; // Ft
const INCREMENT_INTERVAL = 1800; // másodperc (30 perc)
// 2026-04-26 15:00:00 CEST (UTC+2) => 2026-04-26T13:00:00Z
const START_TIMESTAMP = new Date("2026-04-26T13:00:00Z").getTime(); // Induló időpont magyar idő szerint 15:00

function getCurrentPrice() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - START_TIMESTAMP) / 1000);
  const increments = Math.max(0, Math.floor(elapsedSeconds / INCREMENT_INTERVAL));
  return START_PRICE + increments * INCREMENT;
}

// Animált digitális számláló
export default function BookAuctionCounter() {
  const [displayPrice, setDisplayPrice] = useState(START_PRICE);
  const [hasAnimatedInitial, setHasAnimatedInitial] = useState(false);
  const targetPriceRef = useRef(getCurrentPrice());
  const animFrame = useRef<number | null>(null);

  // Frissíti a célt (targetPrice) minden másodpercben
  useEffect(() => {
    const interval = setInterval(() => {
      targetPriceRef.current = getCurrentPrice();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Első betöltéskor animáljon 5000-től az aktuális értékig
  useEffect(() => {
    if (hasAnimatedInitial) return;
    let running = true;
    function animateInitial() {
      setDisplayPrice(prev => {
        const target = getCurrentPrice();
        if (prev === target) {
          setHasAnimatedInitial(true);
          return target;
        }
        const diff = target - prev;
        const step = Math.sign(diff) * Math.max(10, Math.abs(diff) / 8);
        let next = prev + step;
        if ((step > 0 && next > target) || (step < 0 && next < target)) next = target;
        return next;
      });
      if (running) animFrame.current = requestAnimationFrame(animateInitial);
    }
    animFrame.current = requestAnimationFrame(animateInitial);
    return () => {
      running = false;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
    // eslint-disable-next-line
  }, [hasAnimatedInitial]);

  // Utána mindig a legfrissebb targetPrice felé animál
  useEffect(() => {
    if (!hasAnimatedInitial) return;
    let running = true;
    function animate() {
      setDisplayPrice(prev => {
        const target = targetPriceRef.current;
        if (prev === target) return prev;
        const diff = target - prev;
        const step = Math.sign(diff) * Math.max(10, Math.abs(diff) / 8);
        let next = prev + step;
        if ((step > 0 && next > target) || (step < 0 && next < target)) next = target;
        return next;
      });
      if (running) animFrame.current = requestAnimationFrame(animate);
    }
    animFrame.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [hasAnimatedInitial]);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        className="w-full flex justify-center items-center select-none"
        style={{
          fontFamily: '"Share Tech Mono", monospace',
          fontSize: 'clamp(2.5rem, 10vw, 4.5rem)',
          letterSpacing: '0.08em',
          color: '#bfff00',
          textShadow: '0 2px 16px #bfff00, 0 1px 0 #222',
          background: 'transparent',
          borderRadius: '1.2em',
          padding: '0.2em 0.5em',
          margin: '0.2em 0',
          border: 'none',
          boxShadow: 'none',
        }}
        aria-label="Aktuális ár digitális kijelzőn"
      >
        {displayPrice.toLocaleString("hu-HU")} Ft
      </div>
    </div>
  );
}

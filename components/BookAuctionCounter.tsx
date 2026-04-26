
"use client";
import { useEffect, useState } from "react";

// Induló ár és időpont (UTC)
const START_PRICE = 5000;
const INCREMENT = 100; // Ft
const INCREMENT_INTERVAL = 60; // másodperc (1 perc)
// 2026-04-26 15:00:00 UTC
const START_TIMESTAMP = new Date("2026-04-26T15:00:00Z").getTime(); // Induló időpont

function getCurrentPrice() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - START_TIMESTAMP) / 1000);
  const increments = Math.max(0, Math.floor(elapsedSeconds / INCREMENT_INTERVAL));
  return START_PRICE + increments * INCREMENT;
}

// Animált digitális számláló
import { useRef } from "react";
export default function BookAuctionCounter() {
  const [displayPrice, setDisplayPrice] = useState(START_PRICE);
  const [targetPrice, setTargetPrice] = useState(getCurrentPrice());
  const animating = useRef(false);

  // Frissíti a célt (targetPrice) minden másodpercben
  useEffect(() => {
    const interval = setInterval(() => {
      setTargetPrice(getCurrentPrice());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animáció: ha változik a targetPrice, szépen animálva léptetjük a displayPrice-t
  useEffect(() => {
    if (displayPrice === targetPrice || animating.current) return;
    animating.current = true;
    const diff = targetPrice - displayPrice;
    const step = diff > 0 ? 10 : -10;
    const interval = setInterval(() => {
      setDisplayPrice(prev => {
        if ((step > 0 && prev + step >= targetPrice) || (step < 0 && prev + step <= targetPrice)) {
          clearInterval(interval);
          animating.current = false;
          return targetPrice;
        }
        return prev + step;
      });
    }, 18); // gyors, de nem azonnali
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [targetPrice]);

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

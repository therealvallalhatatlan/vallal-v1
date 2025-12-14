"use client";
import { useEffect, useRef, useState } from "react";

export default function Matricak() {
  const images = [
    { src: "/img/stickers/1.png", alt: "Vállalhatatlan matrica 1" },
    { src: "/img/stickers/2.png", alt: "Vállalhatatlan matrica 2" },
    { src: "/img/stickers/3.png", alt: "Vállalhatatlan matrica 3" },
    { src: "/img/stickers/4.png", alt: "Vállalhatatlan matrica 4" },
    { src: "/img/stickers/5.png", alt: "Vállalhatatlan matrica 5" },
    { src: "/img/stickers/6.png", alt: "Vállalhatatlan matrica 6" },
  ];
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const mouseStartX = useRef<number | null>(null);
  const mouseDeltaX = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(id);
  }, [images.length]);

  const goTo = (next: number) => {
    const len = images.length;
    setActive(((next % len) + len) % len);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    }
  };
  const handleTouchEnd = () => {
    const threshold = 30;
    if (touchDeltaX.current > threshold) goTo(active - 1);
    else if (touchDeltaX.current < -threshold) goTo(active + 1);
    touchStartX.current = null;
    touchDeltaX.current = 0;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    mouseStartX.current = e.clientX;
    mouseDeltaX.current = 0;
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || mouseStartX.current === null) return;
    mouseDeltaX.current = e.clientX - mouseStartX.current;
    e.preventDefault();
  };
  const handleMouseUp = () => {
    const threshold = 30;
    if (mouseDeltaX.current > threshold) goTo(active - 1);
    else if (mouseDeltaX.current < -threshold) goTo(active + 1);
    isDragging.current = false;
    mouseStartX.current = null;
    mouseDeltaX.current = 0;
  };

  return (
    <div className="px-6 py-10 w-full max-w-3xl mx-auto relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="grid gap-8 items-center md:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-3">
            ÉÉés Nem viccelek... 
          </p>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            Matricák bazdmeg!
          </h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
            Ragasztható kis provokációk laptopra, bringára vagy villanyoszlopra.
            <span className="line-through"> Tartós, UV-álló matricaív</span> vállalhatatlan minőségű 6x3db kis matrica egy A4-es lapon.
          </p>

          <p className="mt-3 text-sm text-lime-400 leading-relaxed">
            Találkozz valamelyik díleremmel aki átadja neked*
          </p>
          <p className="text-xs opacity-60">*Vagy elpostázom neked</p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="text-neutral-100 text-xl md:text-2xl">
              18db/A4 - 2000.-
            </span>
            <a
              href="mailto:therealvallalhatatlan@gmail.com?subject=Matric%C3%A1k%20rendel%C3%A9s"
              className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
              aria-label="Matricák megrendelése"
            >
              Kérem a matricákat
            </a>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {images.map((img) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                className="h-14 w-14 rounded-lg border border-neutral-800/70 object-cover shadow"
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <div
            className="glitch-overlay relative w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800/70 shadow-[0_0_25px_rgba(0,0,0,0.35)]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              key={images[active].src}
              src={images[active].src}
              alt={images[active].alt}
              className="glitch-frame w-full h-full object-cover transition-opacity duration-500"
            />
            <button
              aria-label="Előző kép"
              onClick={() => goTo(active - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-lime-200 hover:bg-black/80"
            >
              ‹
            </button>
            <button
              aria-label="Következő kép"
              onClick={() => goTo(active + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-lime-200 hover:bg-black/80"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Ugrás a(z) ${i + 1}. képhez`}
                  className={`h-2 w-2 rounded-full transition ${
                    i === active
                      ? "bg-lime-400"
                      : "bg-neutral-500/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .glitch-frame {
          animation: glitchFade 600ms ease-in-out;
        }
        @keyframes glitchFade {
          0% {
            opacity: 0;
            transform: translateX(6px) scale(1.02);
            filter: hue-rotate(-10deg) saturate(1.2);
          }
          30% {
            opacity: 1;
            transform: translateX(-2px) scale(0.999);
          }
          60% {
            transform: translateX(1px) skewX(-0.4deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        .glitch-overlay::after {
          content: "";
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, 0.03),
            rgba(255, 255, 255, 0.03) 1px,
            transparent 1px,
            transparent 3px
          );
          mix-blend-mode: screen;
          opacity: 0.18;
          pointer-events: none;
          animation: scan 2.5s linear infinite;
        }
        @keyframes scan {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `}</style>
    </div>
  );
}

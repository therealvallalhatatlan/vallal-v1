"use client";

import React from "react";
import clsx from "clsx";
import Link from "next/link";

/**
 * TabbedShowcase – front‑page tab interface with auto‑rotation.
 *
 * Features
 * - Three tabs: Könyv, MP3 (default active), Kaland
 * - Auto‑rotate without interaction (defaults to 5s)
 * - Pauses on hover/focus for better UX
 * - Accessible: proper roles/aria + keyboard (←/→) navigation
 * - Tailwind‑only styling (lime-400 as primary accent)
 *
 * Usage:
 *   <TabbedShowcase className="mt-10" />
 */

export type TabKey = "book" | "mp3" | "kaland";

interface TabbedShowcaseProps {
  className?: string;
  /** Start on this tab index (0: Könyv, 1: MP3, 2: Kaland). Default: 1 */
  startIndex?: number;
  /** Enable auto rotation. Default: true */
  autoRotate?: boolean;
  /** Rotation interval in ms. Default: 5000 */
  rotateMs?: number;
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: "book",
    label: "Könyv",
    description:
      "Fizikai könyv, 24 fejezettel. Minden fejezet saját QR‑kódot kap, ami az adott rész világát nyitja meg.",
  },
  {
    key: "mp3",
    label: "MP3",
    description:
      "24 fejezet × 2–3 track. Az első szám az olvasás ritmusára készült; a többi mélyíti a témát. Minden playlist letölthető MP3‑ban.",
  },
  {
    key: "kaland",
    label: "Kaland",
    description:
      "Dead drop terjesztés: a könyvet profi csomagolásban rejtem el, a koordinátákat megadom. Publikus, kontaktmentes hely – nem szívatás, hanem tiszta kaland.",
  },
];

export default function TabbedShowcase({
  className,
  startIndex = 1, // MP3 by default
  autoRotate = true,
  rotateMs = 5000,
}: TabbedShowcaseProps) {
  const [active, setActive] = React.useState<number>(() =>
    Math.min(Math.max(startIndex, 0), TABS.length - 1)
  );
  const [paused, setPaused] = React.useState(false);

  // Auto‑rotation
  React.useEffect(() => {
    if (!autoRotate || paused) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % TABS.length);
    }, rotateMs);
    return () => clearInterval(id);
  }, [autoRotate, paused, rotateMs]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setActive((i) => (i + 1) % TABS.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setActive((i) => (i - 1 + TABS.length) % TABS.length);
    }
  };

  return (
    <section
      className={clsx(
        "w-full max-w-3xl",
        "rounded-2xl border border-lime-400/20 bg-black/40 backdrop-blur-sm",
        "shadow-[0_0_80px_-40px] shadow-lime-400/40",
        className
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Vállalhatatlan – szekciók"
        className={clsx(
          "flex items-stretch gap-1",
          "border-b border-lime-400/20",
          "px-3 pt-3"
        )}
        onKeyDown={onKeyDown}
      >
        {TABS.map((t, idx) => {
          const selected = active === idx;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`tab-panel-${t.key}`}
              id={`tab-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(idx)}
              className={clsx(
                "crt-glitch relative rounded-t-xl px-4 py-2 text-sm font-semibold tracking-wide",
                "transition-colors",
                selected
                  ? "text-lime-400"
                  : "text-lime-400/60 hover:text-lime-400",
                selected &&
                  "after:absolute after:inset-x-2 after:-bottom-[1px] after:h-[2px] after:bg-lime-400"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div className="px-5 py-6">
        {TABS.map((t, idx) => (
          <div
            key={t.key}
            role="tabpanel"
            id={`tab-panel-${t.key}`}
            aria-labelledby={`tab-${t.key}`}
            hidden={active !== idx}
            className="focus:outline-none"
          >
            <h3 className="mb-2 text-xs uppercase tracking-widest text-lime-400/70">
              {t.label}
            </h3>
            <p className="text-base leading-relaxed text-lime-400/95">
              {t.description}
            </p>
            {t.key === "mp3" && (
              <Link
                href="/music"
                className="mt-3 inline-block text-sm font-semibold text-lime-200 underline hover:underline"
              >
                hallgass bele 
                 <svg viewBox="0 0 24 24" className="mt-2 w-6 h-6" aria-hidden="true">
                    <polygon points="8,5 19,12 8,19" fill="currentColor" />
                  </svg>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

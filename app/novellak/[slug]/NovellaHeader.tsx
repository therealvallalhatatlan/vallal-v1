'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface NovellaHeaderProps {
  backHref: string;
  readingTime: number;
  title: string;
}

export function NovellaHeader({ backHref, readingTime, title }: NovellaHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry?.isIntersecting),
      { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel div just below where the header sits */}
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none h-0" />

      <header
        className={[
          'sticky top-0 z-40 flex h-14 items-center justify-between px-5 transition-all duration-300',
          scrolled
            ? 'border-b border-white/[0.06] bg-[#0c0c0c]/95 backdrop-blur-md'
            : 'bg-transparent',
        ].join(' ')}
      >
        <Link
          href={backHref}
          className="flex items-center gap-2 text-[13px] text-neutral-500 transition hover:text-neutral-200"
          aria-label="Vissza a novellák listájára"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Novellák</span>
        </Link>

        {scrolled && (
          <p
            className="absolute left-1/2 max-w-[52%] -translate-x-1/2 truncate text-center text-[13px] text-neutral-400"
            aria-hidden="true"
          >
            {title}
          </p>
        )}

        {readingTime > 0 && (
          <span className="text-[12px] text-neutral-700">
            {readingTime} perc
          </span>
        )}
      </header>
    </>
  );
}

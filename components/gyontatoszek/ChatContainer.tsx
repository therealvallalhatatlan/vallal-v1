"use client";

import type { ReactNode, RefObject } from 'react';

interface ChatContainerProps {
  children: ReactNode;
  scrollRef: RefObject<HTMLDivElement | null>;
  header?: ReactNode;
  composer: ReactNode;
  aside?: ReactNode;
  asideOpen?: boolean;
  onCloseAside?: () => void;
}

export function ChatContainer({ children, scrollRef, header, composer, aside, asideOpen = false, onCloseAside }: ChatContainerProps) {
  const hasVisibleAside = aside && asideOpen;

  return (
    <section
      className={[
        'retro-chat-shell relative mx-auto flex h-[min(92vh,980px)] w-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(110,130,90,0.07),transparent_0%,transparent_36%),linear-gradient(180deg,rgba(10,12,10,0.94)_0%,rgba(6,7,7,0.98)_100%)] shadow-[0_20px_90px_rgba(0,0,0,0.5)] transition-[max-width] duration-300',
        hasVisibleAside ? 'max-w-[560px] lg:max-w-[980px] lg:flex-row' : 'max-w-[560px]',
      ].join(' ')}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 retro-chat-noise opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 fx-stripes opacity-25" />

      {/* Main chat column */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:min-w-0">
        {header ? <div className="border-b border-white/8 px-4 py-4 md:px-6">{header}</div> : null}

        <div
          ref={scrollRef}
          className="sidebar-scrollbar relative flex-1 overflow-y-auto overscroll-contain"
          style={{ overflowAnchor: 'none' }}
        >
          {children}
        </div>

        <div className="relative">{composer}</div>
      </div>

      {/* Aside: overlay on mobile, static column on lg+ */}
      {aside ? (
        <>
          {/* Mobile backdrop — hidden on desktop */}
          {asideOpen ? (
            <button
              type="button"
              aria-label="Bezárás"
              onClick={onCloseAside}
              className="absolute inset-0 z-[18] bg-black/40 lg:hidden"
            />
          ) : null}
          <div
            className={[
              // Mobile: absolute overlay sliding from right
              'absolute inset-y-0 right-0 z-[19] w-full max-w-[380px] border-l border-white/8 bg-black/70 backdrop-blur-xl transition-transform duration-300',
              // Desktop: static flex child, no backdrop, dimmed until hover
              'lg:static lg:inset-auto lg:z-auto lg:w-[420px] lg:max-w-none lg:shrink-0 lg:backdrop-blur-none lg:transition-[transform] lg:duration-200',
              // Visibility
              asideOpen ? 'translate-x-0' : 'translate-x-full lg:hidden',
            ].join(' ')}
          >
            {aside}
          </div>
        </>
      ) : null}
    </section>
  );
}

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
  return (
    <section className="retro-chat-shell relative mx-auto flex h-[min(92vh,980px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(110,130,90,0.07),transparent_0%,transparent_36%),linear-gradient(180deg,rgba(10,12,10,0.94)_0%,rgba(6,7,7,0.98)_100%)] shadow-[0_20px_90px_rgba(0,0,0,0.5)] md:flex-row">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 retro-chat-noise opacity-40" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 fx-stripes opacity-25" />

      {aside ? (
        <>
          {asideOpen ? (
            <button
              type="button"
              aria-label="Bezárás"
              onClick={onCloseAside}
              className="absolute inset-0 z-[18] bg-black/40 md:hidden"
            />
          ) : null}
          <div
            className={`absolute inset-y-0 right-0 z-[19] w-full max-w-[380px] border-l border-white/8 bg-black/70 backdrop-blur-xl transition-transform duration-300 md:hidden ${
              asideOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {aside}
          </div>
        </>
      ) : null}

      <div className={`relative z-10 flex min-h-0 flex-1 flex-col ${aside ? 'md:basis-1/2 md:max-w-[50%]' : ''}`}>
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

      {aside ? (
        <div className="hidden min-h-0 border-l border-white/8 bg-black/20 md:relative md:z-10 md:flex md:basis-1/2 md:max-w-[50%] md:flex-col">
          {aside}
        </div>
      ) : null}
    </section>
  );
}

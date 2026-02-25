"use client";

import * as React from "react";
import clsx from "clsx";

type Props = {
  messages: string[];
  className?: string;
  heightPx?: number;
  cycleMs?: number;
};

export default function TweetRotator({
  messages,
  className,
  heightPx = 84,
  cycleMs = 28000,
}: Props) {
  const items = React.useMemo(() => {
    const filtered = messages.filter((item) => item.trim().length > 0);
    return filtered.length > 0 ? filtered : [""];
  }, [messages]);

  return (
    <div
      className={clsx(
        "relative  mx-auto bg-black/0 border-b border-zinc-800/20 overflow-hidden",
        "font-mono text-md leading-[1.65] text-lime-100",
        className
      )}
      style={{ height: heightPx }}
      aria-live="polite"
    >
      <div
        className="flex w-max items-center gap-8 whitespace-nowrap px-6 bg-black"
        style={{ animation: `ticker ${cycleMs}ms linear infinite` }}
      >
        {[...items, ...items].map((message, index) => (
          <span key={`${index}-${message}`} className="inline-flex items-center gap-3">
            {index > 0 && <span className="text-lime-300/70">•</span>}
            <span className=" bg-black p-4">{message}</span>
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

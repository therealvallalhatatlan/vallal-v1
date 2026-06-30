import React, { ReactNode } from "react";

interface TerminalBoxProps {
  children: ReactNode;
  title?: string;
  className?: string;
  background?: ReactNode;
}

export default function TerminalBox({
  children,
  title,
  className = "",
  background,
}: TerminalBoxProps) {
  return (
    <div
      className={`
        border-2 border-lime-100/60 bg-black/60 px-4 py-3 font-mono text-sm
        text-gray-200 backdrop-blur-sm relative overflow-hidden
        shadow-[0_0_20px_rgba(163,230,53,0.2)]
        ${className}
      `}
    >
      {background && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {background}
        </div>
      )}

      {/* Subtle CRT glow */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-lime-400/5 to-transparent opacity-30" />

      {/* Title bar if provided */}
      {title && (
        <div className="relative z-10 mb-2 border-b border-lime-400/30 pb-2 text-xs font-bold uppercase tracking-widest text-lime-400">
          [{title}]
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

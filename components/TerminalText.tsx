import React, { ReactNode } from "react";

interface TerminalTextProps {
  children: ReactNode;
  glitch?: boolean;
  className?: string;
}

export default function TerminalText({
  children,
  glitch = false,
  className = "",
}: TerminalTextProps) {
  return (
    <span
      className={`
        font-mono text-lime-400 
        ${
          glitch
            ? "animate-pulse"
            : "text-shadow-[0_0_10px_rgba(163,230,53,0.5)]"
        }
        ${className}
      `}
      style={{
        textShadow: glitch
          ? "0 0 5px rgba(163,230,53,0.3)"
          : "0 0 10px rgba(163,230,53,0.5), 0 0 20px rgba(163,230,53,0.2)",
      }}
    >
      {children}
    </span>
  );
}

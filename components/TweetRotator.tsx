"use client";

import * as React from "react";
import clsx from "clsx";

type Props = {
  messages: string[];       // 3-4 szöveg
  className?: string;       // doboz stílus
  typeMsPerChar?: number;   // gépelés seb.
  eraseMsPerChar?: number;  // törlés seb.
  holdAfterTypeMs?: number; // gépelés utáni szünet
  holdAfterEraseMs?: number;// törlés utáni szünet
  heightPx?: number;        // FIX magasság, hogy ne ugráljon
};

export default function TweetRotator({
  messages,
  className,
  typeMsPerChar = 28,
  eraseMsPerChar = 14,
  holdAfterTypeMs = 1100,
  holdAfterEraseMs = 350,
  heightPx = 84, // ~2-3 sor 13-14px-es monó betűvel
}: Props) {
  const [i, setI] = React.useState(0);       // melyik üzenet
  const [txt, setTxt] = React.useState("");  // épp megjelenő részlet
  const [typing, setTyping] = React.useState<"type"|"erase">("type");

  const msg = messages[i] ?? "";

  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typing === "type") {
      if (txt.length < msg.length) {
        t = setTimeout(() => setTxt(msg.slice(0, txt.length + 1)), typeMsPerChar);
      } else {
        t = setTimeout(() => setTyping("erase"), holdAfterTypeMs);
      }
    } else {
      if (txt.length > 0) {
        t = setTimeout(() => setTxt(msg.slice(0, txt.length - 1)), eraseMsPerChar);
      } else {
        t = setTimeout(() => {
          setI((prev) => (prev + 1) % messages.length);
          setTyping("type");
        }, holdAfterEraseMs);
      }
    }
    return () => clearTimeout(t);
  }, [txt, typing, msg, messages.length, typeMsPerChar, eraseMsPerChar, holdAfterTypeMs, holdAfterEraseMs]);

  return (
    <div
      className={clsx(
        "relative px-6 max-w-3xl mx-auto rounded-3xl bg-black/0 py-8 border border-lime-400/30",
        "font-mono text-md leading-[1.35] text-lime-200",
        className
      )}
      style={{ height: heightPx }}
      aria-live="polite"
    >
      <span className="opacity-60">Válalhatatlan Latest › </span>
      <span className="align-top whitespace-pre-wrap break-words italic">{txt}</span>
      <span className="ml-1 inline-block animate-[blink_1s_steps(1,end)_infinite]">▌</span>

      <style jsx>{`
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

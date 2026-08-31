"use client";

import { useEffect, useState } from "react";

export default function UnknownNodePage() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setTick(1), 900);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-16 font-mono text-lime-100">
      <div className="mx-auto max-w-3xl border border-lime-100/20 bg-black p-6 shadow-[0_0_40px_rgba(132,204,22,0.05)]">
        <div className="mb-8 text-xs uppercase tracking-[0.2em] text-lime-100/40">
          VÁLLALHATATLAN / UNKNOWN NODE
        </div>

        <pre className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
{`404\n\nNODE NOT FOUND.\n\nOR MAYBE:\n\nNODE REMOVED.\n\nOR MAYBE:\n\nNODE WAS NEVER SUPPOSED TO EXIST.`}
        </pre>

        <div className="mt-10 border-t border-zinc-900 pt-6 text-sm leading-7 text-zinc-500">
          <p>ACCESS VECTOR: DISCOVERY</p>
          <p>NODE: 07</p>
          <p>STATUS: {tick ? "LISTENING" : "CONNECTING..."}</p>
        </div>

        {tick > 0 && (
          <div className="mt-8 text-xs uppercase tracking-[0.18em] text-lime-100/70">
            <p>you found a door.</p>
            <p>now find what it opens.</p>
          </div>
        )}

        <div className="mt-12 text-[10px] uppercase tracking-[0.16em] text-zinc-700">
          NODE 07 // DO NOT INDEX // STILL RUNNING
        </div>
      </div>
    </main>
  );
}

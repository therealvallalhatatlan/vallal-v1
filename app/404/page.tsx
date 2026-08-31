"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 font-mono text-zinc-300">
      <div className="mx-auto max-w-2xl">
        <div className="text-[10px] uppercase tracking-[0.2em] text-lime-100/40">
          VÁLLALHATATLAN / NODE ERROR
        </div>

        <h1 className="mt-8 text-7xl font-bold tracking-tight text-zinc-100">404</h1>

        <pre className="mt-8 whitespace-pre-wrap text-sm leading-7 text-zinc-500">
{`NODE NOT FOUND.\n\nOR MAYBE:\n\nNODE REMOVED.\n\nOR MAYBE:\n\nNODE WAS NEVER SUPPOSED TO EXIST.`}
        </pre>

        <div className="mt-10 border-l border-lime-100/20 pl-4 text-xs uppercase tracking-[0.14em] text-zinc-600">
          TRY LOOKING SOMEWHERE ELSE.
          <br />
          /unknown
          <br />
          /lab
          <br />
          /halozat
        </div>

        <Link
          href="/"
          className="mt-12 inline-block border border-zinc-800 px-4 py-3 text-xs uppercase tracking-[0.16em] text-lime-100/70 transition hover:border-lime-100/40 hover:text-lime-100"
        >
          return to surface
        </Link>
      </div>
    </main>
  );
}

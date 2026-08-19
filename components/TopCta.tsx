import Link from "next/link";
import React from "react";

export default function TopCta() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-6 mb-8 px-4">
      <div className="rounded-xl bg-lime-500/0 backdrop-blur-md border border-zinc-700/40 p-6 flex items-center justify-between gap-4">
        <h2 className="text-white text-sm font-semibold tracking-tight">Vállalhatatlan MikroFilm Intézet</h2>
        <Link href="/vmfi" className="inline-flex items-center px-5 py-2 bg-lime-500 text-black font-semibold rounded-lg shadow-md hover:bg-lime-400 transition">
          Jelentkezem
        </Link>
      </div>
    </div>
  );
}

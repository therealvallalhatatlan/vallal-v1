// app/reader-access/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReaderAccessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-neutral-400">Betöltés…</div>}>
      <ReaderAccessInner />
    </Suspense>
  );
}

function ReaderAccessInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const redirectTarget = sp?.get("redirect") || "/reader";

  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const required = process.env.NEXT_PUBLIC_READER_ACCESS_PASSWORD || "telikabat2000";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.trim() === required) {
      // set cookie
      document.cookie = `reader_session=granted; path=/; SameSite=Lax; ${
        process.env.NODE_ENV === "production" ? "Secure;" : ""
      } max-age=${60 * 60 * 24 * 30}`;
      router.push(redirectTarget);
    } else {
      setErr("Hibás jelszó.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 p-6"
      >
        <h1 className="text-xl font-semibold">Reader belépés</h1>
        <p className="text-xs text-neutral-500">
          Add meg a hozzáférési jelszót a novellák olvasásához.
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-black border border-neutral-700 text-sm text-neutral-100 outline-none focus:border-neutral-300"
          placeholder="jelszó…"
          autoFocus
        />
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-neutral-100 text-black text-sm font-medium px-4 py-2 hover:bg-neutral-200 transition"
        >
          Belépek
        </button>
      </form>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";

const supabase = createClient();

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Link ellenőrzése...");

  useEffect(() => {
    const handleExchange = async () => {
      if (!searchParams) {
        setMessage("Hiányzó paraméterek. Kérlek kérj új magic linket.");
        return;
      }

      const code = searchParams.get("code");
      const next = searchParams.get("next") || "/reader";
      // If we already have a session, skip code handling and just redirect.
      const existing = await supabase.auth.getSession();
      if (existing?.data?.session) {
        setMessage("Már be vagy jelentkezve, irány a /reader...");
        router.replace(next);
        return;
      }

      if (!code) {
        setMessage("Hiányzó kód. Kérlek kérj új magic linket.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(`Hiba: ${error.message}`);
        return;
      }

      setMessage("Sikeres belépés, irány a /reader...");
      router.replace(next);
    };

    handleExchange();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-black text-neutral-100 px-6 py-10">
      <section className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">belépés</p>
          <h1 className="text-3xl font-semibold text-lime-400">Magic link feldolgozása</h1>
          <p className="mt-4 text-sm text-neutral-300">{message}</p>
        </div>
      </section>
    </main>
  );
}

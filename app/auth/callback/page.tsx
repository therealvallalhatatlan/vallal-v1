"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";
import { clearStoredAuthReturnTarget, readStoredAuthReturnTarget, resolveAuthReturnTarget } from "@/lib/authRedirect";

const supabase = createClient();

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <StatusView message="Magic link feldolgozása..." />
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Link ellenőrzése...");

  useEffect(() => {
    const handleExchange = async () => {
      if (!searchParams) {
        const existing = await supabase.auth.getSession();
        if (existing?.data?.session) {
          clearStoredAuthReturnTarget();
          if (typeof window !== "undefined") {
            window.location.replace("/halozat");
          } else {
            router.replace("/halozat");
          }
          return;
        }
        setMessage("Hiányzó paraméterek. Kérlek kérj új magic linket.");
        return;
      }

      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");
      const storedNext = readStoredAuthReturnTarget();

      const next = resolveAuthReturnTarget({
        nextParam: searchParams.get("next"),
        fromParam: searchParams.get("from"),
        storedNext,
        fallback: "/halozat",
        currentOrigin: typeof window !== "undefined" ? window.location.origin : undefined,
      });

      // Some providers/SDK flows may already persist the session before this page runs.
      // In that case, avoid a second PKCE code exchange attempt.
      const preExisting = await supabase.auth.getSession();
      if (preExisting?.data?.session) {
        clearStoredAuthReturnTarget();
        setMessage(`Már be vagy jelentkezve, irány a ${next}...`);
        if (typeof window !== "undefined") {
          window.location.replace(next);
        } else {
          router.replace(next);
        }
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // Recovery path for duplicated/late exchange: continue if session is already available.
          const recovered = await supabase.auth.getSession();
          if (!recovered?.data?.session) {
            setMessage(`Hiba: ${error.message}`);
            return;
          }
        }
      } else if (tokenHash) {
        const otpCandidates = [otpType, "magiclink", "email"].filter(
          (value, index, arr): value is string => Boolean(value) && arr.indexOf(value) === index
        );

        let verified = false;
        let lastErrorMessage = "";

        for (const candidate of otpCandidates) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: candidate as "magiclink" | "email" | "signup" | "recovery" | "invite" | "email_change",
          });

          if (!error) {
            verified = true;
            break;
          }

          lastErrorMessage = error.message;
        }

        if (!verified) {
          setMessage(`Hiba: ${lastErrorMessage || "A magic link ellenőrzése sikertelen."}`);
          return;
        }
      } else {
        // If we already have a session and there is no auth code/hash, just continue.
        const existing = await supabase.auth.getSession();
        if (existing?.data?.session) {
          setMessage(`Már be vagy jelentkezve, irány a ${next}...`);
          clearStoredAuthReturnTarget();
          if (typeof window !== "undefined") {
            window.location.replace(next);
          } else {
            router.replace(next);
          }
          return;
        }

        // Fallback for implicit/hash redirects (e.g. #access_token=...)
        const hasHashToken = typeof window !== "undefined" && /access_token=|refresh_token=|error=/.test(window.location.hash || "");
        if (!hasHashToken) {
          setMessage("Hiányzó kód. Kérlek kérj új belépő linket.");
          return;
        }

        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) {
          setMessage(`Hiba: ${error.message}`);
          return;
        }
      }

      clearStoredAuthReturnTarget();

      setMessage(`Sikeres belépés, irány a ${next}...`);
      if (typeof window !== "undefined") {
        window.location.replace(next);
      } else {
        router.replace(next);
      }
    };

    handleExchange();
  }, [router, searchParams]);
  return <StatusView message={message} />;
}

function StatusView({ message }: { message: string }) {
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
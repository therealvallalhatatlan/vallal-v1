"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";

const supabase = createClient();
const VIDEO_SRC = "/videos/video3.mp4";

export default function AuthPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  return (
    <Suspense fallback={<AuthStatus message="Belépés betöltése..." />}> 
      <AuthContent videoRef={videoRef} />
    </Suspense>
  );
}

function AuthContent({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const next = searchParams?.get("from") || "/reader";

  const handleGoogleSignIn = async () => {
    setStatus(null);
    setError(null);
    setOauthLoading(true);
    try {
      try {
        window.sessionStorage.setItem("vallal_auth_next", next);
        window.localStorage.setItem("vallal_auth_next", next);
      } catch {
        // ignore
      }
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) {
        setError(error.message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setError(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setError(error.message);
      setStatus(null);
    } else {
      setStatus("Küldtünk egy magic linket az email címedre. Nézd meg a postaládád!");
    }

    setLoading(false);
  };

  return (
    <AuthStatus
      message={status ?? ""}
      error={error ?? ""}
      videoRef={videoRef}
      showPurchaseCTA={next === "/reader"}
      renderForm={({ setMessage }) => (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm text-neutral-300">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-lime-400 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
          >
            {loading ? "Küldés..." : "Link Küldése"}
          </button>

          <div className="flex items-center gap-3 pt-2">
            <div className="h-px flex-1 bg-neutral-800" />
            <span className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">
              vagy
            </span>
            <div className="h-px flex-1 bg-neutral-800" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || oauthLoading}
            className="inline-flex w-full items-center justify-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {oauthLoading ? "Google belépés…" : "Belépés Google-lel"}
          </button>
        </form>
      )}
    />
  );
}

function AuthStatus({
  message,
  error,
  videoRef,
  renderForm,
  showPurchaseCTA,
}: {
  message?: string;
  error?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  renderForm?: ({ setMessage }: { setMessage: (val: string) => void }) => React.ReactNode;
  showPurchaseCTA?: boolean;
}) {
  return (
    <main className="relative min-h-screen text-neutral-100 overflow-hidden">
      {/* VIDEO */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        src={VIDEO_SRC}
      />

      {/* DARKEN */}
      <div className="absolute inset-0 bg-black/60" />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        <section className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">Zárt Közösség</p>
          <h1 className="text-3xl font-semibold text-lime-400">Belépés Csak Klubtagoknak</h1>
          <p className="mt-2 text-sm text-neutral-300">
            Add meg az email címet amivel vásároltál, és küldök egy belépő linket.<br/>Ha más email címet használnál, írj nekem:{" "}
            <a href="mailto:therealvallalhatatlan@gmail.com" className="text-lime-400 hover:text-lime-300">
              therealvallalhatatlan@gmail.com
            </a>
          </p>

          {renderForm?.({ setMessage: () => {} })}

          {message && <p className="mt-4 text-sm text-lime-300">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        {showPurchaseCTA && (
          <div className="mt-6 rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <a
              href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-400"
            >
              Alkalmazás megvásárlása
            </a>
          </div>
        )}
      </section>
      </div>

    </main>
  );
}
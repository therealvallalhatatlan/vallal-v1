"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";
import { persistAuthReturnTarget, resolveAuthReturnTarget } from "@/lib/authRedirect";

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

  const next = (() => {
    const fallback = "/halozat";
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
    return resolveAuthReturnTarget({
      nextParam: searchParams?.get("next"),
      fromParam: searchParams?.get("from"),
      fallback,
      currentOrigin,
    });
  })();

  const handleGoogleSignIn = async () => {
    setStatus(null);
    setError(null);
    setOauthLoading(true);
    try {
      // Ensure OAuth can switch accounts instead of silently reusing an existing local session.
      await supabase.auth.signOut();

      persistAuthReturnTarget(next);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
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

    persistAuthReturnTarget(next);

    const redirectTo = `${window.location.origin}/auth/callback`;
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
            Emailcímed
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-none border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-lime-400 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-none border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400 disabled:opacity-60"
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
            className="inline-flex w-full items-center justify-center rounded-none border border-lime-500/60 bg-neutral-900 px-5 py-4 text-base font-semibold text-neutral-50 shadow-[0_0_22px_rgba(132,204,22,0.16)] transition hover:border-lime-400 hover:bg-neutral-800 hover:shadow-[0_0_28px_rgba(132,204,22,0.24)] disabled:opacity-60"
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

      <div aria-hidden className="auth-vhs-overlay absolute inset-0 z-[1] overflow-hidden">
        <div className="auth-vhs-noise absolute inset-0 opacity-20" />
        <div className="auth-vhs-scanline absolute inset-0 opacity-25" />
        <div className="auth-vhs-glitch-band absolute inset-x-0 top-0 h-24 opacity-0" />
        <div className="auth-vhs-glitch-band auth-vhs-glitch-band-delay absolute inset-x-0 top-0 h-16 opacity-0" />
      </div>

      {/* DARKEN */}
      <div className="absolute inset-0 bg-black/60" />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        <section className="mx-auto w-full max-w-lg">
        <div className="rounded-none border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">Zárt Közösség</p>
          <h1 className="text-3xl font-semibold text-lime-400">Azonosítás</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-300">
            Erre azért van szükség, hogy védjük magunkat a botoktól, és az illetéktelen szemektől. Ha nem férsz hozzá írj a:{" "}
            <a href="mailto:therealvallalhatatlan@gmail.com" className="text-lime-400 hover:text-lime-300">
              therealvallalhatatlan@gmail.com
            </a>
          </p>

          {renderForm?.({ setMessage: () => {} })}

          {message && <p className="mt-4 text-sm text-lime-300">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        {showPurchaseCTA && (
          <div className="mt-6 rounded-none border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <a
              href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-none bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-400"
            >
              Alkalmazás megvásárlása
            </a>
          </div>
        )}
      </section>
      </div>

      <style jsx>{`
        .auth-vhs-overlay {
          mix-blend-mode: screen;
        }

        .auth-vhs-noise {
          background-image:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08) 0, transparent 28%),
            radial-gradient(circle at 80% 30%, rgba(132, 204, 22, 0.08) 0, transparent 24%),
            radial-gradient(circle at 50% 80%, rgba(255, 255, 255, 0.05) 0, transparent 26%);
          animation: authNoiseShift 220ms steps(2, end) infinite;
        }

        .auth-vhs-scanline {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.045) 0,
            rgba(255, 255, 255, 0.045) 1px,
            transparent 1px,
            transparent 4px
          );
          animation: authScanDrift 8s linear infinite;
        }

        .auth-vhs-glitch-band {
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(255, 255, 255, 0.12) 30%,
            rgba(132, 204, 22, 0.18) 50%,
            rgba(255, 255, 255, 0.08) 70%,
            transparent 100%
          );
          filter: blur(0.6px);
          animation: authGlitchSweep 9s linear infinite;
        }

        .auth-vhs-glitch-band-delay {
          animation-duration: 13s;
          animation-delay: 3.2s;
        }

        @keyframes authNoiseShift {
          0% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(-1%, 0.5%, 0); }
          50% { transform: translate3d(1%, -0.5%, 0); }
          75% { transform: translate3d(-0.5%, 1%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes authScanDrift {
          0% { transform: translateY(-6%); }
          100% { transform: translateY(6%); }
        }

        @keyframes authGlitchSweep {
          0%, 76%, 100% {
            transform: translate3d(0, -22vh, 0) scaleX(1);
            opacity: 0;
          }
          78% {
            transform: translate3d(-1.2%, 18vh, 0) scaleX(1.01);
            opacity: 0.85;
          }
          79% {
            transform: translate3d(1.6%, 26vh, 0) scaleX(0.99);
            opacity: 0.28;
          }
          80% {
            transform: translate3d(-0.8%, 37vh, 0) scaleX(1.02);
            opacity: 0.75;
          }
          82% {
            transform: translate3d(0.4%, 52vh, 0) scaleX(1);
            opacity: 0;
          }
        }
      `}</style>

    </main>
  );
}
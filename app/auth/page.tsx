"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";
import { persistAuthReturnTarget, resolveAuthReturnTarget } from "@/lib/authRedirect";

const supabase = createClient();
const VIDEO_SRC = "/videos/film2.mp4";

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

  const handleFacebookSignIn = async () => {
    setStatus(null);
    setError(null);
    setOauthLoading(true);
    try {
      // Use the same auth/callback flow as the existing Google Login.
      await supabase.auth.signOut();

      persistAuthReturnTarget(next);
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo,
        },
      });
      if (error) {
        setError(error.message);
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const autoGoogleStarted = useRef(false);
  const autoFacebookStarted = useRef(false);

  useEffect(() => {
    const provider = searchParams?.get("provider");

    if (provider === "google" && !autoGoogleStarted.current) {
      autoGoogleStarted.current = true;
      void handleGoogleSignIn();
      return;
    }

    if (provider === "facebook" && !autoFacebookStarted.current) {
      autoFacebookStarted.current = true;
      void handleFacebookSignIn();
    }
  }, [searchParams]);

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
      setStatus("Okés. Küldtem egy belépő linket az email címedre.");
    }

    setLoading(false);
  };

  return (
    <AuthStatus
      message={status ?? ""}
      error={error ?? ""}
      videoRef={videoRef}
      showPurchaseCTA={next === "/reader"}
      renderForm={() => (
        <div className="w-full max-w-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 text-[9px] uppercase tracking-[0.22em] text-lime-200/55" style={{ fontFamily: "var(--font-mono-tech)" }}><span>VALLALHATATLAN // AUTH</span><span>NODE 07</span></div>
          <div className="overflow-hidden border border-white/15 bg-black/55 shadow-[0_28px_100px_rgba(0,0,0,0.48)] backdrop-blur-md">
            <div className="p-6 sm:p-9">
              <div className="flex items-start justify-between gap-5"><div><p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-lime-300/80" style={{ fontFamily: "var(--font-mono-tech)" }}>BELÉPÉSI PONT</p><h1 className="font-normal text-[clamp(42px,8vw,78px)] leading-[0.88] tracking-[-0.045em] text-white" style={{ fontFamily: "var(--font-heading)" }}>Találkozunk<br />odabent.</h1></div><div className="hidden h-[72px] w-[72px] shrink-0 flex-col justify-between border border-lime-200/20 p-2 text-lime-100/60 sm:flex" style={{ fontFamily: "var(--font-mono-tech)" }}><span className="text-[8px] uppercase tracking-[0.18em]">ACCESS</span><span className="self-end text-3xl leading-none" style={{ fontFamily: "var(--font-hero)" }}>V</span></div></div>
              <div className="my-7 h-px bg-gradient-to-r from-lime-300/35 via-white/10 to-transparent" />
              <div className="mb-2 text-[9px] uppercase tracking-[0.18em] text-white/35" style={{ fontFamily: "var(--font-mono-tech)" }}>GYORS BELÉPÉS</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleFacebookSignIn} disabled={loading || oauthLoading} className="group min-h-[86px] border border-white/12 bg-black/35 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200/40 hover:bg-blue-300/5 disabled:cursor-wait disabled:opacity-55"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center border border-blue-300/35 text-xl text-blue-200">f</span><span className="min-w-0"><span className="block text-[8px] uppercase tracking-[0.15em] text-white/30" style={{ fontFamily: "var(--font-mono-tech)" }}>META / IDENTITY</span><span className="mt-1 block truncate text-[13px] text-white/90" style={{ fontFamily: "var(--font-mono-tech)" }}>{oauthLoading === "facebook" ? "KAPCSOLÓDÁS..." : "Belépés Facebookkal"}</span></span><span className="ml-auto text-lg text-white/35">↗</span></div></button>
                <button type="button" onClick={handleGoogleSignIn} disabled={loading || oauthLoading} className="group min-h-[86px] border border-white/12 bg-black/35 p-4 text-left transition hover:-translate-y-0.5 hover:border-lime-200/45 hover:bg-lime-300/5 disabled:cursor-wait disabled:opacity-55"><div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center border border-lime-200/25 text-lg text-lime-100">G</span><span className="min-w-0"><span className="block text-[8px] uppercase tracking-[0.15em] text-white/30" style={{ fontFamily: "var(--font-mono-tech)" }}>GOOGLE / IDENTITY</span><span className="mt-1 block truncate text-[13px] text-white/90" style={{ fontFamily: "var(--font-mono-tech)" }}>{oauthLoading === "google" ? "KAPCSOLÓDÁS..." : "Belépés Google-fiókkal"}</span></span><span className="ml-auto text-lg text-white/35">↗</span></div></button>
              </div>
              <div className="my-6 flex items-center gap-3 text-[9px] uppercase tracking-[0.16em] text-white/30" style={{ fontFamily: "var(--font-mono-tech)" }}><span className="h-px flex-1 bg-white/10" /><span>vagy belépés emaillel</span><span className="h-px flex-1 bg-white/10" /></div>
              <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[1fr_230px]"><label htmlFor="auth-email" className="sr-only">Emailcímed</label><div className="flex min-h-[58px] items-center border border-white/12 bg-black/30 focus-within:border-lime-300/45"><span className="pl-4 font-mono text-lime-200/45">@</span><input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/25" placeholder="email címed" autoComplete="email" /></div><button type="submit" disabled={loading || oauthLoading} className="flex min-h-[58px] items-center justify-between border border-lime-300/55 bg-lime-300 px-4 text-[10px] font-bold tracking-[0.12em] text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-55" style={{ fontFamily: "var(--font-mono-tech)" }}><span>{loading ? "LINK KÉSZÜL..." : "BELÉPŐ LINK KÜLDÉSE"}</span><span aria-hidden>↗</span></button></form>
              <div className="mt-5 flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[9px] leading-relaxed text-white/35" style={{ fontFamily: "var(--font-mono-tech)" }}>Problémád van? Írj ide:{" "}<a href="mailto:therealvallalhatatlan@gmail.com" className="text-lime-200/75 underline underline-offset-3 hover:text-white">therealvallalhatatlan@gmail.com</a></p><span className="text-[8px] uppercase tracking-[0.18em] text-lime-200/45" style={{ fontFamily: "var(--font-mono-tech)" }}>● ONLINE</span></div>
              {message && <div className="mt-3 border border-lime-300/15 bg-lime-300/5 p-3 text-[10px] text-lime-100" style={{ fontFamily: "var(--font-mono-tech)" }}>{message}</div>}
              {error && <div className="mt-3 border border-red-400/20 bg-red-400/5 p-3 text-[10px] text-red-300" style={{ fontFamily: "var(--font-mono-tech)" }}>{error}</div>}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-[8px] uppercase tracking-[0.18em] text-white/20" style={{ fontFamily: "var(--font-mono-tech)" }}><span>NO PASSWORDS / NO NOISE</span><span>PRIVATE NODE // V.01</span></div>
        </div>
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
      <div className="relative z-10 min-h-screen flex items-center justify-center px-0 py-6">
        <section className="mx-auto w-full max-w-lg">
        <div className="rounded-none border-0 bg-transparent p-6 shadow-none backdrop-blur-0">
          <p 
          className="text-[14px] uppercase tracking-[0.25em] text-lime-100/100 mb-4"
          style={{ fontFamily: "var(--font-mono-tech)" }}
          >Zárt Közösség</p>
          <h1 className="text-3xl font-semibold text-lime-100" style={{ fontFamily: "var(--font-mono-tech)" }}>Azonosítás szükséges</h1>
          <p className="mt-2 text-[13px] italic leading-relaxed text-neutral-300">
            Erre azért van szükség, hogy védjük magunkat a botoktól, és az illetéktelen szemektől. Ha nem férsz hozzá írj a:{" "}
            <a href="mailto:therealvallalhatatlan@gmail.com" className="text-lime-100 hover:text-lime-300">
              therealvallalhatatlan@gmail.com
            </a>
          </p>

          {renderForm?.({ setMessage: () => {} })}

          {message && <p className="mt-4 text-sm text-lime-300">{message}</p>}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        {showPurchaseCTA && (
          <div className="mt-6 rounded-none border-0 bg-transparent p-6 shadow-none backdrop-blur-0">
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
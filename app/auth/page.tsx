"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Montserrat } from "next/font/google";
import { createClient } from "@/lib/browser";
import {
  persistAuthReturnTarget,
  resolveAuthReturnTarget,
} from "@/lib/authRedirect";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-auth",
});

const supabase = createClient();
const VIDEO_SRC = "/videos/film2.mp4";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100svh] bg-black" />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoProviderStarted = useRef(false);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"facebook" | "google" | "">("");

  const next = resolveAuthReturnTarget({
    nextParam: searchParams.get("next"),
    fromParam: searchParams.get("from"),
    fallback: "/halozat",
    currentOrigin:
      typeof window !== "undefined" ? window.location.origin : undefined,
  });

  const signInWithProvider = async (provider: "facebook" | "google") => {
    setMessage("");
    setError("");
    setOauthLoading(provider);

    try {
      await supabase.auth.signOut();
      persistAuthReturnTarget(next);

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          ...(provider === "google"
            ? {
                queryParams: {
                  prompt: "select_account",
                },
              }
            : {}),
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "A belépés nem sikerült.");
      setOauthLoading("");
    }
  };

  useEffect(() => {
    const provider = searchParams.get("provider");

    if (
      (provider === "facebook" || provider === "google") &&
      !autoProviderStarted.current
    ) {
      autoProviderStarted.current = true;
      void signInWithProvider(provider);
    }
  }, [searchParams]);

  const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setEmailLoading(true);

    try {
      persistAuthReturnTarget(next);

      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMessage("Okés. Küldtem egy belépő linket az email címedre.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "A belépő link küldése nem sikerült."
      );
    } finally {
      setEmailLoading(false);
    }
  };

  const busy = emailLoading || Boolean(oauthLoading);

  return (
    <main className={`relative min-h-[100svh] overflow-hidden bg-black text-white ${montserrat.variable}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        src={VIDEO_SRC}
      />

      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,0,0,0.08),rgba(0,0,0,0.7)_78%)]" />

      <div className="relative z-10 flex min-h-[100svh] items-end justify-center px-5 py-8">
        <section className="w-full max-w-[540px]">
          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => void signInWithProvider("facebook")}
              disabled={busy}
              className="flex min-h-[72px] w-full items-center justify-center gap-4 rounded-[14px] bg-[#1877F2] px-6 text-[18px] font-semibold text-zinc-100 shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition duration-200 hover:scale-[1.01] hover:bg-[#2281fc] disabled:cursor-wait disabled:opacity-55 sm:min-h-[80px] sm:text-[20px]"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              <FacebookLogo />
              <span>
                {oauthLoading === "facebook"
                  ? "Kapcsolódás..."
                  : "Belépés Facebookkal"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void signInWithProvider("google")}
              disabled={busy}
              className="flex min-h-[72px] w-full items-center justify-center gap-4 rounded-[14px] bg-zinc-900 px-6 text-[18px] font-semibold text-zinc-100 shadow-[0_18px_55px_rgba(0,0,0,0.22)] transition duration-200 hover:scale-[1.01] hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-55 sm:min-h-[80px] sm:text-[20px]"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              <GoogleLogo />
              <span>
                {oauthLoading === "google"
                  ? "Kapcsolódás..."
                  : "Belépés Google-fiókkal"}
              </span>
            </button>
          </div>

          <div className="my-7 flex items-center gap-4 text-white/35">
            <span className="h-px flex-1 bg-white/15" />
            <span
              className="text-[11px] uppercase tracking-[0.16em]"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              vagy emaillel
            </span>
            <span className="h-px flex-1 bg-white/15" />
          </div>

          <form
            onSubmit={handleEmailLogin}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="auth-email" className="sr-only">
              Emailcímed
            </label>

            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email címed"
              autoComplete="email"
              className="min-h-[56px] flex-1 border border-zinc-700 rounded-[14px] bg-black/45 px-5 text-[15px] text-white outline-none placeholder:text-white/35 backdrop-blur-md focus:bg-black/55"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            />

            <button
              type="submit"
              disabled={busy}
              className="min-h-[56px] rounded-[14px] bg-white/14 px-6 text-[13px] font-semibold tracking-[0.03em] text-white/82 backdrop-blur-md transition hover:bg-white/20 hover:text-white disabled:cursor-wait disabled:opacity-45"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              {emailLoading ? "Küldés..." : "Belépő link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p
              className="text-[12px] text-white/55"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              Problémád van? Írj ide:{" "}
              <a
                href="mailto:therealvallalhatatlan@gmail.com"
                className="text-white/80 underline underline-offset-4 transition hover:text-white"
              >
                therealvallalhatatlan@gmail.com
              </a>
            </p>
          </div>

          {message ? (
            <div
              className="mt-4 text-center text-sm text-lime-200"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              {message}
            </div>
          ) : null}

          {error ? (
            <div
              className="mt-4 text-center text-sm text-red-300"
              style={{ fontFamily: "var(--font-auth), Montserrat, sans-serif" }}
            >
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function FacebookLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M13.65 22v-8.22h2.76l.41-3.2h-3.17V8.54c0-.93.26-1.57 1.6-1.57h1.71V4.1c-.3-.04-1.34-.1-2.55-.1-2.52 0-4.25 1.54-4.25 4.37v2.21H7.3v3.2h2.87V22h3.48Z"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg
      viewBox="0 0 48 48"
      width="30"
      height="30"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 5.98 1.53 7.36 2.81l5.38-5.25C33.45 4.13 29.1 2.5 24 2.5 14.61 2.5 6.58 7.88 2.76 15.72l6.25 4.85C10.89 14.01 16.93 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M45.5 24.5c0-1.56-.14-2.68-.44-3.85H24v7.3h12.36c-.25 1.82-1.6 4.56-4.62 6.4l6.17 4.79c3.6-3.32 7.59-8.16 7.59-14.64Z"
      />
      <path
        fill="#FBBC05"
        d="M9.01 29.57A14.57 14.57 0 0 1 8.2 24c0-1.93.32-3.8.76-5.5l-6.2-4.83A22.83 22.83 0 0 0 1.5 24c0 3.7.89 7.22 2.6 10.33l6.2-4.76Z"
      />
      <path
        fill="#34A853"
        d="M24 45.5c6.36 0 11.7-2.08 15.6-5.67l-6.17-4.79c-1.68 1.15-4.02 1.96-7.43 1.96-6.94 0-12.96-4.58-15.1-10.93l-6.2 4.76C8.58 39.62 15.5 45.5 24 45.5Z"
      />
    </svg>
  );
}

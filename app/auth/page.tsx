"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/browser";
import {
  persistAuthReturnTarget,
  resolveAuthReturnTarget,
} from "@/lib/authRedirect";

const supabase = createClient();
const VIDEO_SRC = "/videos/film2.mp4";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"facebook" | "google" | "">("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoProviderStarted = useRef(false);

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
      setError(err instanceof Error ? err.message : "A belépő link küldése nem sikerült.");
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        src={VIDEO_SRC}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.12),rgba(0,0,0,0.78)_72%),linear-gradient(180deg,rgba(0,0,0,0.42),rgba(0,0,0,0.86))]" />
      <div className="pointer-events-none absolute inset-0 opacity-15 [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_5px)]" />

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-3 font-mono text-[9px] uppercase tracking-[0.2em] text-lime-200/55">
            <span>VALLALHATATLAN // AUTH</span>
            <span>NODE 07</span>
          </div>

          <section className="overflow-hidden border border-white/15 bg-black/55 shadow-[0_30px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="grid md:grid-cols-[90px_1fr]">
              <aside className="hidden border-r border-white/10 bg-black/20 md:flex md:flex-col md:items-center md:justify-between md:p-4">
                <div className="grid h-11 w-11 place-items-center border border-lime-200/40 font-bold text-2xl text-lime-100">
                  V
                </div>
                <div className="w-px flex-1 bg-gradient-to-b from-lime-200/20 to-transparent" />
                <span className="[writing-mode:vertical-rl] rotate-180 font-mono text-[8px] uppercase tracking-[0.28em] text-white/25">
                  Zárt közösség
                </span>
              </aside>

              <div className="p-6 sm:p-10">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-lime-300/75">
                      BELÉPÉSI PONT
                    </div>
                    <h1 className="font-serif text-[clamp(42px,8vw,78px)] font-normal leading-[0.88] tracking-[-0.045em]">
                      Találkozunk
                      <br />
                      odabent.
                    </h1>
                  </div>

                  <div className="hidden h-16 w-16 shrink-0 flex-col justify-between border border-lime-200/20 p-2 font-mono text-lime-100/60 sm:flex">
                    <span className="text-[8px] uppercase tracking-[0.18em]">
                      ACCESS
                    </span>
                    <span className="self-end text-2xl">V</span>
                  </div>
                </div>

                <div className="my-7 h-px bg-gradient-to-r from-lime-300/35 via-white/10 to-transparent" />

                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                  GYORS BELÉPÉS
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void signInWithProvider("facebook")}
                    disabled={emailLoading || Boolean(oauthLoading)}
                    className="group min-h-[86px] border border-white/12 bg-black/35 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-blue-200/40 hover:bg-blue-300/5 disabled:cursor-wait disabled:opacity-55"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center border border-blue-300/35 font-bold text-xl text-blue-200">
                        f
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">
                          META / IDENTITY
                        </span>
                        <span className="mt-1 block truncate font-mono text-[13px] text-white/90">
                          {oauthLoading === "facebook"
                            ? "KAPCSOLÓDÁS..."
                            : "Belépés Facebookkal"}
                        </span>
                      </span>
                      <span className="ml-auto text-lg text-white/30 transition group-hover:text-blue-200">
                        ↗
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => void signInWithProvider("google")}
                    disabled={emailLoading || Boolean(oauthLoading)}
                    className="group min-h-[86px] border border-white/12 bg-black/35 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-lime-200/40 hover:bg-lime-300/5 disabled:cursor-wait disabled:opacity-55"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center border border-lime-200/25 font-bold text-lg text-lime-100">
                        G
                      </span>
                      <span className="min-w-0">
                        <span className="block font-mono text-[8px] uppercase tracking-[0.15em] text-white/30">
                          GOOGLE / IDENTITY
                        </span>
                        <span className="mt-1 block truncate font-mono text-[13px] text-white/90">
                          {oauthLoading === "google"
                            ? "KAPCSOLÓDÁS..."
                            : "Belépés Google-fiókkal"}
                        </span>
                      </span>
                      <span className="ml-auto text-lg text-white/30 transition group-hover:text-lime-200">
                        ↗
                      </span>
                    </div>
                  </button>
                </div>

                <div className="my-6 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
                  <span className="h-px flex-1 bg-white/10" />
                  <span>vagy belépés emaillel</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <form
                  onSubmit={handleEmailLogin}
                  className="grid gap-2 sm:grid-cols-[1fr_230px]"
                >
                  <label htmlFor="auth-email" className="sr-only">
                    Emailcímed
                  </label>

                  <div className="flex min-h-[58px] items-center border border-white/12 bg-black/30 focus-within:border-lime-300/45">
                    <span className="pl-4 font-mono text-lime-200/45">@</span>
                    <input
                      id="auth-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="email címed"
                      autoComplete="email"
                      className="w-full border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-white/25"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={emailLoading || Boolean(oauthLoading)}
                    className="flex min-h-[58px] items-center justify-between border border-lime-300/55 bg-lime-300 px-4 font-mono text-[10px] font-bold tracking-[0.12em] text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-55"
                  >
                    <span>
                      {emailLoading ? "LINK KÉSZÜL..." : "BELÉPŐ LINK KÜLDÉSE"}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </button>
                </form>

                <div className="mt-5 flex flex-col gap-2 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-[9px] leading-relaxed text-white/35">
                    Problémád van? Írj ide:{" "}
                    <a
                      href="mailto:therealvallalhatatlan@gmail.com"
                      className="text-lime-200/75 underline underline-offset-3 hover:text-white"
                    >
                      therealvallalhatatlan@gmail.com
                    </a>
                  </p>

                  <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-lime-200/45">
                    ● ONLINE
                  </span>
                </div>

                {message ? (
                  <div className="mt-3 border border-lime-300/15 bg-lime-300/5 p-3 font-mono text-[10px] leading-relaxed text-lime-100">
                    {message}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-3 border border-red-400/20 bg-red-400/5 p-3 font-mono text-[10px] leading-relaxed text-red-300">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <div className="mt-3 flex items-center justify-between px-1 font-mono text-[8px] uppercase tracking-[0.18em] text-white/20">
            <span>NO PASSWORDS / NO NOISE</span>
            <span>PRIVATE NODE // V.01</span>
          </div>
        </div>
      </div>

      {next === "/reader" ? (
        <div className="fixed inset-x-4 bottom-4 z-20 sm:inset-x-auto sm:right-6">
          <a
            href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 border border-lime-300/35 bg-black/70 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-lime-200 backdrop-blur-md"
          >
            Alkalmazás megvásárlása <span aria-hidden="true">↗</span>
          </a>
        </div>
      ) : null}
    </main>
  );
}

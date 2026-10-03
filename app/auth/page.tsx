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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <Suspense fallback={<AuthStatus message="Belépés betöltése..." />}>
      <AuthContent videoRef={videoRef} />
    </Suspense>
  );
}

function AuthContent({
  videoRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const next = (() => {
    const fallback = "/halozat";
    const currentOrigin =
      typeof window !== "undefined" ? window.location.origin : undefined;

    return resolveAuthReturnTarget({
      nextParam: searchParams?.get("next"),
      fromParam: searchParams?.get("from"),
      fallback,
      currentOrigin,
    });
  })();

  const runOAuth = async (provider: "google" | "facebook") => {
    setStatus(null);
    setError(null);
    setOauthLoading(provider);

    try {
      await supabase.auth.signOut();
      persistAuthReturnTarget(next);

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
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

      if (error) {
        setError(error.message);
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const autoProviderStarted = useRef(false);

  useEffect(() => {
    const provider = searchParams?.get("provider");

    if (
      (provider === "google" || provider === "facebook") &&
      !autoProviderStarted.current
    ) {
      autoProviderStarted.current = true;
      void runOAuth(provider);
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
        <div className="auth-shell">
          <div className="auth-topline">
            <span>VALLALHATATLAN.ONLINE</span>
            <span>AUTH // 01</span>
          </div>

          <div className="auth-grid">
            <aside className="auth-rail" aria-hidden="true">
              <div className="auth-rail-mark">V</div>
              <div className="auth-rail-line" />
              <div className="auth-rail-text">ZÁRT KÖZÖSSÉG</div>
            </aside>

            <section className="auth-card">
              <div className="auth-card-head">
                <div>
                  <p className="auth-kicker">BELÉPÉSI PONT</p>
                  <h1>
                    Találkozunk
                    <br />
                    odabent.
                  </h1>
                </div>

                <div className="auth-stamp">
                  <span>ACCESS</span>
                  <strong>V</strong>
                </div>
              </div>

              <div className="auth-rule" />

              <div className="auth-oauth-stack">
                <OAuthButton
                  provider="facebook"
                  label="Belépés Facebookkal"
                  loading={oauthLoading === "facebook"}
                  disabled={loading || Boolean(oauthLoading)}
                  onClick={() => void runOAuth("facebook")}
                />

                <OAuthButton
                  provider="google"
                  label="Belépés Google-fiókkal"
                  loading={oauthLoading === "google"}
                  disabled={loading || Boolean(oauthLoading)}
                  onClick={() => void runOAuth("google")}
                />
              </div>

              <div className="auth-or">
                <span>vagy belépés emaillel</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-email-form">
                <label htmlFor="auth-email" className="sr-only">
                  Emailcímed
                </label>

                <div className="auth-input-wrap">
                  <span className="auth-input-prefix">@</span>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="auth-input"
                    placeholder="email címed"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || Boolean(oauthLoading)}
                  className="auth-email-button"
                >
                  <span>{loading ? "LINK KÉSZÜL..." : "BELÉPŐ LINK KÜLDÉSE"}</span>
                  <span aria-hidden="true">↗</span>
                </button>
              </form>

              <div className="auth-footer-row">
                <p>
                  Problémád van? Írj ide:{" "}
                  <a href="mailto:therealvallalhatatlan@gmail.com">
                    therealvallalhatatlan@gmail.com
                  </a>
                </p>
                <span className="auth-status-dot">ONLINE</span>
              </div>

              {message && (
                <div className="auth-message auth-message-success">{message}</div>
              )}
              {error && (
                <div className="auth-message auth-message-error">{error}</div>
              )}
            </section>
          </div>

          <div className="auth-bottomline">
            <span>NO PASSWORDS / NO NOISE</span>
            <span>PRIVATE NODE // V.01</span>
          </div>
        </div>
      )}
    />
  );
}

function OAuthButton({
  provider,
  label,
  loading,
  disabled,
  onClick,
}: {
  provider: "google" | "facebook";
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`auth-oauth-button auth-oauth-${provider}`}
      aria-label={label}
    >
      <span className="auth-oauth-icon">
        {provider === "facebook" ? <FacebookIcon /> : <GoogleIcon />}
      </span>
      <span className="auth-oauth-copy">
        <small>{provider === "facebook" ? "META / IDENTITY" : "GOOGLE / IDENTITY"}</small>
        <strong>{loading ? "KAPCSOLÓDÁS..." : label}</strong>
      </span>
      <span className="auth-oauth-arrow" aria-hidden="true">
        ↗
      </span>
    </button>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.14" />
      <path
        d="M13.5 7.2h2V4.1c-.35-.05-1.55-.15-2.95-.15-2.92 0-4.92 1.78-4.92 5.1v2.85H4.5v3.48h3.13v7.17h3.84v-7.17h3.18l.5-3.48h-3.68V9.35c0-1.01.27-1.7 1.03-1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M21.6 12.23c0-.69-.06-1.21-.2-1.76H12v3.34h5.51c-.11.83-.7 2.08-2 2.92l-.02.11 2.58 2 .18.02c1.68-1.55 2.65-3.84 2.65-6.63Z"
        fill="currentColor"
      />
      <path
        d="M12 22c2.7 0 4.96-.89 6.61-2.43l-3.15-2.44c-.84.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.14l-.11.01-2.69 2.08-.04.1C5.12 19.67 8.29 22 12 22Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M6.32 13.99A6.07 6.07 0 0 1 6 12c0-.69.12-1.36.31-1.99l-.01-.13-2.73-2.11-.09.04A9.98 9.98 0 0 0 2.5 12c0 1.51.36 2.94.98 4.19l2.84-2.2Z"
        fill="currentColor"
        opacity="0.52"
      />
      <path
        d="M12 5.87c1.88 0 3.15.81 3.87 1.49l2.83-2.76C16.94 3.01 14.7 2 12 2 8.29 2 5.12 4.33 3.5 7.81l2.81 2.2C7.12 7.61 9.36 5.87 12 5.87Z"
        fill="currentColor"
        opacity="0.88"
      />
    </svg>
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
  renderForm?: () => React.ReactNode;
  showPurchaseCTA?: boolean;
}) {
  return (
    <main className="auth-page">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="auth-video"
        src={VIDEO_SRC}
      />

      <div aria-hidden className="auth-vignette" />
      <div aria-hidden className="auth-noise" />
      <div aria-hidden className="auth-scanlines" />

      <div className="auth-content">
        {renderForm?.()}

        {showPurchaseCTA && (
          <div className="auth-purchase">
            <a
              href="https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j"
              target="_blank"
              rel="noopener noreferrer"
            >
              Alkalmazás megvásárlása <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .auth-page {
          --acid: #d9f99d;
          --acid-strong: #a3e635;
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background: #050505;
          color: #f5f5f5;
          font-family: var(--font-sans-reader), Arial, sans-serif;
        }

        .auth-video,
        .auth-vignette,
        .auth-noise,
        .auth-scanlines {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .auth-video {
          z-index: 0;
          object-fit: cover;
          filter: saturate(0.76) contrast(1.06) brightness(0.44);
        }

        .auth-vignette {
          z-index: 1;
          background:
            radial-gradient(circle at 50% 42%, rgba(0,0,0,0.06), rgba(0,0,0,0.76) 72%),
            linear-gradient(180deg, rgba(0,0,0,0.48), rgba(0,0,0,0.8));
        }

        .auth-noise {
          z-index: 2;
          pointer-events: none;
          opacity: 0.18;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.13) 0, transparent 28%),
            radial-gradient(circle at 82% 34%, rgba(163,230,53,0.08) 0, transparent 24%),
            radial-gradient(circle at 50% 80%, rgba(255,255,255,0.06) 0, transparent 30%);
          animation: authDrift 220ms steps(2, end) infinite;
        }

        .auth-scanlines {
          z-index: 2;
          pointer-events: none;
          opacity: 0.18;
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.045) 0,
            rgba(255,255,255,0.045) 1px,
            transparent 1px,
            transparent 5px
          );
        }

        .auth-content {
          position: relative;
          z-index: 3;
          min-height: 100svh;
          display: grid;
          place-items: center;
          padding: 28px 24px 88px;
        }

        .auth-shell {
          width: min(1040px, 100%);
        }

        .auth-topline,
        .auth-bottomline {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          color: rgba(217,249,157,0.62);
          font-family: var(--font-mono-tech), monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .auth-topline {
          padding: 0 4px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }

        .auth-bottomline {
          padding: 14px 4px 0;
          color: rgba(255,255,255,0.28);
        }

        .auth-grid {
          display: grid;
          grid-template-columns: 74px minmax(0, 1fr);
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(7,7,7,0.56);
          backdrop-filter: blur(18px);
          box-shadow:
            0 32px 100px rgba(0,0,0,0.42),
            0 0 0 1px rgba(163,230,53,0.03) inset;
        }

        .auth-rail {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 18px 0;
          border-right: 1px solid rgba(255,255,255,0.08);
        }

        .auth-rail-mark {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(217,249,157,0.46);
          color: var(--acid);
          font-family: var(--font-hero), sans-serif;
          font-size: 28px;
          line-height: 1;
          box-shadow: 0 0 26px rgba(163,230,53,0.08);
        }

        .auth-rail-line {
          width: 1px;
          flex: 1;
          margin: 18px 0;
          background: linear-gradient(
            to bottom,
            rgba(217,249,157,0.18),
            rgba(255,255,255,0.03)
          );
        }

        .auth-rail-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          color: rgba(255,255,255,0.35);
          font-family: var(--font-mono-tech), monospace;
          font-size: 9px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .auth-card {
          min-width: 0;
          padding: clamp(26px, 5vw, 54px);
        }

        .auth-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
        }

        .auth-kicker {
          margin: 0 0 12px;
          color: var(--acid-strong);
          font-family: var(--font-mono-tech), monospace;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }

        .auth-card h1 {
          margin: 0;
          color: #f4f4f4;
          font-family: var(--font-heading), serif;
          font-size: clamp(46px, 7vw, 84px);
          font-weight: 400;
          line-height: 0.9;
          letter-spacing: -0.04em;
        }

        .auth-stamp {
          flex: 0 0 auto;
          width: 78px;
          height: 78px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 10px;
          border: 1px solid rgba(217,249,157,0.2);
          color: rgba(217,249,157,0.76);
          font-family: var(--font-mono-tech), monospace;
          text-transform: uppercase;
        }

        .auth-stamp span {
          font-size: 8px;
          letter-spacing: 0.18em;
        }

        .auth-stamp strong {
          align-self: flex-end;
          font-family: var(--font-hero), sans-serif;
          font-size: 32px;
          line-height: 0.8;
        }

        .auth-rule {
          height: 1px;
          margin: 30px 0 20px;
          background:
            linear-gradient(
              90deg,
              rgba(163,230,53,0.4),
              rgba(255,255,255,0.08) 48%,
              transparent
            );
        }

        .auth-oauth-stack {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .auth-oauth-button {
          position: relative;
          display: grid;
          grid-template-columns: 46px minmax(0, 1fr) 18px;
          align-items: center;
          gap: 14px;
          min-height: 94px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.4);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .auth-oauth-button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: rgba(0,0,0,0.62);
          border-color: rgba(217,249,157,0.44);
          box-shadow: 0 14px 40px rgba(0,0,0,0.28);
        }

        .auth-oauth-button:disabled {
          cursor: wait;
          opacity: 0.56;
        }

        .auth-oauth-facebook .auth-oauth-icon {
          color: #9cc3ff;
        }

        .auth-oauth-google .auth-oauth-icon {
          color: var(--acid);
        }

        .auth-oauth-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border: 1px solid currentColor;
          background: rgba(255,255,255,0.03);
        }

        .auth-oauth-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .auth-oauth-copy small {
          color: rgba(255,255,255,0.33);
          font-family: var(--font-mono-tech), monospace;
          font-size: 8px;
          letter-spacing: 0.14em;
        }

        .auth-oauth-copy strong {
          overflow: hidden;
          color: #f0f0f0;
          font-family: var(--font-mono-tech), monospace;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.03em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .auth-oauth-arrow {
          color: rgba(255,255,255,0.45);
          font-size: 18px;
        }

        .auth-or {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 16px;
          color: rgba(255,255,255,0.34);
          font-family: var(--font-mono-tech), monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .auth-or::before,
        .auth-or::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(255,255,255,0.09);
        }

        .auth-email-form {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 260px;
          gap: 10px;
        }

        .auth-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid rgba(255,255,255,0.13);
          background: rgba(0,0,0,0.34);
        }

        .auth-input-prefix {
          padding-left: 16px;
          color: rgba(217,249,157,0.5);
          font-family: var(--font-mono-tech), monospace;
        }

        .auth-input {
          width: 100%;
          min-height: 58px;
          padding: 0 16px 0 10px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f5f5f5;
          font-family: var(--font-mono-tech), monospace;
          font-size: 14px;
        }

        .auth-input::placeholder {
          color: rgba(255,255,255,0.26);
        }

        .auth-input:focus {
          box-shadow: inset 0 0 0 1px rgba(163,230,53,0.42);
        }

        .auth-email-button {
          min-height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 0 16px;
          border: 1px solid rgba(163,230,53,0.64);
          background: var(--acid-strong);
          color: #050505;
          font-family: var(--font-mono-tech), monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          cursor: pointer;
          transition:
            transform 180ms ease,
            background 180ms ease,
            box-shadow 180ms ease;
        }

        .auth-email-button:hover:not(:disabled) {
          transform: translateY(-2px);
          background: var(--acid);
          box-shadow: 0 14px 34px rgba(163,230,53,0.12);
        }

        .auth-email-button:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        .auth-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .auth-footer-row p {
          margin: 0;
          color: rgba(255,255,255,0.36);
          font-family: var(--font-mono-tech), monospace;
          font-size: 9px;
          line-height: 1.7;
        }

        .auth-footer-row a {
          color: rgba(217,249,157,0.78);
          text-underline-offset: 3px;
        }

        .auth-status-dot {
          flex: 0 0 auto;
          color: rgba(217,249,157,0.52);
          font-family: var(--font-mono-tech), monospace;
          font-size: 8px;
          letter-spacing: 0.18em;
        }

        .auth-status-dot::before {
          content: "";
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 7px;
          border-radius: 999px;
          background: var(--acid-strong);
          box-shadow: 0 0 12px rgba(163,230,53,0.55);
        }

        .auth-message {
          margin-top: 14px;
          padding: 12px 14px;
          border: 1px solid rgba(255,255,255,0.08);
          font-family: var(--font-mono-tech), monospace;
          font-size: 10px;
          line-height: 1.6;
        }

        .auth-message-success {
          color: var(--acid);
          background: rgba(163,230,53,0.05);
        }

        .auth-message-error {
          color: #fca5a5;
          background: rgba(127,29,29,0.2);
        }

        .auth-purchase {
          position: fixed;
          right: 24px;
          bottom: 18px;
          z-index: 5;
        }

        .auth-purchase a {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          border: 1px solid rgba(163,230,53,0.36);
          background: rgba(0,0,0,0.6);
          color: var(--acid);
          font-family: var(--font-mono-tech), monospace;
          font-size: 10px;
          text-decoration: none;
          backdrop-filter: blur(14px);
        }

        @keyframes authDrift {
          0% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(-1%, 0.5%, 0); }
          50% { transform: translate3d(1%, -0.5%, 0); }
          75% { transform: translate3d(-0.5%, 1%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @media (max-width: 780px) {
          .auth-content {
            padding: 16px 14px 80px;
          }

          .auth-topline,
          .auth-bottomline {
            font-size: 8px;
            letter-spacing: 0.14em;
          }

          .auth-grid {
            grid-template-columns: 1fr;
          }

          .auth-rail {
            display: none;
          }

          .auth-card {
            padding: 24px 18px;
          }

          .auth-card-head {
            align-items: flex-end;
          }

          .auth-card h1 {
            font-size: clamp(44px, 15vw, 68px);
          }

          .auth-stamp {
            width: 62px;
            height: 62px;
          }

          .auth-stamp strong {
            font-size: 26px;
          }

          .auth-oauth-stack {
            grid-template-columns: 1fr;
          }

          .auth-oauth-button {
            min-height: 78px;
          }

          .auth-email-form {
            grid-template-columns: 1fr;
          }

          .auth-footer-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .auth-purchase {
            right: 14px;
            bottom: 12px;
            left: 14px;
          }

          .auth-purchase a {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 420px) {
          .auth-topline span:last-child,
          .auth-bottomline span:last-child {
            display: none;
          }

          .auth-card {
            padding: 22px 16px;
          }

          .auth-card h1 {
            font-size: 46px;
          }

          .auth-oauth-button {
            grid-template-columns: 40px minmax(0, 1fr) 14px;
            gap: 10px;
            padding: 12px;
          }

          .auth-oauth-icon {
            width: 40px;
            height: 40px;
          }

          .auth-oauth-copy strong {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-noise {
            animation: none;
          }

          .auth-oauth-button,
          .auth-email-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}

"use client"

import { useEffect } from "react"
import Link from "next/link"
import Reviews from "@/components/Reviews"
import Footer from "@/components/Footer"
import SiteHeader from "@/components/SiteHeader"
import MainContent from "@/components/MainContent"
import PersonalizedMemberHome from "@/components/PersonalizedMemberHome"
import { useSessionGuard } from "@/hooks/useSessionGuard"

function GuestHome() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const source = params.get("utm_source")
      const campaign = params.get("utm_campaign")
      const referrer = document.referrer

      if (source || campaign || referrer) {
        sessionStorage.setItem(
          "vh_homepage_entry_v1",
          JSON.stringify({
            source,
            campaign,
            referrer,
            capturedAt: Date.now(),
          }),
        )
      }
    } catch {
      // Source capture must never affect the guest page.
    }
  }, [])

  return (
    <>
      <SiteHeader />

      <div className="mx-auto w-full pb-28 pt-24 sm:pb-32 sm:pt-28">
        <section className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <div className="ml-auto max-w-3xl">
            <p
              className="text-right text-[21px] italic leading-[1.7] text-zinc-300 sm:text-[23px]"
              style={{ fontFamily: "var(--font-mono-tech)" }}
            >
              "Archetípus vagyok.<br/>A funkcionális rendszerhiba, az elbaszott túlélő, a káosz-építész archetípusa. Egy csótány fejlett idegrendszerrel."
            </p>

            <p className="mt-5 text-right text-lg italic tracking-wide text-zinc-600">
              — Író Úr
            </p>

            <div className="mt-14">
              <p className="text-right text-[11px] uppercase tracking-[0.08em] text-zinc-400 sm:text-[12px]">
                Ez egy privát, zártkörű klub. Jelentkezz be.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link
                  href="/auth?from=%2Ffooldal-2&next=%2Ffooldal-2"
                  className="inline-flex min-h-12 min-w-40 items-center justify-center rounded-md border border-lime-400/45 bg-lime-400/[0.035] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-lime-200 transition-all hover:border-lime-300 hover:bg-lime-400/[0.08] hover:text-white"
                >
                  BELÉPÉS
                </Link>

                <Link
                  href="/auth?from=%2Ffooldal-2&next=%2Ffooldal-2&provider=google"
                  className="inline-flex min-h-12 min-w-48 items-center justify-center gap-2.5 rounded-md border border-zinc-700 bg-zinc-950 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-300 transition-all hover:border-lime-400/60 hover:bg-zinc-900 hover:text-lime-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 fill-current text-zinc-200"
                  >
                    <path d="M21.35 11.1h-9.18v2.98h5.62c-.24 1.56-1.84 4.58-5.62 4.58-3.38 0-6.14-2.8-6.14-6.26s2.76-6.26 6.14-6.26c1.92 0 3.21.82 3.95 1.53l2.14-2.08C16.88 4.3 14.96 3.3 12.17 3.3 7.36 3.3 3.45 7.2 3.45 12s3.91 8.7 8.72 8.7c5.04 0 8.39-3.54 8.39-8.52 0-.57-.06-.99-.13-1.08z" />
                  </svg>
                  GOOGLE LOGIN
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 w-full sm:mt-14">
          <video
            className="relative left-1/2 block aspect-video w-screen -translate-x-1/2 object-cover"
            src="/videos/dd2.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            preload="metadata"
          />
        </section>

        <section className="mx-auto mt-20 w-full max-w-5xl px-5 sm:mt-28 sm:px-8">
          <Reviews />
        </section>
      </div>

      <Footer />
    </>
  )
}

export default function HomepageExperience() {
  const { session, loading } = useSessionGuard() as {
    session: { access_token?: string } | null
    loading: boolean
  }

  return (
    <MainContent fullWidth>
      {!loading && !session ? <GuestHome /> : null}
      {!loading && session ? <PersonalizedMemberHome /> : null}

      {loading ? (
        <>
          <SiteHeader />
          <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-5 sm:px-8">
            <div className="w-full">
              <div className="h-px w-24 bg-zinc-800" />
              <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-zinc-700">
                CHANNEL INITIALIZING
              </p>
              <div className="mt-5 h-10 w-full max-w-3xl animate-pulse bg-zinc-950" />
            </div>
          </div>
        </>
      ) : null}
    </MainContent>
  )
}

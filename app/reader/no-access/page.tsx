"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FALLBACK_STRIPE_LINK = "https://buy.stripe.com/14A14ndjk9MYdcH3038Ra0j";

export default function ReaderNoAccessPage() {
  return (
    <Suspense fallback={<Loading />}> 
      <ReaderNoAccessInner />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-black/60 p-6">
        <p className="text-xs text-neutral-400">Betöltés…</p>
      </div>
    </main>
  );
}

function ReaderNoAccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const from = searchParams?.get("from") || "/reader";
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL || FALLBACK_STRIPE_LINK;

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-black/60 backdrop-blur p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">HOZZÁFÉRÉS</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-100">
          Nincs hozzáférésed a Readerhez
        </h1>
        <p className="mt-3 text-sm text-neutral-300">
          Ezzel az email címmel jelenleg nincs aktív digitális jogosultság. Itt tudod megvásárolni a hozzáférést.
        </p>

        <a
          href={stripeLink}
          className="mt-6 block w-full text-center rounded-2xl border border-lime-600 bg-lime-600 text-black text-sm font-semibold py-2.5 hover:bg-lime-500 transition"
        >
          Hozzáférés megvásárlása →
        </a>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => router.replace(from)}
            className="w-full rounded-2xl border border-neutral-700 bg-transparent text-neutral-100 text-sm font-semibold py-2.5 hover:bg-white/5 transition"
          >
            Újrapróbálom
          </button>
          <button
            onClick={() => router.replace(`/auth?from=${encodeURIComponent(from)}`)}
            className="w-full rounded-2xl border border-neutral-700 bg-transparent text-neutral-100 text-sm font-semibold py-2.5 hover:bg-white/5 transition"
          >
            Belépés másik emaillel
          </button>
        </div>

        <p className="mt-4 text-[11px] text-neutral-500">
          Vásárlás után, ha nem enged be azonnal: lépj ki, majd lépj be újra ugyanazzal az email címmel.
        </p>
      </div>
    </main>
  );
}
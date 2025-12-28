"use client";

import React, { useState } from "react";

const TOTAL_SLOTS = 20;
const CLAIMED_SLOTS = 17;
const REMAINING_SLOTS = TOTAL_SLOTS - CLAIMED_SLOTS;
const PROGRESS_PERCENT = Math.min(
  100,
  Math.round((CLAIMED_SLOTS / TOTAL_SLOTS) * 100)
);

export default function CrewCoupon() {
  return (
    <section className="px-6 py-10 mx-auto w-full max-w-3xl">
      <CrewCouponCard />
    </section>
  );
}

function CrewCouponCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("CREW");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.25em] text-lime-100/100 mb-4">
        crew kedvezmény
      </p>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl md:text-3xl font-semibold text-lime-400">
            5000 Ft kedvezmény a könyv előrendelőinek
          </h3>
          <p className="mt-1 text-sm text-neutral-300">
            Az első {TOTAL_SLOTS} megrendelőnek jár a kedvezmény. Jelenleg {CLAIMED_SLOTS} foglalás
            elkelt, {REMAINING_SLOTS} hely maradt.
          </p>
        </div>
        <span className="text-center text-[12px] font-semibold uppercase tracking-wider text-white bg-lime-400/0 border border-lime-400 px-6 py-2 rounded-full">
          még <br/>
          <span className="text-[26px] font-semibold">
           {REMAINING_SLOTS}
          </span>
        </span>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-base font-semibold tracking-[0.3em] text-lime-200">
            CREW
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-neutral-500 hover:text-white"
          >
            {copied ? "Másolva" : "Kód másolása"}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          A Stripe fizetési felületen add meg a CREW kódot, és automatikusan levonjuk a kedvezményt.
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>{CLAIMED_SLOTS} felhasználva</span>
          <span>{TOTAL_SLOTS} összesen</span>
        </div>
        <div className="relative mt-2 h-2 w-full rounded-full bg-neutral-800">
          <div
            className="absolute left-0 top-0 h-2 rounded-full bg-lime-500"
            style={{ width: `${PROGRESS_PERCENT}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="https://buy.stripe.com/8x2dR96UW9MY3C78kn8Ra0h"
          className="inline-flex items-center justify-center rounded-lg border border-lime-500 bg-lime-500 px-4 py-2 text-sm font-semibold text-black transition hover:border-lime-400 hover:bg-lime-400"
        >
          Megveszem kedvezménnyel
        </a>
        <span className="text-xs text-neutral-500">
          A kedvezmény csak az első {TOTAL_SLOTS} rendelésre érvényes.
        </span>
      </div>
    </div>
  );
}

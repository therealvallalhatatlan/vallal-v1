"use client";

import { useEffect, useState } from "react";

type CheckoutSnapshot = {
  ref: string;
  paymentUrl: string;
  revtag?: string;
  totalAmountHuf?: number;
  checkoutLabel?: string;
};

export default function TelegramAppCheckoutPage() {
  const [snapshot, setSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("telegram-mini-checkout");
      if (!raw) {
        setLoadError("Hiányzó checkout adat. Indítsd újra a Mini App checkoutot.");
        return;
      }

      const parsed = JSON.parse(raw) as CheckoutSnapshot;
      if (!parsed.paymentUrl || !parsed.ref) {
        setLoadError("Hianyzo Revolut checkout adat. Inditsd ujra a Mini App checkoutot.");
        return;
      }

      setSnapshot(parsed);
    } catch {
      setLoadError("Nem sikerult beolvasni a checkout adatokat.");
    }
  }, []);

  const copyReference = async () => {
    if (!snapshot?.ref) return;

    try {
      await navigator.clipboard.writeText(snapshot.ref);
      setCopyFeedback("Referencia kod masolva.");
    } catch {
      setCopyFeedback("A masolas nem sikerult, jelold ki kezzel a kodot.");
    }
  };

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#090705] px-4 py-8 text-[#f4ebe1]">
        <div className="mx-auto max-w-xl border border-white/10 bg-black/40 p-6">
          <h1 className="text-2xl font-bold text-[#fff8f1]">Checkout</h1>
          <p className="mt-3 text-sm text-red-300">
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => window.location.assign("/telegram-app")}
            className="mt-4 border border-[#c98552]/70 bg-[#c98552] px-4 py-3 text-sm font-bold uppercase tracking-[0.22em] text-[#1b1009]"
          >
            Vissza a kosárhoz
          </button>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#090705] px-4 py-8 text-[#f4ebe1]">
        <div className="mx-auto max-w-xl border border-white/10 bg-black/40 p-6">
          <h1 className="text-2xl font-bold text-[#fff8f1]">Checkout</h1>
          <p className="mt-3 text-sm text-white/60">A rendelesi adatok betoltese folyamatban van...</p>
          <p className="mt-2 text-xs text-white/40">
            Ha ez sokaig igy marad, inditsd ujra a checkoutot a Mini Appbol.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,133,82,0.10),transparent_30%),linear-gradient(180deg,#090705_0%,#110d0a_100%)] px-4 py-6 text-[#f4ebe1]">
      <div className="mx-auto max-w-2xl border border-[#c98552]/18 bg-[#090705]/85 p-4 md:p-6">
        <div className="border-b border-[#c98552]/18 pb-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#d59b6b]/80">Telegram fizetesi oldal</p>
          <h1 className="mt-2 text-2xl font-bold text-[#fff8f1]">Revolut Checkout</h1>
          <p className="mt-2 text-sm text-white/65">
            {snapshot.checkoutLabel ? snapshot.checkoutLabel : "A rendelesed Revolut fizetesi oldalra keszult."}
          </p>
        </div>

        <div className="mt-4 space-y-4 border border-[#c98552]/20 bg-white/[0.03] p-4">
          <button
            type="button"
            onClick={copyReference}
            className="w-full border border-[#c98552]/30 bg-black/35 p-3 text-left transition-colors hover:border-[#c98552]/60"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Referencia kod</p>
            <p className="mt-2 text-lg font-bold text-[#f4d6bd]">{snapshot.ref}</p>
            <p className="mt-2 text-xs text-white/45">Kattints a kodra a vagolapra masolashoz.</p>
          </button>

          <div className="border border-white/10 bg-black/35 p-3 text-sm text-white/70">
            <p>
              <span className="text-white/55">Revtag:</span> {snapshot.revtag ?? "@cukorkabolt"}
            </p>
            {typeof snapshot.totalAmountHuf === "number" ? (
              <p className="mt-2">
                <span className="text-white/55">Osszeg:</span> {snapshot.totalAmountHuf.toLocaleString("hu-HU")} HUF
              </p>
            ) : null}
          </div>

          <a
            href={snapshot.paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="block w-full border border-[#c98552]/70 bg-[#c98552] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.24em] text-[#1b1009]"
          >
            Open Revolut
          </a>

          {copyFeedback ? <p className="text-sm text-[#f4d6bd]">{copyFeedback}</p> : null}

          <p className="text-sm text-white/70">
            Fizess Revoluton, majd menj vissza a Telegram chatbe es nyomd meg a <b>FIZETTEM</b> gombot.
            A jovahagyas utan ott kapod a visszaigazolast.
          </p>

          <div>
            <button
              type="button"
              onClick={() => window.location.assign("/telegram-app")}
              className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white"
            >
              Vissza a kosarhoz
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

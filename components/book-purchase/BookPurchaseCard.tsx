"use client";

import { useState } from "react";
import type { DeliveryMethod } from "@/lib/shop/delivery";

type BookProductId = "book-1" | "book-2";

type BookPurchaseCardProps = {
  productId: BookProductId;
  editionLabel: "I." | "II.";
};

const BOOK_PRICE = 10000;

const OPTIONS: Array<{
  value: DeliveryMethod;
  label: string;
  description: string;
  fee: number;
}> = [
  {
    value: "dead-drop",
    label: "Dead drop / egyeztetett átvétel",
    description: "Személyes, egyeztetett átvétel a hálózaton keresztül.",
    fee: 0,
  },
  {
    value: "postaautomata",
    label: "Csomagpont / csomagautomata",
    description: "Magyarországon belül. Add meg az automata vagy csomagpont nevét és címét.",
    fee: 2500,
  },
  {
    value: "eu",
    label: "Külföldi szállítás az EU-n belül",
    description: "A szállítási címet a Stripe fizetési oldalán adhatod meg.",
    fee: 5000,
  },
];

const HUF = new Intl.NumberFormat("hu-HU");

export default function BookPurchaseCard({
  productId,
  editionLabel,
}: BookPurchaseCardProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [pickupPoint, setPickupPoint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = OPTIONS.find((option) => option.value === deliveryMethod);
  const deliveryFee = selectedOption?.fee ?? 0;
  const total = BOOK_PRICE + deliveryFee;
  const pickupPointIsValid = deliveryMethod !== "postaautomata" || pickupPoint.trim().length >= 3;

  async function handleCheckout() {
    if (!deliveryMethod || !pickupPointIsValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shop/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ productId, quantity: 1 }],
          deliveryMethod,
          ...(deliveryMethod === "postaautomata" ? { pickupPoint: pickupPoint.trim() } : {}),
        }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Nem sikerült elindítani a fizetést. Próbáld újra.");
      }

      window.location.assign(payload.url);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Nem sikerült elindítani a fizetést. Próbáld újra.",
      );
      setLoading(false);
    }
  }

  return (
    <section
      id="book-purchase"
      aria-labelledby="book-purchase-heading"
      className="mt-6 rounded-md border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5"
      style={{ fontFamily: "var(--font-mono-tech)" }}
    >
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-lime-100/60">
          MEGRENDELÉS // {editionLabel} KÖTET
        </p>
        <h3 id="book-purchase-heading" className="mt-2 text-lg font-bold text-zinc-100">
          Hogyan jusson el hozzád a könyv?
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          A könyv ára 10 000 Ft. Válaszd ki az átvétel vagy a szállítás módját, a végösszeg azonnal frissül.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Kézbesítési mód</legend>
        {OPTIONS.map((option) => {
          const selected = deliveryMethod === option.value;

          return (
            <label
              key={option.value}
              className={
                "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors " +
                (selected
                  ? "border-lime-200/70 bg-lime-200/[0.06]"
                  : "border-zinc-800 bg-black/30 hover:border-zinc-600")
              }
            >
              <input
                type="radio"
                name={`book-delivery-${productId}`}
                value={option.value}
                checked={selected}
                onChange={() => {
                  setDeliveryMethod(option.value);
                  setError(null);
                }}
                className="mt-1 accent-lime-200"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-100">{option.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{option.description}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-lime-100/80">
                {option.fee === 0 ? "0 Ft" : `+${HUF.format(option.fee)} Ft`}
              </span>
            </label>
          );
        })}
      </fieldset>

      {deliveryMethod === "postaautomata" && (
        <div className="mt-4">
          <label htmlFor={`pickup-point-${productId}`} className="mb-2 block text-xs font-semibold text-zinc-200">
            Csomagpont vagy automata neve és címe
          </label>
          <input
            id={`pickup-point-${productId}`}
            type="text"
            maxLength={160}
            value={pickupPoint}
            onChange={(event) => setPickupPoint(event.target.value)}
            placeholder="Szolgáltató, pont/automata neve, település"
            autoComplete="off"
            className="w-full rounded-sm border border-zinc-700 bg-black px-3 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime-200/70"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            A telefonszámodat a fizetési oldalon kérjük el a kézbesítéshez.
          </p>
        </div>
      )}

      {deliveryMethod === "eu" && (
        <p className="mt-3 border-l border-zinc-700 pl-3 text-xs leading-relaxed text-zinc-500">
          Az EU-n belüli szállítási címet a következő, biztonságos fizetési lépésben kell megadnod.
        </p>
      )}

      <div className="mt-5 space-y-2 border-t border-zinc-800 pt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Vállalhatatlan {editionLabel} kötet</span>
          <span>{HUF.format(BOOK_PRICE)} Ft</span>
        </div>
        {deliveryMethod && (
          <div className="flex items-start justify-between gap-4 text-xs text-zinc-500">
            <span>{selectedOption?.label}</span>
            <span className="shrink-0">{deliveryFee === 0 ? "0 Ft" : `+${HUF.format(deliveryFee)} Ft`}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 pt-1">
          <span className="text-sm font-bold uppercase tracking-wide text-zinc-200">Fizetendő</span>
          <span className="text-xl font-bold text-lime-100">{HUF.format(total)} Ft</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={!deliveryMethod || !pickupPointIsValid || loading}
        className="mt-4 flex min-h-14 w-full items-center justify-between rounded-sm border border-lime-100/70 bg-lime-100/[0.04] px-4 text-sm font-bold tracking-[0.06em] text-lime-100 transition-colors hover:bg-lime-100/10 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
      >
        <span>{loading ? "FIZETÉS ELŐKÉSZÍTÉSE…" : "MEGVESZEM A KÖNYVET"}</span>
        <span aria-hidden="true">{loading ? "…" : "→"}</span>
      </button>

      {error && (
        <p role="alert" className="mt-3 text-xs leading-relaxed text-red-300">
          {error}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
        A kártyás fizetés a Stripe biztonságos fizetési oldalán történik.
      </p>
    </section>
  );
}

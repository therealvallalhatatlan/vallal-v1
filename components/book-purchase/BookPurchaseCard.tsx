"use client";

import { useState } from "react";
import type { DeliveryMethod } from "@/lib/shop/delivery";
import { createClient } from "@/lib/browser";
import { FoxpostPickupPointSelector } from "@/components/foxpost/FoxpostPickupPointSelector";
import type { FoxpostPickupPoint } from "@/types/foxpost";

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
    description: "Válassz egy Foxpost átvételi pontot a térképen vagy a listában.",
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
  const [pickupPoint, setPickupPoint] = useState<FoxpostPickupPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = OPTIONS.find((option) => option.value === deliveryMethod);
  const deliveryFee = selectedOption?.fee ?? 0;
  const total = BOOK_PRICE + deliveryFee;
  const pickupPointIsValid =
    deliveryMethod !== "postaautomata" || Boolean(pickupPoint?.destinationId);

  async function handleCheckout() {
    if (!deliveryMethod || !pickupPointIsValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Include the current Supabase session when available so the server can
      // attach the purchase to the signed-in account. Guest checkout stays supported.
      const checkoutHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      try {
        const { data: sessionData } = await createClient().auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (accessToken) {
          checkoutHeaders.Authorization = `Bearer ${accessToken}`;
        }
      } catch (sessionError) {
        console.warn("[BookPurchaseCard] Could not read auth session; continuing as guest.", sessionError);
      }

      const response = await fetch("/api/shop/create-checkout-session", {
        method: "POST",
        headers: checkoutHeaders,
        body: JSON.stringify({
          items: [{ productId, quantity: 1 }],
          deliveryMethod,
          ...(deliveryMethod === "postaautomata" && pickupPoint ? { pickupPoint } : {}),
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
          <FoxpostPickupPointSelector onChange={setPickupPoint} />
          {pickupPoint ? (
            <div className="mt-3 border border-lime-200/30 bg-lime-200/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-lime-100/60">
                KIVÁLASZTOTT ÁTVÉTELI PONT
              </p>
              <p className="mt-2 text-xs font-semibold text-zinc-100">
                {pickupPoint.variant} · {pickupPoint.destinationId}
              </p>
              <p className="mt-1 text-sm text-zinc-200">{pickupPoint.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{pickupPoint.address}</p>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-amber-200/80">
              A fizetéshez előbb válassz ki egy átvételi pontot a Foxpost keresőben.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
            A kézbesítéshez szükséges telefonszámot a fizetési oldalon kérjük el.
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
          <span className="text-xl font-bold text-lime-100">{selectedOption ? `${HUF.format(total)} Ft` : "Válassz módot"}</span>
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

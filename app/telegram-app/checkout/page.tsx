"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { closeMiniApp } from "@telegram-apps/sdk-react";

type CheckoutSnapshot = {
  clientSecret: string;
  orderId?: string;
  currency?: string;
  amount?: number;
  checkoutLabel?: string;
};

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function TelegramPaymentForm(props: { checkoutLabel: string; onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);

  useEffect(() => {
    if (!isPaid) return;

    const timer = window.setTimeout(() => {
      props.onClose();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [isPaid, props]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setError("A Stripe még nem állt fel.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "A fizetés sikertelen.");
      setIsSubmitting(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded" || result.paymentIntent?.status === "processing") {
      setIsPaid(true);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-[#c98552]/20 bg-black/40 p-4">
        <PaymentElement />
      </div>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {isPaid ? (
        <div className="border border-[#c98552]/40 bg-[#c98552]/10 p-4 text-sm text-[#f4e1cf]">
          Fizetés elfogadva. A Mini App záródik, a visszaigazolás megy a chatbe.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements || isPaid}
        className="w-full border border-[#c98552]/70 bg-[#c98552] px-4 py-3 text-sm font-bold uppercase tracking-[0.24em] text-[#1b1009] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Fizetés indítása..." : `Fizetés • ${props.checkoutLabel}`}
      </button>
    </form>
  );
}

export default function TelegramAppCheckoutPage() {
  const [snapshot, setSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const stripeKeyMissing = !stripePublishableKey;

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("telegram-mini-checkout");
      if (!raw) {
        setLoadError("Hiányzó checkout adat. Indítsd újra a Mini App checkoutot.");
        return;
      }

      const parsed = JSON.parse(raw) as CheckoutSnapshot;
      if (!parsed.clientSecret) {
        setLoadError("Hiányzó Stripe clientSecret. Indítsd újra a Mini App checkoutot.");
        return;
      }

      setSnapshot(parsed);
    } catch {
      setLoadError("Nem sikerült beolvasni a checkout adatokat.");
    }
  }, []);

  const appearance = useMemo(
    () => ({
      theme: "night" as const,
      variables: {
        colorPrimary: "#c98552",
        colorBackground: "#090705",
        colorText: "#f4ebe1",
        colorDanger: "#ef8f63",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
        borderRadius: "4px",
      },
    }),
    [],
  );

  const stripeOptions = snapshot?.clientSecret
    ? ({ clientSecret: snapshot.clientSecret, appearance } satisfies StripeElementsOptions)
    : null;

  if (loadError || stripeKeyMissing) {
    return (
      <main className="min-h-screen bg-[#090705] px-4 py-8 text-[#f4ebe1]">
        <div className="mx-auto max-w-xl border border-white/10 bg-black/40 p-6">
          <h1 className="text-2xl font-bold text-[#fff8f1]">Checkout</h1>
          <p className="mt-3 text-sm text-red-300">
            {loadError ?? "Hiányzik a NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY env változó, ezért nem tölthető be a Stripe fizetési felület."}
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

  if (!snapshot || !stripePromise || !stripeOptions) {
    return (
      <main className="min-h-screen bg-[#090705] px-4 py-8 text-[#f4ebe1]">
        <div className="mx-auto max-w-xl border border-white/10 bg-black/40 p-6">
          <h1 className="text-2xl font-bold text-[#fff8f1]">Checkout</h1>
          <p className="mt-3 text-sm text-white/60">A rendelési adatok betöltése folyamatban van...</p>
          <p className="mt-2 text-xs text-white/40">
            Ha ez sokáig így marad, indítsd újra a checkoutot a Mini Appból.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,133,82,0.10),transparent_30%),linear-gradient(180deg,#090705_0%,#110d0a_100%)] px-4 py-6 text-[#f4ebe1]">
      <div className="mx-auto max-w-2xl border border-[#c98552]/18 bg-[#090705]/85 p-4 md:p-6">
        <div className="border-b border-[#c98552]/18 pb-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#d59b6b]/80">Telegram fizetési oldal</p>
          <h1 className="mt-2 text-2xl font-bold text-[#fff8f1]">Stripe Checkout</h1>
          <p className="mt-2 text-sm text-white/65">
            {snapshot.checkoutLabel ? snapshot.checkoutLabel : "A rendelésed Stripe fizetési oldalára léptél."}
          </p>
        </div>

        <div className="mt-4 border border-[#c98552]/20 bg-white/[0.03] p-4">
          <Elements stripe={stripePromise} options={stripeOptions}>
            <TelegramPaymentForm checkoutLabel={snapshot.checkoutLabel ?? "Rendelés"} onClose={() => closeMiniApp()} />
          </Elements>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  closeMiniApp,
  hapticFeedback,
  isHapticFeedbackSupported,
  miniAppReady,
  themeParams,
  useSignal,
} from "@telegram-apps/sdk-react";

import { CATALOG, type Product } from "@/config/catalog";

type CreateIntentResponse = {
  clientSecret: string;
  currency: string;
  amount: number;
  product: {
    id: string;
    code: string;
    name: string;
    priceHuf: number;
  };
};

const products = Object.values(CATALOG).filter((product) => product.active);
const EMPTY_THEME_SNAPSHOT = {} as Record<string, unknown>;

function triggerHapticImpact(style: "light" | "medium" | "heavy") {
  try {
    if (!isHapticFeedbackSupported()) return;
    hapticFeedback.impactOccurred(style);
  } catch {
    // Localhost/browser fallback: haptics are unavailable outside Telegram Mini Apps.
  }
}

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function getTelegramWebApp() {
  if (typeof window === "undefined") return null;
  return (window as Window & {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
      };
    };
  }).Telegram?.WebApp ?? null;
}

function applyTelegramTheme(theme: Record<string, unknown> | null) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (!theme) return;

  Object.entries(theme).forEach(([key, value]) => {
    if (typeof value === "string") {
      root.style.setProperty(`--tg-${key.replace(/_/g, "-")}`, value);
    }
  });

  root.style.setProperty("--tg-bg-color", (theme.backgroundColor as string | undefined) ?? "#090705");
  root.style.setProperty("--tg-text-color", (theme.textColor as string | undefined) ?? "#f4ebe1");
  root.style.setProperty("--tg-hint-color", (theme.hintColor as string | undefined) ?? "#b99e8c");
  root.style.setProperty("--tg-accent-color", (theme.buttonColor as string | undefined) ?? "#c98552");
  root.style.setProperty("--tg-button-text-color", (theme.buttonTextColor as string | undefined) ?? "#1b1009");
}

function TelegramPaymentForm(props: {
  product: Product;
  quantity: number;
  onClose: () => void;
}) {
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
    triggerHapticImpact("medium");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "A fizetés sikertelen.");
      triggerHapticImpact("heavy");
      setIsSubmitting(false);
      return;
    }

    if (result.paymentIntent?.status === "succeeded" || result.paymentIntent?.status === "processing") {
      setIsPaid(true);
      triggerHapticImpact("light");
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
        {isSubmitting ? "Fizetés indítása..." : `Fizetés • ${props.product.code} × ${props.quantity}`}
      </button>
    </form>
  );
}

function MiniAppInner() {
  const [isMounted, setIsMounted] = useState(false);
  const [initData, setInitData] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(products[0]?.minPerOrder ?? 1);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const webApp = getTelegramWebApp();
  const telegramTheme = useSignal(themeParams.state, () => EMPTY_THEME_SNAPSHOT);

  useEffect(() => {
    setIsMounted(true);
    if (webApp) {
      miniAppReady();
      webApp.ready?.();
      webApp.expand?.();
      setInitData(webApp.initData ?? "");
    } else {
      setInitData("");
    }
    applyTelegramTheme(telegramTheme ?? null);
  }, [telegramTheme, webApp]);

  useEffect(() => {
    applyTelegramTheme(telegramTheme ?? null);
  }, [telegramTheme]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? products[0] ?? null,
    [selectedProductId],
  );
  const hasInitData = initData.trim().length > 0;

  useEffect(() => {
    if (!selectedProduct) return;
    if (quantity < selectedProduct.minPerOrder) {
      setQuantity(selectedProduct.minPerOrder);
    }
  }, [quantity, selectedProduct]);

  const selectProduct = (product: Product) => {
    setSelectedProductId(product.id);
    setQuantity(product.minPerOrder);
    triggerHapticImpact("light");
  };

  const submitIntent = async () => {
    if (!selectedProduct) return;

    if (!hasInitData) {
      setIntentError("Hiányzik a Telegram hitelesítési adat. Nyisd meg ezt az oldalt a bot Mini App gombjából.");
      triggerHapticImpact("heavy");
      return;
    }

    setLoadingIntent(true);
    setIntentError(null);
    triggerHapticImpact("light");

    try {
      const response = await fetch("/api/telegram/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          productId: selectedProduct.id,
          quantity,
        }),
      });

      const payload = (await response.json()) as Partial<CreateIntentResponse> & { error?: string };

      if (!response.ok || !payload.clientSecret) {
        throw new Error(payload.error ?? "Nem sikerült létrehozni a Stripe intentet.");
      }

      setClientSecret(payload.clientSecret);
    } catch (error) {
      setIntentError(error instanceof Error ? error.message : "Ismeretlen hiba történt.");
      triggerHapticImpact("heavy");
    } finally {
      setLoadingIntent(false);
    }
  };

  const colorPrimary = typeof telegramTheme?.buttonColor === "string" ? telegramTheme.buttonColor : "#c98552";
  const colorBackground = typeof telegramTheme?.backgroundColor === "string" ? telegramTheme.backgroundColor : "#090705";
  const colorText = typeof telegramTheme?.textColor === "string" ? telegramTheme.textColor : "#f4ebe1";

  const appearance = {
    theme: "night" as const,
    variables: {
      colorPrimary,
      colorBackground,
      colorText,
      colorDanger: "#ef8f63",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
      borderRadius: "4px",
    },
  };

  const stripeOptions = clientSecret
    ? ({ clientSecret, appearance } satisfies StripeElementsOptions)
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,133,82,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,218,185,0.05),transparent_28%),linear-gradient(180deg,#090705_0%,#110d0a_100%)] px-4 py-5 text-[#f4ebe1] md:px-8 md:py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border border-[#c98552]/18 bg-[#090705]/80 p-4 shadow-[0_0_0_1px_rgba(201,133,82,0.10),0_0_60px_rgba(0,0,0,0.35)] md:p-6">
        <header className="flex flex-col gap-3 border-b border-[#c98552]/18 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#d59b6b]/85">Telegram Mini App</p>
            <h1 className="mt-2 text-2xl font-bold tracking-[0.12em] text-[#fff8f1] md:text-4xl">
              Sophie Sanchez Cukorkaboltja
            </h1>
            <div className="mt-3 overflow-hidden border border-[#c98552]/20 bg-[#15100c] shadow-[0_0_0_1px_rgba(201,133,82,0.06)]">
              <img
                src="/sophie.jpg"
                alt="Sophie Sanchez Cukorkaboltja"
                className="h-44 w-full object-cover object-center opacity-95 md:h-52"
              />
            </div>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-white/45">
            {isMounted ? "Initialized inside Telegram" : "Booting..."}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <div className="border border-[#c98552]/20 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-[#d59b6b]/75">01 / Product</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {products.map((product) => {
                  const isActive = product.id === selectedProductId;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className={`border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? "border-[#c98552]/70 bg-[#c98552]/10"
                          : "border-white/10 bg-black/30 hover:border-[#c98552]/28"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">{product.code}</p>
                      <h2 className="mt-2 text-lg font-semibold text-[#fff8f1]">{product.name}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/65">{product.description}</p>
                      <p className="mt-3 text-sm text-[#d59b6b]">
                        {product.priceHuf.toLocaleString("hu-HU")} HUF / db
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">02 / Quantity</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedProduct) return;
                    setQuantity((current) => Math.max(selectedProduct.minPerOrder, current - 1));
                    triggerHapticImpact("light");
                  }}
                  className="h-11 w-11 border border-white/15 bg-white/[0.04] text-lg text-white"
                >
                  -
                </button>
                <div className="min-w-24 flex-1 border border-[#c98552]/35 bg-[#c98552]/10 px-4 py-3 text-center text-2xl font-bold text-[#e3b08a]">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuantity((current) => current + 1);
                    triggerHapticImpact("light");
                  }}
                  className="h-11 w-11 border border-white/15 bg-white/[0.04] text-lg text-white"
                >
                  +
                </button>
              </div>
              <div className="mt-3 text-sm text-white/55">
                Minimum rendelés: {selectedProduct?.minPerOrder ?? 1} db
              </div>
            </div>

            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">03 / Mission</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                A fizetés Telegramon belül marad. A Stripe Elements nem visz ki a chatből, a visszaigazolás pedig a bot csatornán érkezik meg.
              </p>
              <button
                type="button"
                onClick={submitIntent}
                disabled={loadingIntent || !selectedProduct || !hasInitData}
                className="mt-4 w-full border border-[#c98552]/75 bg-[#c98552] px-4 py-3 text-sm font-bold uppercase tracking-[0.24em] text-[#1b1009] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingIntent ? "Stripe intent készül..." : "Checkout indítása"}
              </button>
              {!hasInitData ? (
                <p className="mt-3 text-sm text-amber-200/80">
                  Telegramon kívül vagy. A fizetéshez indítsd a Mini Appot a bot üzenetében lévő gombbal.
                </p>
              ) : null}
              {intentError ? <p className="mt-3 text-sm text-red-300">{intentError}</p> : null}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="border border-white/10 bg-black/35 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Summary</p>
              <div className="mt-4 space-y-2 text-sm text-white/70">
                <div className="flex justify-between gap-4">
                  <span>Product</span>
                  <span className="text-white">{selectedProduct?.code ?? "-"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Quantity</span>
                  <span className="text-white">{quantity}</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base">
                  <span>Total</span>
                  <span className="text-[#d59b6b]">
                    {((selectedProduct?.priceHuf ?? 0) * quantity).toLocaleString("hu-HU")} HUF
                  </span>
                </div>
              </div>
            </div>

            {clientSecret && selectedProduct && stripePromise ? (
              <div className="border border-[#c98552]/20 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#d59b6b]/70">Stripe Elements</p>
                <div className="mt-4">
                  <Elements stripe={stripePromise} options={stripeOptions ?? undefined}>
                    <TelegramPaymentForm
                      product={selectedProduct}
                      quantity={quantity}
                      onClose={() => closeMiniApp()}
                    />
                  </Elements>
                </div>
              </div>
            ) : (
              <div className="border border-white/10 bg-black/25 p-4 text-sm text-white/55">
                A checkout panel akkor jelenik meg, ha a Stripe intent elkészült.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function TelegramMiniAppShell() {
  return <MiniAppInner />;
}

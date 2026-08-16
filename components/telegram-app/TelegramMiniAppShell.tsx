"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
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
  orderId: string;
  currency: string;
  amount: number;
  items: Array<{
    productId: string;
    code: string;
    name: string;
    quantity: number;
    unitAmountMinor: number;
    lineTotalMinor: number;
  }>;
};

type CartItem = {
  productId: string;
  quantity: number;
};

type CartRow = {
  product: Product;
  quantity: number;
  lineTotal: number;
};

const products = Object.values(CATALOG).filter((product) => product.active);
const EMPTY_THEME_SNAPSHOT = {} as Record<string, unknown>;

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function triggerHapticImpact(style: "light" | "medium" | "heavy") {
  try {
    if (!isHapticFeedbackSupported()) return;
    hapticFeedback.impactOccurred(style);
  } catch {
    // No-op outside Telegram Mini Apps (e.g. localhost browser).
  }
}

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

function getInitDataFromUrl(): string {
  if (typeof window === "undefined") return "";

  const fromSearch = new URLSearchParams(window.location.search).get("tgWebAppData");
  if (fromSearch && fromSearch.trim().length > 0) {
    return fromSearch;
  }

  const rawHash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(rawHash);
  const fromHash = hashParams.get("tgWebAppData");

  return fromHash?.trim() ?? "";
}

function resolveInitData(webApp: ReturnType<typeof getTelegramWebApp>): string {
  const fromWebApp = webApp?.initData?.trim();
  if (fromWebApp && fromWebApp.length > 0) {
    return fromWebApp;
  }

  return getInitDataFromUrl();
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
  checkoutLabel: string;
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
        {isSubmitting ? "Fizetés indítása..." : `Fizetés • ${props.checkoutLabel}`}
      </button>
    </form>
  );
}

function MiniAppInner() {
  const [isMounted, setIsMounted] = useState(false);
  const [initData, setInitData] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const webApp = getTelegramWebApp();
  const telegramTheme = useSignal(themeParams.state, () => EMPTY_THEME_SNAPSHOT);
  const isDevMode = process.env.NODE_ENV !== "production";
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    if (webApp) {
      miniAppReady();
      webApp.ready?.();
      webApp.expand?.();
    }

    const syncInitData = () => {
      const resolved = resolveInitData(webApp);
      if (!resolved) return;
      setInitData((current) => (current === resolved ? current : resolved));
    };

    syncInitData();
    const retryTimer = window.setInterval(syncInitData, 350);
    const stopRetryTimer = window.setTimeout(() => {
      window.clearInterval(retryTimer);
    }, 3500);

    applyTelegramTheme(telegramTheme ?? null);

    return () => {
      window.clearInterval(retryTimer);
      window.clearTimeout(stopRetryTimer);
    };
  }, [telegramTheme, webApp]);

  useEffect(() => {
    applyTelegramTheme(telegramTheme ?? null);
  }, [telegramTheme]);

  const hasInitData = initData.trim().length > 0;
  const canCheckoutWithoutInitData = isDevMode;
  const canUseMiniApp = sessionReady || canCheckoutWithoutInitData;

  useEffect(() => {
    if (!isMounted) return;

    if (isDevMode && !hasInitData) {
      setSessionReady(true);
      setSessionError(null);
      return;
    }

    if (!hasInitData) return;

    let isCancelled = false;

    const bootstrapSession = async () => {
      try {
        setSessionError(null);
        const response = await fetch("/api/telegram/session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "miniapp_session_failed");
        }

        if (!isCancelled) {
          setSessionReady(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setSessionReady(false);
          setSessionError(error instanceof Error ? error.message : "miniapp_session_failed");
        }
      }
    };

    void bootstrapSession();

    return () => {
      isCancelled = true;
    };
  }, [hasInitData, initData, isDevMode, isMounted]);

  const cartRows = useMemo<CartRow[]>(() => {
    return cartItems
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.productId);
        if (!product) return null;
        return {
          product,
          quantity: item.quantity,
          lineTotal: product.priceHuf * item.quantity,
        };
      })
      .filter((row): row is CartRow => Boolean(row));
  }, [cartItems]);

  const cartTotalHuf = useMemo(
    () => cartRows.reduce((sum, row) => sum + row.lineTotal, 0),
    [cartRows],
  );

  const cartTotalQuantity = useMemo(
    () => cartRows.reduce((sum, row) => sum + row.quantity, 0),
    [cartRows],
  );

  const cartCheckoutLabel = useMemo(() => {
    if (cartRows.length === 0) return "Kosár üres";
    return cartRows.map((row) => `${row.product.code} x${row.quantity}`).join(", ");
  }, [cartRows]);

  const upsertCartItem = (product: Product, nextQuantity: number) => {
    const normalizedQuantity = Math.max(product.minPerOrder, nextQuantity);

    setCartItems((current) => {
      const existing = current.find((entry) => entry.productId === product.id);
      if (!existing) {
        return [...current, { productId: product.id, quantity: normalizedQuantity }];
      }

      return current.map((entry) =>
        entry.productId === product.id ? { ...entry, quantity: normalizedQuantity } : entry,
      );
    });
  };

  const addToCart = (product: Product) => {
    const existing = cartItems.find((entry) => entry.productId === product.id);
    const nextQuantity = existing ? existing.quantity + 1 : product.minPerOrder;
    upsertCartItem(product, nextQuantity);
    triggerHapticImpact("light");
  };

  const decrementCartItem = (product: Product) => {
    const existing = cartItems.find((entry) => entry.productId === product.id);
    if (!existing) return;

    const nextQuantity = Math.max(product.minPerOrder, existing.quantity - 1);
    upsertCartItem(product, nextQuantity);
    triggerHapticImpact("light");
  };

  const incrementCartItem = (product: Product) => {
    const existing = cartItems.find((entry) => entry.productId === product.id);
    const nextQuantity = existing ? existing.quantity + 1 : product.minPerOrder;
    upsertCartItem(product, nextQuantity);
    triggerHapticImpact("light");
  };

  const removeCartItem = (productId: string) => {
    setCartItems((current) => current.filter((entry) => entry.productId !== productId));
    triggerHapticImpact("light");
  };

  const submitIntent = async () => {
    if (cartRows.length === 0) {
      setIntentError("A kosár üres. Adj hozzá legalább egy terméket.");
      triggerHapticImpact("heavy");
      return;
    }

    if (!hasInitData && !canCheckoutWithoutInitData) {
      setIntentError("Hiányzik a Telegram hitelesítési adat. Nyisd meg ezt az oldalt a bot Mini App gombjából.");
      triggerHapticImpact("heavy");
      return;
    }

    if (!canUseMiniApp) {
      setIntentError(sessionError ?? "A Telegram Mini App session még nem állt fel.");
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
          items: cartRows.map((row) => ({
            productId: row.product.id,
            quantity: row.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as Partial<CreateIntentResponse> & { error?: string };

      if (!response.ok || !payload.clientSecret) {
        throw new Error(payload.error ?? "Nem sikerült létrehozni a Stripe intentet.");
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "telegram-mini-checkout",
          JSON.stringify({
            clientSecret: payload.clientSecret,
            orderId: payload.orderId,
            currency: payload.currency,
            amount: payload.amount,
            items: payload.items,
            checkoutLabel: cartCheckoutLabel,
          }),
        );
      }

      setClientSecret(payload.clientSecret);
      router.push("/telegram-app/checkout");
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
                  const cartEntry = cartItems.find((entry) => entry.productId === product.id);
                  const isActive = Boolean(cartEntry);

                  return (
                    <div
                      key={product.id}
                      className={`border px-4 py-4 text-left transition-colors ${
                        isActive
                          ? "border-[#c98552]/70 bg-[#c98552]/10"
                          : "border-white/10 bg-black/30 hover:border-[#c98552]/28"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.24em] text-white/45">{product.code}</p>
                      <h2 className="mt-2 text-lg font-semibold text-[#fff8f1]">{product.name}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-white/65">{product.description}</p>
                      <p className="mt-3 text-sm text-[#d59b6b]">{product.priceHuf.toLocaleString("hu-HU")} HUF / db</p>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => addToCart(product)}
                          className="border border-[#c98552]/70 bg-[#c98552] px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1b1009]"
                        >
                          Hozzáadás
                        </button>
                        <span className="text-xs text-white/60">
                          {cartEntry ? `Kosárban: ${cartEntry.quantity} db` : `Minimum: ${product.minPerOrder} db`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">02 / Kosár</p>
              {cartRows.length === 0 ? (
                <p className="mt-3 text-sm text-white/55">Még nincs termék a kosárban.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {cartRows.map((row) => (
                    <div key={row.product.id} className="border border-[#c98552]/25 bg-[#120e0b] px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#fff8f1]">{row.product.code}</p>
                          <p className="text-xs text-white/55">{row.product.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(row.product.id)}
                          className="border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/70"
                        >
                          Törlés
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => decrementCartItem(row.product)}
                            className="h-9 w-9 border border-white/15 bg-white/[0.04] text-white"
                          >
                            -
                          </button>
                          <span className="min-w-12 text-center text-lg font-bold text-[#e3b08a]">{row.quantity}</span>
                          <button
                            type="button"
                            onClick={() => incrementCartItem(row.product)}
                            className="h-9 w-9 border border-white/15 bg-white/[0.04] text-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm text-[#d59b6b]">{row.lineTotal.toLocaleString("hu-HU")} HUF</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-white/10 bg-black/25 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">03 / Mission</p>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                A fizetés Telegramon belül marad. A Stripe Elements nem visz ki a chatből, a visszaigazolás pedig a bot csatornán érkezik meg.
              </p>
              {sessionError ? (
                <p className="mt-3 text-sm text-red-300">
                  Mini App session hiba: {sessionError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={submitIntent}
                disabled={loadingIntent || cartRows.length === 0 || (!hasInitData && !canCheckoutWithoutInitData) || !canUseMiniApp}
                className="mt-4 w-full border border-[#c98552]/75 bg-[#c98552] px-4 py-3 text-sm font-bold uppercase tracking-[0.24em] text-[#1b1009] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingIntent ? "Stripe intent készül..." : "Checkout indítása"}
              </button>
              {!hasInitData && !canCheckoutWithoutInitData ? (
                <p className="mt-3 text-sm text-amber-200/80">
                  Telegramon kívül vagy. A fizetéshez indítsd a Mini Appot a bot üzenetében lévő gombbal.
                </p>
              ) : null}
              {!hasInitData && canCheckoutWithoutInitData ? (
                <p className="mt-3 text-sm text-amber-200/80">
                  Fejlesztői mód: Telegram initData nélkül fut a lokális checkout teszt.
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
                  <span>Items</span>
                  <span className="text-white">{cartRows.length}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Quantity</span>
                  <span className="text-white">{cartTotalQuantity} db</span>
                </div>
                <div className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base">
                  <span>Total</span>
                  <span className="text-[#d59b6b]">{cartTotalHuf.toLocaleString("hu-HU")} HUF</span>
                </div>
              </div>
            </div>

            {clientSecret && cartRows.length > 0 && stripePromise ? (
              <div className="border border-[#c98552]/20 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#d59b6b]/70">Stripe Elements</p>
                <div className="mt-4">
                  <Elements stripe={stripePromise} options={stripeOptions ?? undefined}>
                    <TelegramPaymentForm checkoutLabel={cartCheckoutLabel} onClose={() => closeMiniApp()} />
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

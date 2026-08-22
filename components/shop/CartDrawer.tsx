"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useCartStore } from "@/lib/shop/cartStore";
import {
  DELIVERY_METHODS,
  DeliveryMethod,
  getDeliveryFee,
} from "@/lib/shop/delivery";
import { products } from "@/lib/shop/products";
import Link from "next/link";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
  campaign?: PreorderCampaignSummary | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onOpenChange,
  onCheckout,
}) => {
  const {
    items,
    deliveryMethod,
    setDeliveryMethod,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  // Prevent document.body access during SSR / Next.js prerendering.
  const [portalReady, setPortalReady] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /*
   * PORTAL READY
   *
   * This effect only runs in the browser.
   * createPortal(document.body) must never execute during SSR.
   */
  useEffect(() => {
    setPortalReady(true);
  }, []);

  const cartProducts = items.map((item) => {
    const product = products.find(
      (p) => p.id === item.productId,
    );

    return {
      ...item,
      product,
    };
  });

  const subtotal = cartProducts.reduce((sum, item) => {
    const price = item.product?.price ?? 0;

    return sum + price * item.quantity;
  }, 0);

  const deliveryFee = getDeliveryFee(deliveryMethod);
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    onCheckout();
  };

  /*
   * OFFCANVAS OPEN / CLOSE ANIMATION
   *
   * We keep the component mounted briefly while closing
   * so the slide-out animation can finish.
   */
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let animationFrameId: number | undefined;

    if (open) {
      setMounted(true);

      animationFrameId = window.requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);

      timeoutId = setTimeout(() => {
        setMounted(false);
      }, 300);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [open]);

  /*
   * ESCAPE TO CLOSE
   */
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [mounted, onOpenChange]);

  /*
   * PREVENT BACKGROUND SCROLLING
   */
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [mounted]);

  /*
   * FOCUS CLOSE BUTTON WHEN OPEN
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [visible]);

  /*
   * IMPORTANT:
   *
   * During SSR / prerendering there is no document.
   * Wait until the component has mounted in the browser
   * before creating the portal.
   */
  if (!portalReady || !mounted) {
    return null;
  }

  const offcanvas = (
    <div
      className="fixed inset-0 z-[100]"
      aria-hidden={!visible}
    >
      {/* OVERLAY */}
      <div
        className={`
          absolute
          inset-0
          bg-black/75
          backdrop-blur-[2px]
          transition-opacity
          duration-300
          ease-out
          ${
            visible
              ? "opacity-100"
              : "pointer-events-none opacity-0"
          }
        `}
        onMouseDown={(event) => {
          if (
            event.target === event.currentTarget
          ) {
            onOpenChange(false);
          }
        }}
        aria-hidden="true"
      />

      {/* OFFCANVAS PANEL */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-offcanvas-title"
        className={`
          absolute
          right-0
          top-0
          flex
          h-[100dvh]
          w-full
          max-w-[480px]
          flex-col
          border-l
          border-white/10
          bg-black
          font-mono
          text-white
          shadow-[-20px_0_60px_rgba(0,0,0,0.5)]
          transition-transform
          duration-300
          ease-out
          ${
            visible
              ? "translate-x-0"
              : "translate-x-full"
          }
        `}
      >
        {/* HEADER */}
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-white/10
            px-5
            py-5
          "
        >
          <h2
            id="cart-offcanvas-title"
            className="
              text-lg
              font-bold
              uppercase
              tracking-wider
              text-white/90
            "
          >
            Kosár
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Kosár bezárása"
            className="
              flex
              h-9
              w-9
              items-center
              justify-center
              border
              border-white/15
              text-xl
              leading-none
              text-white/50
              transition-colors
              hover:border-lime-400/60
              hover:text-lime-400
              focus:outline-none
              focus:ring-1
              focus:ring-lime-400/60
            "
          >
            ×
          </button>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-5
            py-5
          "
        >
          {cartProducts.length === 0 ? (
            <div
              className="
                flex
                min-h-[50vh]
                items-center
                justify-center
                text-center
                text-sm
                text-white/40
              "
            >
              <div>
                A kosarad üres.
                <br />
                Töltsd meg valamivel, ami nem ciki.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* CART ITEMS */}
              <div className="flex flex-col">
                {cartProducts.map((item) => (
                  <div
                    key={
                      item.productId +
                      (item.variantId || "")
                    }
                    className="
                      flex
                      items-center
                      gap-5
                      border-b
                      border-white/10
                      py-5
                      first:pt-0
                    "
                  >
                    {/* PRODUCT IMAGE */}
                    <img
                      src={item.product?.images?.[0]}
                      alt={item.product?.name ?? ""}
                      className="
                        h-24
                        w-20
                        shrink-0
                        border
                        border-white/10
                        bg-black/60
                        object-contain
                      "
                    />

                    {/* PRODUCT INFO */}
                    <div className="min-w-0 flex-1">
                      <div
                        className="
                          truncate
                          text-sm
                          font-bold
                          uppercase
                          tracking-wider
                          text-white/80
                        "
                      >
                        {item.product?.name}
                      </div>

                      {item.variantId && (
                        <div
                          className="
                            mt-1
                            text-xs
                            text-white/40
                          "
                        >
                          Változat:{" "}
                          <span className="font-bold text-white/70">
                            {item.variantId}
                          </span>
                        </div>
                      )}

                      {/* QUANTITY */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Mennyiség csökkentése"
                          className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            border
                            border-white/20
                            text-white/50
                            transition-colors
                            hover:border-lime-400/50
                            hover:text-lime-400
                          "
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              Math.max(
                                1,
                                item.quantity - 1,
                              ),
                            )
                          }
                        >
                          -
                        </button>

                        <span
                          className="
                            w-8
                            text-center
                            text-sm
                            font-bold
                            text-white/80
                          "
                        >
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          aria-label="Mennyiség növelése"
                          className="
                            flex
                            h-7
                            w-7
                            items-center
                            justify-center
                            border
                            border-white/20
                            text-white/50
                            transition-colors
                            hover:border-lime-400/50
                            hover:text-lime-400
                          "
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity + 1,
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* PRICE / REMOVE */}
                    <div
                      className="
                        flex
                        min-w-[70px]
                        shrink-0
                        flex-col
                        items-end
                        gap-2
                      "
                    >
                      <span
                        className="
                          text-sm
                          font-bold
                          text-lime-400
                        "
                      >
                        {(
                          (item.product?.price ?? 0) *
                          item.quantity
                        ).toLocaleString("hu-HU")}{" "}
                        Ft
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.productId,
                            item.variantId,
                          )
                        }
                        className="
                          text-xs
                          uppercase
                          tracking-wider
                          text-white/30
                          transition-colors
                          hover:text-red-400
                        "
                      >
                        Törlés
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DELIVERY */}
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  border
                  border-white/10
                  bg-black/40
                  p-4
                "
              >
                <div
                  className="
                    text-xs
                    uppercase
                    tracking-[0.2em]
                    text-white/50
                  "
                >
                  Kézbesítés
                </div>

                {(
                  [
                    "dead-drop",
                    "postaautomata",
                  ] as DeliveryMethod[]
                ).map((method) => {
                  const selected =
                    deliveryMethod === method;

                  return (
                    <label
                      key={method}
                      className={`
                        flex
                        cursor-pointer
                        items-start
                        gap-3
                        border
                        px-3
                        py-3
                        transition-colors
                        ${
                          selected
                            ? "border-lime-400/60 bg-lime-400/5"
                            : "border-white/10 bg-black/30 hover:border-white/20"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="cartDeliveryMethod"
                        value={method}
                        checked={selected}
                        onChange={() =>
                          setDeliveryMethod(method)
                        }
                        className="mt-0.5 accent-lime-400"
                      />

                      <div className="flex-1">
                        <div
                          className="
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <span
                            className="
                              text-sm
                              font-bold
                              text-white
                            "
                          >
                            {
                              DELIVERY_METHODS[method]
                                .label
                            }
                          </span>

                          <span
                            className="
                              text-sm
                              font-bold
                              text-lime-400
                            "
                          >
                            {DELIVERY_METHODS[method]
                              .fee === 0
                              ? "benne van"
                              : `+${DELIVERY_METHODS[
                                  method
                                ].fee.toLocaleString(
                                  "hu-HU",
                                )} Ft`}
                          </span>
                        </div>

                        <p
                          className="
                            mt-1
                            text-xs
                            text-white/45
                          "
                        >
                          {
                            DELIVERY_METHODS[method]
                              .description
                          }
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {cartProducts.length > 0 && (
          <div
            className="
              shrink-0
              border-t
              border-white/10
              bg-black
              px-5
              py-5
              pb-[calc(1.25rem+env(safe-area-inset-bottom))]
            "
          >
            <div
              className="
                flex
                w-full
                flex-col
                gap-4
              "
            >
              {/* SUBTOTAL */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  text-sm
                  font-bold
                  uppercase
                  tracking-widest
                  text-white/60
                "
              >
                <span>Részösszeg:</span>

                <span>
                  {subtotal.toLocaleString("hu-HU")} Ft
                </span>
              </div>

              {/* DELIVERY */}
              <div
                className="
                  -mt-2
                  flex
                  items-center
                  justify-between
                  text-sm
                  font-bold
                  uppercase
                  tracking-widest
                  text-white/60
                "
              >
                <span>Kézbesítés:</span>

                <span>
                  {deliveryFee === 0
                    ? "Dead drop / 0 Ft"
                    : `Postaautomata / ${deliveryFee.toLocaleString(
                        "hu-HU",
                      )} Ft`}
                </span>
              </div>

              {/* TOTAL */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-t
                  border-white/10
                  pt-3
                  text-sm
                  font-bold
                  uppercase
                  tracking-widest
                  text-lime-400
                "
              >
                <span>Összesen:</span>

                <span>
                  {total.toLocaleString("hu-HU")} Ft
                </span>
              </div>

              {/* CHECKOUT */}
              <Link
                href="/shop/checkout"
                className="
                  block
                  w-full
                  border
                  border-lime-400/60
                  bg-lime-400/10
                  py-3
                  text-center
                  font-mono
                  text-sm
                  font-bold
                  uppercase
                  tracking-widest
                  text-lime-400
                  transition-colors
                  hover:border-lime-400
                  hover:bg-lime-400/20
                  focus:outline-none
                  focus:ring-1
                  focus:ring-lime-400/60
                "
                onClick={handleCheckout}
              >
                Fizetés Stripe-on
              </Link>

              {/* CLEAR CART */}
              <button
                type="button"
                onClick={clearCart}
                disabled={cartProducts.length === 0}
                className="
                  text-xs
                  uppercase
                  tracking-wider
                  text-white/25
                  transition-colors
                  hover:text-red-400
                  disabled:opacity-30
                "
              >
                Kosár ürítése
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );

  /*
   * PORTAL
   *
   * Rendering directly into document.body prevents the
   * offcanvas from being constrained by parent stacking
   * contexts or overflow rules.
   *
   * portalReady guarantees that document.body exists.
   */
  return createPortal(offcanvas, document.body);
};
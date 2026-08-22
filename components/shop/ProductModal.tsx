"use client";

import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { POSTA_AUTOMATA_FEE } from "@/lib/shop/delivery";
import {
  Product,
  isPreorderProduct,
} from "@/lib/shop/products";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  onAddToCart: (size?: string) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  campaign?: PreorderCampaignSummary | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  open,
  onOpenChange,
  product,
  selectedSize,
  onSelectSize,
  onAddToCart,
  quantity,
  setQuantity,
  campaign,
}) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

  const closeButtonRef =
    useRef<HTMLButtonElement>(null);

  /*
   * Client / portal readiness
   */
  useEffect(() => {
    setPortalReady(true);
  }, []);

  /*
   * DEBUG
   *
   * Ez segít ellenőrizni, hogy a page.tsx
   * ténylegesen megnyitja-e a modalt.
   */
  useEffect(() => {
    console.log("[ProductModal]", {
      open,
      productId: product?.id,
      productName: product?.name,
      selectedSize,
      mounted,
      visible,
    });
  }, [
    open,
    product?.id,
    product?.name,
    selectedSize,
    mounted,
    visible,
  ]);

  /*
   * Reset gallery when product changes
   */
  useEffect(() => {
    setImageIndex(0);
  }, [product?.id]);

  /*
   * Mount / unmount offcanvas
   */
  useEffect(() => {
    let timeoutId:
      | ReturnType<typeof setTimeout>
      | undefined;

    let animationFrameId:
      | number
      | undefined;

    if (open && product) {
      console.log(
        "[ProductModal] OPENING",
        product.id,
      );

      setMounted(true);

      animationFrameId =
        window.requestAnimationFrame(() => {
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

      if (animationFrameId !== undefined) {
        window.cancelAnimationFrame(
          animationFrameId,
        );
      }
    };
  }, [open, product]);

  /*
   * ESC closes modal
   */
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
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
   * Lock body scroll while open
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
   * Focus close button
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
   * Nothing to render if:
   * - no product
   * - portal is not ready
   * - component is not mounted
   */
  if (
    !product ||
    !portalReady ||
    !mounted
  ) {
    return null;
  }

  const galleryImages =
    product.images?.length > 0
      ? product.images
      : ["/s1.jpg"];

  const hasGallery =
    galleryImages.length > 1;

  const requiresVariant =
    Boolean(
      product.sizes?.length ||
      product.colorStock,
    );

  const selectedImage =
    product.type === "bag"
      ? selectedSize === "Pink"
        ? "/pink.jpg"
        : selectedSize === "Fekete"
          ? "/ny.jpg"
          : galleryImages[imageIndex]
      : galleryImages[imageIndex];

  /*
   * Gallery
   */
  const showPrev = (
    event?: React.MouseEvent,
  ) => {
    event?.stopPropagation();

    setImageIndex(
      (prev) =>
        (prev - 1 + galleryImages.length) %
        galleryImages.length,
    );
  };

  const showNext = (
    event?: React.MouseEvent,
  ) => {
    event?.stopPropagation();

    setImageIndex(
      (prev) =>
        (prev + 1) %
        galleryImages.length,
    );
  };

  /*
   * ADD TO CART
   */
  const handleAddToCart = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    console.log(
      "[ProductModal] ADD TO CART CLICK",
      {
        productId: product.id,
        productName: product.name,
        selectedSize,
        quantity,
        requiresVariant,
        stock: product.stock,
      },
    );

    /*
     * Product unavailable
     */
    if (product.stock === 0) {
      console.warn(
        "[ProductModal] BLOCKED: product out of stock",
      );
      return;
    }

    /*
     * Variant required but not selected
     */
    if (
      requiresVariant &&
      !selectedSize
    ) {
      console.warn(
        "[ProductModal] BLOCKED: variant required",
      );
      return;
    }

    console.log(
      "[ProductModal] CALLING onAddToCart",
      {
        productId: product.id,
        selectedSize,
      },
    );

    onAddToCart(selectedSize);
  };

  /*
   * Close when clicking backdrop
   */
  const handleOverlayMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (
      event.target ===
      event.currentTarget
    ) {
      onOpenChange(false);
    }
  };

  const isPreorder =
    isPreorderProduct(product);

  const productModal = (
    <div
      className="
        fixed
        inset-0
        z-[99998]
        isolate
      "
      data-product-modal="true"
    >
      {/* BACKDROP */}
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
        onMouseDown={
          handleOverlayMouseDown
        }
        aria-hidden="true"
      />

      {/* OFFCANVAS */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-offcanvas-title"
        data-product-offcanvas="true"
        className={`
          absolute
          right-0
          top-0
          z-[99999]
          flex
          h-[100dvh]
          w-full
          max-w-[560px]
          flex-col
          border-l
          border-white/10
          bg-black
          font-mono
          text-white
          shadow-[-20px_0_60px_rgba(0,0,0,0.6)]
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
            items-start
            justify-between
            gap-4
            border-b
            border-white/10
            px-5
            py-5
          "
        >
          <div className="min-w-0">
            <h2
              id="product-offcanvas-title"
              className="
                text-xl
                font-bold
                uppercase
                tracking-wider
                text-white/90
              "
            >
              {product.name}
            </h2>

            <div
              className="
                mt-2
                flex
                flex-col
                gap-1
                text-sm
              "
            >
              <span
                className="
                  text-lg
                  font-bold
                  text-lime-400
                "
              >
                Dead drop:{" "}
                {product.price.toLocaleString(
                  "hu-HU",
                )}{" "}
                Ft
              </span>

              <span
                className="
                  text-white/50
                "
              >
                Postaautomata:{" "}
                {(
                  product.price +
                  POSTA_AUTOMATA_FEE
                ).toLocaleString(
                  "hu-HU",
                )}{" "}
                Ft
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={() =>
              onOpenChange(false)
            }
            aria-label="Termék bezárása"
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              border
              border-white/15
              text-white/50
              transition-colors
              hover:border-lime-400/60
              hover:text-lime-400
              focus:outline-none
              focus:ring-1
              focus:ring-lime-400/60
            "
          >
            <X size={18} />
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
          <div
            className="
              flex
              flex-col
              gap-6
              pb-4
            "
          >
            {/* DESCRIPTION */}
            <div
              className="
                text-sm
                leading-relaxed
                text-white/50
              "
            >
              {product.description}
            </div>

            {/* IMAGE */}
            <div
              className="
                relative
                aspect-[4/5]
                w-full
                overflow-hidden
                border
                border-white/10
                bg-black/60
              "
            >
              <img
                src={selectedImage}
                alt={product.name}
                className="
                  h-full
                  w-full
                  object-contain
                  grayscale
                  transition-all
                  duration-500
                  hover:grayscale-0
                "
                onError={(event) => {
                  event.currentTarget.onerror =
                    null;

                  event.currentTarget.src =
                    galleryImages[0];
                }}
              />

              {hasGallery && (
                <>
                  <button
                    type="button"
                    className="
                      absolute
                      left-2
                      top-1/2
                      z-10
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      items-center
                      justify-center
                      border
                      border-white/20
                      bg-black/70
                      text-white/50
                      transition-all
                      hover:border-lime-400/60
                      hover:text-lime-400
                    "
                    onClick={showPrev}
                    aria-label="Előző kép"
                  >
                    <ChevronLeft
                      size={16}
                    />
                  </button>

                  <button
                    type="button"
                    className="
                      absolute
                      right-2
                      top-1/2
                      z-10
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      items-center
                      justify-center
                      border
                      border-white/20
                      bg-black/70
                      text-white/50
                      transition-all
                      hover:border-lime-400/60
                      hover:text-lime-400
                    "
                    onClick={showNext}
                    aria-label="Következő kép"
                  >
                    <ChevronRight
                      size={16}
                    />
                  </button>

                  <div
                    className="
                      absolute
                      bottom-2
                      left-1/2
                      flex
                      -translate-x-1/2
                      items-center
                      gap-1.5
                    "
                  >
                    {galleryImages.map(
                      (_, index) => (
                        <span
                          key={`gallery-dot-${index}`}
                          className={`
                            h-1.5
                            w-1.5
                            rounded-full
                            ${
                              index ===
                              imageIndex
                                ? "bg-lime-400"
                                : "bg-white/30"
                            }
                          `}
                        />
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            {/* PREORDER */}
            {isPreorder &&
              campaign && (
                <PreorderCampaignPanel
                  campaign={campaign}
                />
              )}

            {/* SIZE */}
            {product.sizes &&
              product.sizes.length > 0 && (
                <div
                  className="
                    flex
                    flex-col
                    gap-2
                  "
                >
                  <div
                    className="
                      mb-2
                      font-mono
                      text-xs
                      uppercase
                      tracking-widest
                      text-white/50
                    "
                  >
                    Méret:
                  </div>

                  <div
                    className="
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    {product.sizes.map(
                      (size) => {
                        const stock =
                          product.sizeStock?.[
                            size
                          ];

                        const soldOut =
                          stock !==
                            undefined &&
                          stock <= 0;

                        const low =
                          stock !==
                            undefined &&
                          stock > 0 &&
                          stock <= 3;

                        return (
                          <button
                            key={size}
                            type="button"
                            disabled={
                              soldOut
                            }
                            className={`
                              flex
                              flex-col
                              items-center
                              border
                              px-4
                              py-2
                              text-sm
                              font-bold
                              tracking-widest
                              transition-all
                              disabled:cursor-not-allowed
                              disabled:opacity-30
                              ${
                                selectedSize ===
                                size
                                  ? "border-lime-400 bg-lime-400/10 text-lime-400"
                                  : soldOut
                                    ? "border-white/10 text-white/25"
                                    : "border-white/20 text-white/50 hover:border-lime-400/50 hover:text-lime-400"
                              }
                            `}
                            onClick={() => {
                              if (
                                !soldOut
                              ) {
                                console.log(
                                  "[ProductModal] SIZE SELECTED",
                                  size,
                                );

                                onSelectSize?.(
                                  size,
                                );
                              }
                            }}
                          >
                            <span>
                              {size}
                            </span>

                            {stock !==
                              undefined && (
                              <span
                                className={`
                                  mt-0.5
                                  text-[10px]
                                  font-normal
                                  tracking-normal
                                  ${
                                    soldOut
                                      ? "text-white/20"
                                      : low
                                        ? "text-amber-400/80"
                                        : "text-white/30"
                                  }
                                `}
                              >
                                {soldOut
                                  ? "elfogyott"
                                  : `${stock} db`}
                              </span>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

            {/* COLOR */}
            {product.colorStock && (
              <div
                className="
                  flex
                  flex-col
                  gap-2
                "
              >
                <div
                  className="
                    mb-2
                    font-mono
                    text-xs
                    uppercase
                    tracking-widest
                    text-white/50
                  "
                >
                  Szín:
                </div>

                <div
                  className="
                    flex
                    flex-wrap
                    gap-2
                  "
                >
                  {Object.entries(
                    product.colorStock,
                  ).map(
                    ([color, stock]) => {
                      const soldOut =
                        stock <= 0;

                      const low =
                        stock > 0 &&
                        stock <= 3;

                      return (
                        <button
                          key={color}
                          type="button"
                          disabled={
                            soldOut
                          }
                          className={`
                            flex
                            flex-col
                            items-center
                            border
                            px-4
                            py-2
                            text-sm
                            font-bold
                            tracking-widest
                            transition-all
                            disabled:cursor-not-allowed
                            disabled:opacity-30
                            ${
                              selectedSize ===
                              color
                                ? "border-lime-400 bg-lime-400/10 text-lime-400"
                                : soldOut
                                  ? "border-white/10 text-white/25"
                                  : "border-white/20 text-white/50 hover:border-lime-400/50 hover:text-lime-400"
                            }
                          `}
                          onClick={() => {
                            if (
                              !soldOut
                            ) {
                              console.log(
                                "[ProductModal] COLOR SELECTED",
                                color,
                              );

                              onSelectSize?.(
                                color,
                              );
                            }
                          }}
                        >
                          <span>
                            {color}
                          </span>

                          <span
                            className={`
                              mt-0.5
                              text-[10px]
                              font-normal
                              tracking-normal
                              ${
                                soldOut
                                  ? "text-white/20"
                                  : low
                                    ? "text-amber-400/80"
                                    : "text-white/30"
                              }
                            `}
                          >
                            {soldOut
                              ? "elfogyott"
                              : `${stock} db`}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* QUANTITY */}
            <div
              className="
                flex
                items-center
                gap-4
                font-mono
              "
            >
              <span
                className="
                  text-xs
                  uppercase
                  tracking-widest
                  text-white/40
                "
              >
                Mennyiség:
              </span>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <button
                  type="button"
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    border
                    border-white/20
                    text-white/60
                    transition-all
                    hover:border-lime-400/50
                    hover:text-lime-400
                  "
                  onClick={() =>
                    setQuantity(
                      Math.max(
                        1,
                        quantity - 1,
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
                    text-base
                    font-bold
                    text-white/80
                  "
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    border
                    border-white/20
                    text-white/60
                    transition-all
                    hover:border-lime-400/50
                    hover:text-lime-400
                  "
                  onClick={() =>
                    setQuantity(
                      quantity + 1,
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            shrink-0
            border-t
            border-white/10
            bg-black
            px-5
            py-4
            pb-[calc(1rem+env(safe-area-inset-bottom))]
          "
        >
          <button
            type="button"
            className="
              w-full
              border
              border-lime-400/60
              bg-lime-400/10
              py-3
              font-mono
              text-sm
              font-bold
              uppercase
              tracking-widest
              text-lime-400
              transition-all
              hover:border-lime-400
              hover:bg-lime-400/20
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
            onClick={handleAddToCart}
            disabled={
              product.stock === 0 ||
              (requiresVariant &&
                !selectedSize)
            }
          >
            Kosárba
          </button>

          {product.stock === 0 && (
            <div
              className="
                mt-2
                border
                border-red-400/20
                bg-red-400/5
                px-3
                py-2
                text-center
                text-xs
                uppercase
                tracking-wider
                text-red-400/80
              "
            >
              Nincs készleten
            </div>
          )}
        </div>
      </aside>
    </div>
  );

  /*
   * Portal
   */
  return createPortal(
    productModal,
    document.body,
  );
};
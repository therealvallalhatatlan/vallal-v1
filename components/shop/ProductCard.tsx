"use client";

import React, { useState } from "react";
import { Montserrat } from "next/font/google";
import { POSTA_AUTOMATA_FEE } from "@/lib/shop/delivery";
import { Product } from "@/lib/shop/products";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: "800",
});

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  campaign?: PreorderCampaignSummary | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
}) => {
  const [imageIndex, setImageIndex] = useState(0);

  const hasGallery = product.images.length > 1;

  const currentImage =
    product.images[imageIndex] ?? product.images[0];

  const handleCardClick = () => {
    console.log("[ProductCard] opening product:", product.id);
    onClick();
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  const showPrev = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    setImageIndex(
      (prev) =>
        (prev - 1 + product.images.length) %
        product.images.length,
    );
  };

  const showNext = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();

    setImageIndex(
      (prev) =>
        (prev + 1) % product.images.length,
    );
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${product.name} megnyitása`}
      className="
        group
        relative
        flex
        cursor-pointer
        flex-col
        overflow-hidden
        rounded-md
        border
        border-zinc-800
        bg-[#050505]
        transition-all
        duration-200
        hover:border-zinc-600
        focus:outline-none
        focus:ring-1
        focus:ring-lime-400/60
      "
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      {/* IMAGE */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        <img
          src={currentImage}
          alt={product.name}
          className="
            h-full
            w-full
            object-contain
            grayscale
            transition-all
            duration-300
            group-hover:grayscale-0
            group-hover:scale-[1.015]
          "
          loading="lazy"
        />

        {/* CRT / scanline overlay */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.035]
            [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)]
            [background-size:100%_4px]
          "
        />

        {/* Vignette */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            bg-gradient-to-t
            from-black/70
            via-transparent
            to-black/10
          "
        />

        {/* Coming Soon */}
        {product.comingSoon && (
          <Badge
            variant="destructive"
            className="
              absolute
              right-3
              top-3
              rounded-sm
              border
              border-zinc-700
              bg-black/80
              px-2.5
              py-1
              text-[8px]
              uppercase
              tracking-[0.16em]
              text-zinc-200
              backdrop-blur-sm
            "
            style={{
              fontFamily: "var(--font-mono-tech)",
            }}
          >
            Coming Soon
          </Badge>
        )}

        {/* SHIRT STATUS */}
        {(product.type === "men-shirt" ||
          product.type === "women-shirt") && (
          <div
            className="
              absolute
              left-3
              top-3
              flex
              items-center
              gap-2
            "
          >
            <Badge
              className="
                rounded-md
                border
                border-zinc-100/10
                bg-black/80
                px-2.5
                py-1
                text-xs
                uppercase
                tracking-[0.14em]
                text-lime-100
                hover:bg-black/90
              "
              style={{
                fontFamily: "var(--font-mono-tech)",
              }}
            >
              Raktáron
            </Badge>

            <span
              className="
                text-xs
                uppercase
                leading-tight
                tracking-[0.08em]
                text-zinc-500
              "
              style={{
                fontFamily: "var(--font-mono-tech)",
              }}
            >
              Limitált készlet
            </span>
          </div>
        )}

        {/* BAG STATUS */}
        {product.type === "bag" && (
          <div
            className="
              absolute
              left-3
              top-3
              flex
              items-center
              gap-2
            "
          >
            <Badge
              className="
                rounded-md
                border
                border-zinc-100/20
                bg-black/80
                px-2.5
                py-1
                text-xs
                uppercase
                tracking-[0.14em]
                text-zinc-200
                backdrop-blur-sm
                hover:bg-black/90
              "
              style={{
                fontFamily: "var(--font-mono-tech)",
              }}
            >
              Raktáron
            </Badge>

            <span
              className="
                text-[8px]
                uppercase
                leading-tight
                tracking-[0.08em]
                text-zinc-500
              "
              style={{
                fontFamily: "var(--font-mono-tech)",
              }}
            >
              Pink: {product.colorStock?.Pink ?? 0} db / Fekete:{" "}
              {product.colorStock?.Fekete ?? 0} db
            </span>
          </div>
        )}

        {/* GALLERY CONTROLS */}
        {hasGallery && (
          <>
            <button
              type="button"
              className="
                absolute
                bottom-3
                left-3
                z-10
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-sm
                border
                border-zinc-700
                bg-black/75
                text-zinc-500
                backdrop-blur-sm
                transition-colors
                hover:border-lime-400/50
                hover:bg-black
                hover:text-lime-300
              "
              onClick={showPrev}
              aria-label="Előző kép"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              className="
                absolute
                bottom-3
                right-3
                z-10
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-sm
                border
                border-zinc-700
                bg-black/75
                text-zinc-500
                backdrop-blur-sm
                transition-colors
                hover:border-lime-400/50
                hover:bg-black
                hover:text-lime-300
              "
              onClick={showNext}
              aria-label="Következő kép"
            >
              <ChevronRight size={15} />
            </button>
          </>
        )}
      </div>

      {/* PRODUCT INFO */}
      <div
        className="
          relative
          flex
          flex-1
          flex-col
          border-t
          border-zinc-800
          bg-[#050505]
          p-4
        "
      >
        {/* subtle scanline */}
        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.018]
            [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)]
            [background-size:100%_4px]
          "
        />

        <div className="relative">
          <h3
            className={`
              ${montserrat.className}
              text-base
              uppercase
              leading-[0.95]
              tracking-[-0.025em]
              text-zinc-100
            `}
          >
            {product.name}
          </h3>
        </div>

        {/* PRICE */}
        <div
          className="
            relative
            mt-5
            flex
            flex-col
            gap-2
            border-t
            border-zinc-900
            pt-3
          "
          style={{
            fontFamily: "var(--font-mono-tech)",
          }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span
              className="
                text-md
                uppercase
                tracking-[0.16em]
                text-zinc-600
              "
            >
              DEAD DROP
            </span>

            <span
              className="
                text-md
                font-bold
                tracking-[0.08em]
                text-lime-300
              "
            >
              {product.price.toLocaleString("hu-HU")} Ft
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-3">
            <span
              className="
                text-md
                uppercase
                tracking-[0.16em]
                text-zinc-700
              "
            >
              POSTAAUTOMATA
            </span>

            <span
              className="
                text-md
                tracking-[0.06em]
                text-zinc-600
              "
            >
              {(
                product.price +
                POSTA_AUTOMATA_FEE
              ).toLocaleString("hu-HU")}{" "}
              Ft
            </span>
          </div>
        </div>

        {/* BOTTOM STATUS */}
        <div
          className="
            relative
            mt-4
            flex
            items-center
            justify-between
            border-t
            border-zinc-900
            pt-3
          "
          style={{
            fontFamily: "var(--font-mono-tech)",
          }}
        >
          <span
            className="
              text-[7px]
              uppercase
              tracking-[0.18em]
              text-zinc-700
            "
          >
            SHOP
          </span>

          <span
            className="
              text-md
              text-zinc-700
              transition-colors
              group-hover:text-lime-400
            "
          >
            ↗
          </span>
        </div>
      </div>
    </div>
  );
};
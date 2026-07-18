import React, { useState } from "react";
import { motion } from "framer-motion";
import { POSTA_AUTOMATA_FEE } from "@/lib/shop/delivery";
import { Product, isPreorderProduct } from "@/lib/shop/products";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  campaign?: PreorderCampaignSummary | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, campaign }) => {
  const [imageIndex, setImageIndex] = useState(0);
  const hasGallery = product.images.length > 1;
  const currentImage = product.images[imageIndex] ?? product.images[0];

  const showPrev = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const showNext = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev + 1) % product.images.length);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.015, boxShadow: "0 0 28px 0 rgba(163,230,53,0.12)" }}
      className="group relative flex flex-col border border-white/10 bg-black/80 overflow-hidden cursor-pointer transition-all duration-200 hover:border-lime-400/50 font-mono"
      onClick={onClick}
    >
      <div className="relative aspect-[4/5] w-full bg-black/60 flex items-center justify-center overflow-hidden">
        <img
          src={currentImage}
          alt={product.name}
          className="object-contain w-full h-full grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          loading="lazy"
        />
        {product.comingSoon && (
          <Badge variant="destructive" className="absolute top-2 right-2">Coming Soon</Badge>
        )}
        {(product.type === 'men-shirt' || product.type === 'women-shirt') && (
          <div className="absolute top-2 left-2 flex flex-row gap-2 items-center">
            <Badge className="border border-neutral-500 bg-lime-400 text-neutral-800 font-bold hover:bg-lime-400">Raktáron</Badge>
            <span className="text-[10px] text-neutral-400 leading-tight">Limitált készlet / gyorsan fogy</span>
          </div>
        )}
        {product.type === 'pin' && (
          <div className="absolute top-2 left-2 flex flex-row gap-2 items-center">
            <Badge className="border border-neutral-500 bg-lime-400 text-neutral-800 font-bold hover:bg-lime-400">Raktáron</Badge>
            <span className="text-[10px] text-neutral-400 leading-tight">Csomagautomata / dead drop</span>
          </div>
        )}
        {product.type === 'bag' && (
          <div className="absolute top-2 left-2 flex flex-row gap-2 items-center">
            <Badge className="border border-neutral-500 bg-lime-400 text-neutral-800 font-bold hover:bg-lime-400">Raktáron</Badge>
            <span className="text-[10px] text-neutral-400 leading-tight">
              Pink: {product.colorStock?.Pink ?? 0} db / Fekete: {product.colorStock?.Fekete ?? 0} db
            </span>
          </div>
        )}
        {hasGallery && (
          <>
            <button
              className="absolute bottom-2 left-2 z-10 bg-black/70 border border-white/20 text-white/50 p-2 hover:border-lime-400/60 hover:text-lime-400 transition-all"
              onClick={showPrev}
              aria-label="Előző kép"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="absolute bottom-2 right-2 z-10 bg-black/70 border border-white/20 text-white/50 p-2 hover:border-lime-400/60 hover:text-lime-400 transition-all"
              onClick={showNext}
              aria-label="Következő kép"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col p-4 gap-2">
        <h3 className="text-sm font-bold text-white/80 uppercase tracking-wider mb-1">{product.name}</h3>
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-bold text-lime-400">Dead drop: {product.price} Ft</span>
          <span className="text-white/50">Postaautomata: {product.price + POSTA_AUTOMATA_FEE} Ft</span>
        </div>
      </div>

    </motion.div>
  );
};

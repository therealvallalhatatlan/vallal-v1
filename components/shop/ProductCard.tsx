import React, { useState } from "react";
import { motion } from "framer-motion";
import { Product, isPreorderProduct } from "@/lib/shop/products";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  campaign?: PreorderCampaignSummary | null;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, campaign }) => {
  const [showBack, setShowBack] = useState(false);
  const hasBack = product.images.length > 1;
  const currentImage = hasBack && showBack ? product.images[1] : product.images[0];

  return (
    <motion.div
      whileHover={{ scale: 1.025, boxShadow: "0 4px 32px 0 rgba(0,255,128,0.10)" }}
      className="group relative flex flex-col rounded-3xl border border-neutral-800 bg-black/80 shadow-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-lime-400"
      onClick={onClick}
    >
      <div className="relative aspect-[4/5] w-full bg-neutral-900 flex items-center justify-center overflow-hidden">
        <img
          src={currentImage}
          alt={product.name}
          className="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.comingSoon && (
          <Badge variant="destructive" className="absolute top-2 right-2">Coming Soon</Badge>
        )}
        {(product.type === 'men-shirt' || product.type === 'women-shirt') && (
          <div className="absolute top-2 left-2 flex flex-row gap-2 items-center">
            <Badge className="border border-neutral-500 bg-lime-400/0 text-neutral-400 font-bold hover:bg-lime-400">Előrendelhető</Badge>
            <span className="text-[10px] text-neutral-400 leading-tight">Várható érkezés: 2026.05.26.</span>
          </div>
        )}
        {product.type === 'pin' && (
          <div className="absolute top-2 left-2 flex flex-row gap-2 items-center">
            <Badge className="border border-neutral-500 bg-lime-400 text-neutral-800 font-bold hover:bg-lime-400">Raktáron</Badge>
            <span className="text-[10px] text-neutral-400 leading-tight">Csomagautomata / dead drop</span>
          </div>
        )}
        {hasBack && (
          <button
            className="absolute bottom-2 right-2 z-10 bg-black/70 border border-neutral-600 text-neutral-300 rounded-full p-2 hover:bg-lime-400 hover:text-black hover:border-lime-400 transition-all"
            onClick={(e) => { e.stopPropagation(); setShowBack((v) => !v); }}
            aria-label="Megfordítás"
          >
            <RefreshCw size={16} className={showBack ? 'scale-x-[-1]' : ''} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 gap-3">
        <h3 className="text-xl font-extrabold text-white drop-shadow-sm mb-1">{product.name}</h3>
        <span className="text-2xl font-black text-lime-400 mb-2">{product.price} Ft</span>
      </div>

    </motion.div>
  );
};

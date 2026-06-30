
import React from "react";
import { Product, isPreorderProduct } from "@/lib/shop/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  if (!product) return null;
  const requiresVariant = Boolean(product.sizes?.length || product.colorStock);
  const selectedImage =
    product.type === "bag"
      ? selectedSize === "Pink"
        ? "/pink.jpg"
        : selectedSize === "Fekete"
        ? "/ny.jpg"
        : product.images[0]
      : product.images[0];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full bg-black border-l border-white/10 flex flex-col font-mono">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold text-white/90 tracking-wider uppercase mb-1">{product.name}</SheetTitle>
          <span className="text-lg font-bold text-lime-400 mb-1">{product.price} Ft</span>
          <SheetDescription className="text-white/50 text-sm font-mono">
            {product.description}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3">
          {/* Hero image + gallery */}
          <div className="w-full aspect-[4/5] bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage}
              alt={product.name}
              className="object-contain w-full h-full grayscale hover:grayscale-0 transition-all duration-500"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = product.images[0];
              }}
            />
          </div>
          {/* Size selector */}
          {product.sizes && (
            <div className="flex flex-col gap-2">
              <div className="font-mono text-xs uppercase tracking-widest text-white/50 mb-2">Méret:</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const stock = product.sizeStock?.[size];
                  const soldOut = stock !== undefined && stock <= 0;
                  const low = stock !== undefined && stock > 0 && stock <= 3;
                  return (
                    <button
                      key={size}
                      disabled={soldOut}
                      className={`flex flex-col items-center px-4 py-2 text-sm font-bold tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedSize === size
                          ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                          : soldOut
                          ? 'border-white/10 text-white/25'
                          : 'border-white/20 text-white/50 hover:border-lime-400/50 hover:text-lime-400'
                      }`}
                      onClick={() => !soldOut && onSelectSize?.(size)}
                    >
                      <span>{size}</span>
                      {stock !== undefined && (
                        <span className={`text-[10px] font-normal mt-0.5 tracking-normal ${
                          soldOut ? 'text-white/20' : low ? 'text-amber-400/80' : 'text-white/30'
                        }`}>
                          {soldOut ? 'elfogyott' : `${stock} db`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {product.colorStock && (
            <div className="flex flex-col gap-2">
              <div className="font-mono text-xs uppercase tracking-widest text-white/50 mb-2">Szín:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(product.colorStock).map(([color, stock]) => {
                  const soldOut = stock <= 0;
                  const low = stock > 0 && stock <= 3;
                  return (
                    <button
                      key={color}
                      disabled={soldOut}
                      className={`flex flex-col items-center px-4 py-2 text-sm font-bold tracking-widest border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        selectedSize === color
                          ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                          : soldOut
                          ? 'border-white/10 text-white/25'
                          : 'border-white/20 text-white/50 hover:border-lime-400/50 hover:text-lime-400'
                      }`}
                      onClick={() => !soldOut && onSelectSize?.(color)}
                    >
                      <span>{color}</span>
                      <span className={`text-[10px] font-normal mt-0.5 tracking-normal ${
                        soldOut ? 'text-white/20' : low ? 'text-amber-400/80' : 'text-white/30'
                      }`}>
                        {soldOut ? 'elfogyott' : `${stock} db`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* Quantity selector */}
          <div className="flex items-center gap-4 mt-2 font-mono">
            <span className="text-white/40 text-xs tracking-widest uppercase">Mennyiség:</span>
            <div className="flex items-center gap-2">
              <button className="border border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 w-8 h-8 flex items-center justify-center transition-all" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <span className="text-base font-bold text-white/80 w-8 text-center">{quantity}</span>
              <button className="border border-white/20 hover:border-lime-400/50 text-white/60 hover:text-lime-400 w-8 h-8 flex items-center justify-center transition-all" onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
          </div>

        </div>
        {/* Sticky Add to Cart CTA */}
        <div className="sticky bottom-0 left-0 right-0 bg-black py-3 px-4 z-10 flex flex-col gap-2 border-t border-white/10">
          <button
            className="w-full border border-lime-400/60 bg-lime-400/10 hover:bg-lime-400/20 hover:border-lime-400 text-lime-400 font-mono font-bold text-sm tracking-widest uppercase py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => onAddToCart(selectedSize)}
            disabled={product.stock === 0 || (requiresVariant && !selectedSize)}
          >
            Kosárba
          </button>
          {(product.stock === 0) && (
            <Badge variant="destructive">Nincs készleten</Badge>
          )}
        </div>
        <SheetClose />
      </SheetContent>
    </Sheet>
  );
};


import React, { useEffect, useState } from "react";
import { POSTA_AUTOMATA_FEE } from "@/lib/shop/delivery";
import { Product, isPreorderProduct } from "@/lib/shop/products";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [product.id]);

  const galleryImages = product.images.length > 0 ? product.images : ["/s1.jpg"];
  const hasGallery = galleryImages.length > 1;
  const requiresVariant = Boolean(product.sizes?.length || product.colorStock);
  const selectedImage =
    product.type === "bag"
      ? selectedSize === "Pink"
        ? "/pink.jpg"
        : selectedSize === "Fekete"
        ? "/ny.jpg"
        : galleryImages[imageIndex]
      : galleryImages[imageIndex];

  const showPrev = () => {
    setImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const showNext = () => {
    setImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full bg-black border-l border-white/10 flex flex-col font-mono">
        <SheetHeader>
          <SheetTitle className="text-xl font-bold text-white/90 tracking-wider uppercase mb-1">{product.name}</SheetTitle>
          <div className="mb-1 flex flex-col gap-1 text-sm font-mono">
            <span className="text-lg font-bold text-lime-400">Dead drop: {product.price} Ft</span>
            <span className="text-white/50">Postaautomata: {product.price + POSTA_AUTOMATA_FEE} Ft</span>
          </div>
          <SheetDescription className="text-white/50 text-sm font-mono">
            {product.description}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3">
          {/* Hero image + gallery */}
          <div className="relative w-full aspect-[4/5] bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage}
              alt={product.name}
              className="object-contain w-full h-full grayscale hover:grayscale-0 transition-all duration-500"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = galleryImages[0];
              }}
            />
            {hasGallery && (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/70 border border-white/20 text-white/50 p-2 hover:border-lime-400/60 hover:text-lime-400 transition-all"
                  onClick={showPrev}
                  aria-label="Előző kép"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/70 border border-white/20 text-white/50 p-2 hover:border-lime-400/60 hover:text-lime-400 transition-all"
                  onClick={showNext}
                  aria-label="Következő kép"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {galleryImages.map((_, idx) => (
                    <span
                      key={`gallery-dot-${idx}`}
                      className={`h-1.5 w-1.5 rounded-full ${idx === imageIndex ? "bg-lime-400" : "bg-white/30"}`}
                    />
                  ))}
                </div>
              </>
            )}
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

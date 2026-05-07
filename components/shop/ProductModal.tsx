
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full bg-black/95 border-l border-lime-400/20 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-3xl font-black text-lime-400 drop-shadow mb-1">{product.name}</SheetTitle>
          <span className="text-2xl font-extrabold text-white mb-1">{product.price} Ft</span>
          <SheetDescription className="text-neutral-300 text-base">
            {product.description}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3">
          {/* Hero image + gallery */}
          <div className="w-full aspect-[4/5] bg-neutral-900 rounded-2xl flex items-center justify-center overflow-hidden">
            <img src={product.images[0]} alt={product.name} className="object-contain w-full h-full" />
          </div>
          {/* Size selector */}
          {product.sizes && (
            <div className="flex flex-col gap-2">
              <div className="font-semibold text-neutral-200 mb-1">Méret:</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    className="px-4 py-1 text-base rounded-full font-bold"
                    onClick={() => onSelectSize?.(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {/* Quantity selector */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-neutral-400">Mennyiség:</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
              <span className="text-lg font-bold text-white w-8 text-center">{quantity}</span>
              <Button size="sm" variant="outline" onClick={() => setQuantity(quantity + 1)}>+</Button>
            </div>
          </div>

        </div>
        {/* Sticky Add to Cart CTA */}
        <div className="sticky bottom-0 left-0 right-0 bg-black/95 py-3 px-4 z-10 flex flex-col gap-2 border-t border-neutral-800">
          <Button
            size="lg"
            className="bg-lime-400 text-black hover:bg-lime-300 font-black text-lg shadow w-full"
            onClick={() => onAddToCart(selectedSize)}
            disabled={product.stock === 0 || (product.sizes && !selectedSize)}
          >
            Kosárba
          </Button>
          {(product.stock === 0) && (
            <Badge variant="destructive">Nincs készleten</Badge>
          )}
        </div>
        <SheetClose />
      </SheetContent>
    </Sheet>
  );
};

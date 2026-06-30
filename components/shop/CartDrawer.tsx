
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/shop/cartStore";
import { products } from "@/lib/shop/products";
import Link from "next/link";
import { PreorderCampaignSummary } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
  campaign?: PreorderCampaignSummary | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ open, onOpenChange, onCheckout, campaign }) => {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const cartProducts = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  });
  const total = cartProducts.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  // Debug log for checkout error
  const handleCheckout = () => {
    console.log("[CartDrawer] items:", items);
    console.log("[CartDrawer] cartProducts:", cartProducts);
    onCheckout();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md w-full bg-black border-l border-white/10 flex flex-col font-mono">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold text-white/90 tracking-wider uppercase">Kosár</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 mt-6 flex-1 overflow-y-auto px-1">
          {cartProducts.length === 0 ? (
            <div className="text-white/40 text-center py-16 text-sm font-mono">A kosarad üres.<br />Töltsd meg valamivel, ami nem ciki.</div>
          ) : (
            cartProducts.map((item) => (
              <div key={item.productId + (item.variantId || "")}
                className="flex items-center gap-5 border-b border-white/10 pb-6">
                <img src={item.product?.images[0]} alt={item.product?.name} className="w-20 h-24 bg-black/60 object-contain border border-white/10" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white/80 text-sm uppercase tracking-wider truncate">{item.product?.name}</div>
                  {item.variantId && (
                    <div className="text-xs text-white/40 mt-1">Méret: <span className="font-bold text-white/70">{item.variantId}</span></div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <button className="border border-white/20 hover:border-lime-400/50 text-white/50 hover:text-lime-400 w-7 h-7 flex items-center justify-center transition-all" onClick={() => updateQuantity(item.productId, item.variantId, Math.max(1, item.quantity - 1))}>-</button>
                    <span className="text-sm font-bold text-white/80 w-8 text-center">{item.quantity}</span>
                    <button className="border border-white/20 hover:border-lime-400/50 text-white/50 hover:text-lime-400 w-7 h-7 flex items-center justify-center transition-all" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}>+</button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[70px]">
                  <span className="text-lime-400 font-bold text-sm">{item.product?.price} Ft</span>
                  <button onClick={() => removeItem(item.productId, item.variantId)} className="text-xs text-white/30 hover:text-red-400 transition-colors tracking-wider uppercase">Törlés</button>
                </div>
              </div>
            ))
          )}
        </div>
        <SheetFooter>
          <div className="flex flex-col gap-4 w-full mt-2">
           
            <div className="flex items-center justify-between text-sm font-bold text-lime-400 uppercase tracking-widest">
              <span>Összesen:</span>
              <span>{total} Ft</span>
            </div>
            <Link
              href="/shop/checkout"
              className="block w-full text-center border border-lime-400/60 bg-lime-400/10 hover:bg-lime-400/20 hover:border-lime-400 text-lime-400 font-mono font-bold text-sm tracking-widest uppercase py-3 transition-all"
              onClick={handleCheckout}
            >
              Fizetés Stripe-on
            </Link>
            <button onClick={clearCart} disabled={cartProducts.length === 0} className="text-xs text-white/25 hover:text-red-400 transition-colors tracking-wider uppercase disabled:opacity-30">
              Kosár ürítése
            </button>
          </div>
        </SheetFooter>
        <SheetClose />
      </SheetContent>
    </Sheet>
  );
};

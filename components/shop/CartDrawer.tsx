
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
      <SheetContent side="right" className="max-w-md w-full bg-black/95 border-l border-lime-400/20 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-2xl font-black text-lime-400 drop-shadow">Kosár</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 mt-6 flex-1 overflow-y-auto px-1">
          {cartProducts.length === 0 ? (
            <div className="text-neutral-400 text-center py-16 text-lg">A kosarad üres.<br />Töltsd meg valamivel, ami nem ciki.</div>
          ) : (
            cartProducts.map((item) => (
              <div key={item.productId + (item.variantId || "")}
                className="flex items-center gap-5 border-b border-neutral-800 pb-6">
                <img src={item.product?.images[0]} alt={item.product?.name} className="w-20 h-24 rounded-xl bg-neutral-900 object-contain border border-neutral-800" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-white text-lg truncate">{item.product?.name}</div>
                  {item.variantId && (
                    <div className="text-xs text-neutral-400 mt-1">Méret: <span className="font-bold text-white">{item.variantId}</span></div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.variantId, Math.max(1, item.quantity - 1))}>-</Button>
                    <span className="text-lg font-bold text-white w-8 text-center">{item.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}>+</Button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[70px]">
                  <span className="text-lime-400 font-black text-lg">{item.product?.price} Ft</span>
                  <Button size="sm" variant="ghost" onClick={() => removeItem(item.productId, item.variantId)} className="text-neutral-400 hover:text-red-400">Törlés</Button>
                </div>
              </div>
            ))
          )}
        </div>
        <SheetFooter>
          <div className="flex flex-col gap-4 w-full mt-2">
           
            <div className="flex items-center justify-between text-xl font-black text-lime-400">
              <span>Összesen:</span>
              <span>{total} Ft</span>
            </div>
            <Button
              size="lg"
              className="bg-lime-400 text-black hover:bg-lime-300 font-black text-lg shadow w-full"
              disabled={cartProducts.length === 0}
              onClick={handleCheckout}
              asChild
            >
              <Link href="/shop/checkout">Fizetés Stripe-on</Link>
            </Button>
            <Button size="sm" variant="ghost" onClick={clearCart} disabled={cartProducts.length === 0} className="text-neutral-400 hover:text-red-400">Kosár ürítése</Button>
          </div>
        </SheetFooter>
        <SheetClose />
      </SheetContent>
    </Sheet>
  );
};

"use client";
import { useCartStore } from "@/lib/shop/cartStore";
import { products } from "@/lib/shop/products";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePreorderCampaign } from "@/hooks/usePreorderCampaign";
import { DEFAULT_PREORDER_CAMPAIGN_SLUG } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

export default function ShopCheckoutPage() {
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { campaign } = usePreorderCampaign(DEFAULT_PREORDER_CAMPAIGN_SLUG);

  const cartProducts = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  });
  const total = cartProducts.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Hiba a fizetés indításakor");
      const data = await res.json();
      if (data.url) {
        clearCart();
        window.location.href = data.url;
      } else {
        setError("Nem sikerült elindítani a Stripe Checkoutot.");
      }
    } catch (err: any) {
      setError(err.message || "Ismeretlen hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-neutral-900/80 rounded-2xl shadow-xl p-8 flex flex-col gap-6">
        <h1 className="text-3xl font-black text-lime-400 mb-2">Fizetés</h1>
        <div className="flex flex-col gap-4">
          {cartProducts.map((item) => (
            <div key={item.productId + (item.variantId || "")}
              className="flex items-center gap-4 border-b border-neutral-800 pb-4">
              <img src={item.product?.images[0]} alt={item.product?.name} className="w-16 h-20 rounded bg-neutral-900 object-contain border border-neutral-800" />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-white text-lg truncate">{item.product?.name}</div>
                {item.variantId && (
                  <div className="text-xs text-neutral-400 mt-1">Méret: <span className="font-bold text-white">{item.variantId}</span></div>
                )}
                <div className="text-neutral-400 text-sm">{item.quantity} × {item.product?.price} Ft</div>
              </div>
              <div className="text-lime-400 font-black text-lg">{(item.product?.price || 0) * item.quantity} Ft</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xl font-black text-lime-400 mt-2">
          <span>Összesen:</span>
          <span>{total} Ft</span>
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <Button
          size="lg"
          className="bg-lime-400 text-black hover:bg-lime-300 font-black text-lg shadow w-full sticky bottom-0"
          onClick={handleCheckout}
          disabled={loading || cartProducts.length === 0}
        >
          {loading ? "Fizetés indítása..." : "Tovább a Stripe fizetéshez"}
        </Button>
      </div>
    </main>
  );
}

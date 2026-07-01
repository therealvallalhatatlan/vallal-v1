"use client";
import { useCartStore } from "@/lib/shop/cartStore";
import { DELIVERY_METHODS, DeliveryMethod, getDeliveryFee } from "@/lib/shop/delivery";
import { products } from "@/lib/shop/products";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePreorderCampaign } from "@/hooks/usePreorderCampaign";
import { DEFAULT_PREORDER_CAMPAIGN_SLUG } from "@/lib/shop/preorder";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";

export default function ShopCheckoutPage() {
  const { items, deliveryMethod, setDeliveryMethod, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { campaign } = usePreorderCampaign(DEFAULT_PREORDER_CAMPAIGN_SLUG);

  const cartProducts = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return { ...item, product };
  });
  const subtotal = cartProducts.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const deliveryFee = getDeliveryFee(deliveryMethod);
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shop/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, deliveryMethod }),
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
                <div className="text-[11px] text-neutral-500">Dead drop ár. Postaautomata: +2000 Ft rendelésenként.</div>
              </div>
              <div className="text-lime-400 font-black text-lg">{(item.product?.price || 0) * item.quantity} Ft</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 border border-neutral-800 bg-black/40 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">Kézbesítés</div>
          {(["dead-drop", "postaautomata"] as DeliveryMethod[]).map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors ${
                deliveryMethod === method
                  ? "border-lime-400/60 bg-lime-400/5"
                  : "border-neutral-800 bg-black/30 hover:border-neutral-700"
              }`}
            >
              <input
                type="radio"
                name="deliveryMethod"
                value={method}
                checked={deliveryMethod === method}
                onChange={() => setDeliveryMethod(method)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-white">{DELIVERY_METHODS[method].label}</span>
                  <span className="text-sm font-bold text-lime-400">{DELIVERY_METHODS[method].fee === 0 ? "benne van" : `+${DELIVERY_METHODS[method].fee} Ft`}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">{DELIVERY_METHODS[method].description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between text-xl font-black text-lime-400 mt-2">
          <span>Részösszeg:</span>
          <span>{subtotal} Ft</span>
        </div>
        <div className="flex items-center justify-between text-sm font-bold text-white/60 -mt-2">
          <span>Kézbesítés:</span>
          <span>{deliveryFee === 0 ? "Dead drop / 0 Ft" : `Postaautomata / ${deliveryFee} Ft`}</span>
        </div>
        <div className="flex items-center justify-between text-xl font-black text-lime-400">
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

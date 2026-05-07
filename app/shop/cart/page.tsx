"use client";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { useState } from "react";

export default function ShopCartPage() {
  const [cartOpen, setCartOpen] = useState(true);
  return (
    <div className="min-h-screen bg-black text-white">
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => setCartOpen(false)} />
      {/* Optionally, add a fallback message or redirect if cart is empty */}
    </div>
  );
}

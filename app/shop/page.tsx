"use client";
import React, { useState } from "react";
import { products, Product } from "@/lib/shop/products";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductModal } from "@/components/shop/ProductModal";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { PreorderCampaignPanel } from "@/components/shop/PreorderCampaignPanel";
import { useCartStore } from "@/lib/shop/cartStore";
import { Container } from "@/components/Container";
import { motion, AnimatePresence } from "framer-motion";
import { usePreorderCampaign } from "@/hooks/usePreorderCampaign";
import { DEFAULT_PREORDER_CAMPAIGN_SLUG } from "@/lib/shop/preorder";

const CATEGORIES = [
  { label: "Összes", value: "all" },
  { label: "Kitűző", value: "pin" },
  { label: "Póló", value: "tshirt" },
];

function getCategory(product: Product) {
  if (product.type === "pin") return "pin";
  if (product.type === "men-shirt" || product.type === "women-shirt") return "tshirt";
  return "other";
}

export default function ShopPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const addItem = useCartStore((s) => s.addItem);
  const { campaign, loading: campaignLoading } = usePreorderCampaign(DEFAULT_PREORDER_CAMPAIGN_SLUG);

  const filteredProducts = category === "all"
    ? products
    : products.filter((p) => getCategory(p) === category);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedSize(undefined);
    setQuantity(1);
    setModalOpen(true);
  };

  const handleAddToCart = (size?: string) => {
    if (!selectedProduct) return;
    addItem({
      productId: selectedProduct.id,
      variantId: size,
      quantity,
    });
    setModalOpen(false);
    setCartOpen(true);
  };

  return (
    <main className="relative min-h-screen bg-black text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'url(/img/visuals/noise-01.jpg) repeat', opacity: 0.08 }} />
      <Container className="relative z-10 py-10">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-lime-400 drop-shadow mb-2">Vállalhatatlan Shop</h1>
          <p className="text-lg md:text-2xl text-neutral-300 max-w-2xl mx-auto font-mono">
          Pólók és kitűzők és mindenféle vállalhatatlan cucc,<br/> <span className="text-lime-400">Bán Viktória<sup>®</sup></span> tervezésében.
          </p>
        </header>
{ /*
        <div className="mx-auto mb-8 max-w-3xl">
          {campaign ? (
            <PreorderCampaignPanel campaign={campaign} variant="hero" />
          ) : campaignLoading ? (
            <div className="rounded-[28px] border border-lime-400/10 bg-neutral-950/70 px-5 py-6 text-left text-sm text-neutral-500 animate-pulse">
              Preorder signal tuning...
            </div>
          ) : null}
        </div>
*/}
        {/* Category Tabs */}
        <div className="flex justify-center gap-4 mb-10">
          <div className="inline-flex bg-neutral-900/80 rounded-full p-1 border border-neutral-800">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                className={`px-5 py-2 rounded-full font-bold text-base transition-all ${category === cat.value ? 'bg-lime-400 text-black shadow' : 'text-neutral-300 hover:text-lime-400'}`}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} campaign={campaign} onClick={() => handleProductClick(product)} />
          ))}
        </motion.div>
      </Container>
      <AnimatePresence>
        {modalOpen && (
          <ProductModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            product={selectedProduct}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
            onAddToCart={handleAddToCart}
            quantity={quantity}
            setQuantity={setQuantity}
            campaign={campaign}
          />
        )}
      </AnimatePresence>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} onCheckout={() => setCartOpen(false)} campaign={campaign} />
      <button
        className="fixed bottom-6 right-6 z-50 bg-lime-400 text-black rounded-full shadow-lg px-6 py-3 font-black text-lg hover:bg-lime-300 transition-all border-2 border-lime-500/60"
        onClick={() => setCartOpen(true)}
        aria-label="Kosár megnyitása"
      >
        Kosár
      </button>
    </main>
  );
}

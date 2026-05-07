// lib/shop/cartStore.ts
import { create } from 'zustand';

export interface CartItem {
  productId: string;
  variantId?: string; // size
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  clearCart: () => void;
}

function getInitialCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('shop_cart');
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export const useCartStore = create<CartState>((set, get) => ({
  items: typeof window !== 'undefined' ? getInitialCart() : [],
  addItem: (item) => set((state) => {
    const existing = state.items.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    );
    let newItems;
    if (existing) {
      newItems = state.items.map((i) =>
        i.productId === item.productId && i.variantId === item.variantId
          ? { ...i, quantity: i.quantity + item.quantity }
          : i
      );
    } else {
      newItems = [...state.items, item];
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('shop_cart', JSON.stringify(newItems));
    }
    return { items: newItems };
  }),
  removeItem: (productId, variantId) => set((state) => {
    const newItems = state.items.filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    );
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('shop_cart', JSON.stringify(newItems));
    }
    return { items: newItems };
  }),
  updateQuantity: (productId, variantId, quantity) => set((state) => {
    const newItems = state.items.map((i) =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, quantity }
        : i
    );
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('shop_cart', JSON.stringify(newItems));
    }
    return { items: newItems };
  }),
  clearCart: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('shop_cart');
    }
    set({ items: [] });
  },
}));

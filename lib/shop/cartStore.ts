// lib/shop/cartStore.ts
import { create } from 'zustand';
import { DeliveryMethod } from '@/lib/shop/delivery';

export interface CartItem {
  productId: string;
  variantId?: string; // size
  quantity: number;
}

interface CartState {
  items: CartItem[];
  deliveryMethod: DeliveryMethod;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  setDeliveryMethod: (method: DeliveryMethod) => void;
  clearCart: () => void;
}

interface StoredCart {
  items: CartItem[];
  deliveryMethod: DeliveryMethod;
}

function persistCart(cart: StoredCart) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('shop_cart', JSON.stringify(cart));
  }
}

function getInitialCart(): StoredCart {
  const fallback: StoredCart = { items: [], deliveryMethod: 'dead-drop' };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem('shop_cart');
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return { items: parsed, deliveryMethod: 'dead-drop' };
    }

    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      deliveryMethod: parsed?.deliveryMethod === 'postaautomata' ? 'postaautomata' : 'dead-drop',
    };
  } catch {}
  return fallback;
}

const initialCart = typeof window !== 'undefined' ? getInitialCart() : { items: [], deliveryMethod: 'dead-drop' as DeliveryMethod };

export const useCartStore = create<CartState>((set, get) => ({
  items: initialCart.items,
  deliveryMethod: initialCart.deliveryMethod,
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
    persistCart({ items: newItems, deliveryMethod: state.deliveryMethod });
    return { items: newItems };
  }),
  removeItem: (productId, variantId) => set((state) => {
    const newItems = state.items.filter(
      (i) => !(i.productId === productId && i.variantId === variantId)
    );
    persistCart({ items: newItems, deliveryMethod: state.deliveryMethod });
    return { items: newItems };
  }),
  updateQuantity: (productId, variantId, quantity) => set((state) => {
    const newItems = state.items.map((i) =>
      i.productId === productId && i.variantId === variantId
        ? { ...i, quantity }
        : i
    );
    persistCart({ items: newItems, deliveryMethod: state.deliveryMethod });
    return { items: newItems };
  }),
  setDeliveryMethod: (deliveryMethod) => set((state) => {
    persistCart({ items: state.items, deliveryMethod });
    return { deliveryMethod };
  }),
  clearCart: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('shop_cart');
    }
    set({ items: [], deliveryMethod: 'dead-drop' });
  },
}));

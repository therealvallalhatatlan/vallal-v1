// lib/shop/products.ts


export type ProductType = 'pin' | 'men-shirt' | 'women-shirt' | 'bag';

export type ProductSize = 'S' | 'M' | 'L' | 'XL' | '2XL';

export type PreorderCampaignStatus = 'collecting' | 'printing_started';

export interface ProductPreorderConfig {
  campaignSlug: string;
  preorderOnly: boolean;
  goal: number;
}

export const SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG = 'tshirt-drop';
export const SHARED_TSHIRT_PREORDER_GOAL = 20;


export interface Product {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  images: string[];
  price: number;
  sizes?: Array<ProductSize>;
  /** Átírható méret szerinti készlet – 0 = elfogyott */
  sizeStock?: Partial<Record<ProductSize, number>>;
  /** Átírható szín szerinti készlet – 0 = elfogyott */
  colorStock?: Record<string, number>;
  stock?: number;
  comingSoon?: boolean;
  preorder?: ProductPreorderConfig;
}

export const products: Product[] = [
  {
    id: 'pin-1',
    type: 'pin',
    name: 'Vállalhatatlan Kitűző',
    description: '32mm átmérőjű, fasza kis badge, amit akár a zakódra is tűzhetsz, hogy mindenki lássa, milyen vállalhatatlan vagy.',
    images: ['/s1.jpg'], // TODO: Replace with real pin mockups
    price: 1000,
    stock: 100,
  },
  {
    id: 'men-shirt-1',
    type: 'men-shirt',
    name: 'Vállalhatatlan Póló',
    description: 'Vállalhatatlan nyuszis póló, fényvisszaverő sávval. Szitanyomás, kiváló minőség. 100% pamut. Lányoknak crop top változatban is kérhető.',
    images: ['/m1.jpg', '/m2.jpg'],
    price: 9990,
    sizes: ['S', 'M', 'L', 'XL'],
    // ── ITT ÍRD ÁT A KÉSZLETET méretenként ──
    sizeStock: {
      S:   7,
      M:   6,
      L:   2,
      XL:  2,
    },
    stock: 50,
    preorder: {
      campaignSlug: SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG,
      preorderOnly: true,
      goal: SHARED_TSHIRT_PREORDER_GOAL,
    },
  },
  {
    id: 'bag-1',
    type: 'bag',
    name: 'Vállalhatatlan Táska',
    description: 'Erős, tartós anyag, szitanyomással, fényvisszaverő csíkkal.',
    images: ['/ny2.jpg'],
    price: 10000,
    // ── ITT ÍRD ÁT A KÉSZLETET színenként ──
    colorStock: {
      Pink: 5,
      Fekete: 11,
    },
    stock: 16,
  },
  // Room for future drops
];

export function isPreorderProduct(product: Product): boolean {
  return Boolean(product.preorder?.preorderOnly);
}

export function getProductPreorderCampaignSlug(product: Product): string | null {
  return product.preorder?.campaignSlug ?? null;
}

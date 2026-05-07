// lib/shop/products.ts


export type ProductType = 'pin' | 'men-shirt' | 'women-shirt';

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
  sizes?: Array<'S' | 'M' | 'L' | 'XL' | '2XL'>;
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
    name: 'Férfi póló',
    description: 'Vállalhatatlan nyuszis póló fiúknak, fényvisszaverő sávval. Szitanyomás, kiváló minőség. 100% pamut.',
    images: ['/m1.jpg', '/m2.jpg'],
    price: 9990,
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 50,
    preorder: {
      campaignSlug: SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG,
      preorderOnly: true,
      goal: SHARED_TSHIRT_PREORDER_GOAL,
    },
  },
  {
    id: 'women-shirt-1',
    type: 'women-shirt',
    name: 'Női póló',
    description: 'Vállalhatatlan nyuszis póló lányoknak, fényvisszaverő sávval. Szitanyomás, kiváló minőség. 100% pamut.',
    images: ['/w1.jpg', '/w2.jpg'],
    price: 9990,
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    stock: 50,
    preorder: {
      campaignSlug: SHARED_TSHIRT_PREORDER_CAMPAIGN_SLUG,
      preorderOnly: true,
      goal: SHARED_TSHIRT_PREORDER_GOAL,
    },
  },
  // Room for future drops
];

export function isPreorderProduct(product: Product): boolean {
  return Boolean(product.preorder?.preorderOnly);
}

export function getProductPreorderCampaignSlug(product: Product): string | null {
  return product.preorder?.campaignSlug ?? null;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  priceHuf: number;
  maxPerOrder: number;
  description: string;
  stripePriceId: string;
  active: boolean;
}

export const CATALOG: Record<string, Product> = {
  limited_book_01: {
    id: "limited_book_01",
    code: "DATA_PACKAGE_01",
    name: "Limited Edition Book",
    priceHuf: 12990,
    maxPerOrder: 2,
    description: "[ARCHIVE_NODE] Numbered physical print from the underground sequence.",
    stripePriceId: "price_XXXXXXXXXXXX01",
    active: true,
  },
  glitch_cassette_02: {
    id: "glitch_cassette_02",
    code: "DATA_PACKAGE_02",
    name: "Glitch Audio Cassette",
    priceHuf: 8990,
    maxPerOrder: 3,
    description: "[AUDIO_FRAGMENT] Magnetic noise artifact with hidden channel markers.",
    stripePriceId: "price_XXXXXXXXXXXX02",
    active: true,
  },
  dead_drop_coords_03: {
    id: "dead_drop_coords_03",
    code: "DATA_PACKAGE_03",
    name: "Dead Drop Coordinates",
    priceHuf: 24990,
    maxPerOrder: 1,
    description: "[FIELD_OP] Physical coordinate envelope for one-time retrieval.",
    stripePriceId: "price_XXXXXXXXXXXX03",
    active: true,
  },
};

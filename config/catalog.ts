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
  zold_01: {
    id: "zold_01",
    code: "Amnezia Haze",
    name: "Sativa domináns hibrid",
    priceHuf: 4000,
    maxPerOrder: 30,
    description: "A legendás Holland Amnesia Haze, a sativa domináns hibrid, amely a világ egyik legnépszerűbb kannabisz fajtája. Kiváló minőségű, erős hatású és aromás.",
    stripePriceId: "price_1U4VQ8FL4KlHxxuRivEaBrfD",
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
export interface Product {
  id: string;
  code: string;
  name: string;
  priceHuf: number;
  minPerOrder: number;
  description: string;
  stripePriceId: string;
  active: boolean;
}

export const CATALOG: Record<string, Product> = {
  teszt_00: {
    id: "teszt_00",
    code: "Teszt terméknév",
    name: "Leírás szöveg",
    priceHuf: 1000,
    minPerOrder: 1,
    description: "A legendás Holland Amnesia Haze, a sativa domináns hibrid, amely a világ egyik legnépszerűbb kannabisz fajtája. Kiváló minőségű, erős hatású és aromás.",
    stripePriceId: "price_1U4mzlFL4KlHxxuRzibDCWQV",
    active: true,
  },
  zold_01: {
    id: "zold_01",
    code: "Amnezia Haze",
    name: "Sativa domináns hibrid",
    priceHuf: 4000,
    minPerOrder: 5,
    description: "A legendás Holland Amnesia Haze, a sativa domináns hibrid, amely a világ egyik legnépszerűbb kannabisz fajtája. Kiváló minőségű, erős hatású és aromás.",
    stripePriceId: "price_1U4VQ8FL4KlHxxuRivEaBrfD",
    active: true,
  },
  feher_01: {
    id: "feher_01",
    code: "Amfetamin",
    name: "78%-os tisztaságú amfetamin paszta",
    priceHuf: 4000,
    minPerOrder: 5,
    description: "Igyál sok folyadékot, és ne keverd alkohollal.",
    stripePriceId: "price_XXXXXXXXXXXX02",
    active: true,
  },
  papir_01: {
    id: "papir_01",
    code: "LSD",
    name: "LSD bélyeg, 520µg",
    priceHuf: 4000,
    minPerOrder: 2,
    description: "Erős, 520µg LSD-tartalmű blotter, tapasztalt utazóknak.",
    stripePriceId: "price_XXXXXXXXXXXX03",
    active: true,
  },
 mdma_01: {
    id: "mdma_01",
    code: "Ecstasy",
    name: "Ecstasy tabletta, 320mg",
    priceHuf: 4000,
    minPerOrder: 2,
    description: "Erős, 520µg LSD-tartalmű blotter, tapasztalt utazóknak.",
    stripePriceId: "price_XXXXXXXXXXXX03",
    active: true,
  },
};
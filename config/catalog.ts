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
    code: "Import Zöld",
    name: "Sativa domináns hibrid",
    priceHuf: 4000,
    minPerOrder: 5,
    description: "Változó kínálat",
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
    stripePriceId: "price_1U4rRyFL4KlHxxuRjuCtqL1V",
    active: true,
  },
  papir_01: {
    id: "papir_01",
    code: "LSD",
    name: "LSD bélyeg, 520µg",
    priceHuf: 4000,
    minPerOrder: 2,
    description: "Erős, 520µg LSD-tartalmű blotter, tapasztalt utazóknak.",
    stripePriceId: "price_1U4rT4FL4KlHxxuRXgxHDkdv",
    active: true,
  },
 ecs_01: {
    id: "ecs_01",
    code: "Ecstasy",
    name: "Ecstasy tabletta, 320mg",
    priceHuf: 4000,
    minPerOrder: 2,
    description: "260mg MDMA-tartalmú ecstasy tabletta, ",
    stripePriceId: "price_1U4rVmFL4KlHxxuRrIsw4w4T",
    active: true,
  },
   csoki_01: {
    id: "csoki_01",
    code: "Csoki",
    name: "Marokkói/Afgán/Spanyol hash csokoládé",
    priceHuf: 4500,
    minPerOrder: 2,
    description: "Puha, sötét színű kannabisz koncentrátum.",
    stripePriceId: "price_1U4rUoFL4KlHxxuRiWxn6dTy",
    active: true,
  },
  micro_01: {
    id: "micro_01",
    code: "Likvid-LSD",
    name: "100ml, cseppentővel. Microdosinghoz szükséges mennyiség: 1-2 csepp naponta.",
    priceHuf: 25000,
    minPerOrder: 1,
    description: "Tartsd sötét helyen, hűtőben.",
    stripePriceId: "price_1U4rUoFL4KlHxxuRiWxn6dTy",
    active: true,
  },
};
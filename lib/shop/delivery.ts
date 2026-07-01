export type DeliveryMethod = "dead-drop" | "postaautomata";

export const POSTA_AUTOMATA_FEE = 2000;

export const DELIVERY_METHODS: Record<DeliveryMethod, { label: string; description: string; fee: number }> = {
  "dead-drop": {
    label: "Dead drop terjesztéssel",
    description: "A jelenlegi listaár ezt a terjesztési módot tartalmazza.",
    fee: 0,
  },
  postaautomata: {
    label: "Postaautomatába",
    description: "Diszkrét kézbesítés automatába, fix +2000 Ft felárral.",
    fee: POSTA_AUTOMATA_FEE,
  },
};

export function getDeliveryFee(method: DeliveryMethod): number {
  return DELIVERY_METHODS[method]?.fee ?? 0;
}

export function getDeliveredPrice(basePrice: number, method: DeliveryMethod): number {
  return basePrice + getDeliveryFee(method);
}

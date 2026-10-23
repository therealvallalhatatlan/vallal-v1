export type DeliveryMethod = "dead-drop" | "postaautomata" | "eu";

export const POSTA_AUTOMATA_FEE = 2500;
export const EU_SHIPPING_FEE = 5000;

export const DELIVERY_METHODS: Record<DeliveryMethod, { label: string; description: string; fee: number }> = {
  "dead-drop": {
    label: "Dead drop terjesztéssel",
    description: "Személyes, egyeztetett átvétel a hálózaton keresztül.",
    fee: 0,
  },
  postaautomata: {
    label: "Csomagpont / automata (Magyarország)",
    description: "Belföldi csomagpontra vagy csomagautomatába kézbesítés, +2 500 Ft.",
    fee: POSTA_AUTOMATA_FEE,
  },
  eu: {
    label: "Külföldi szállítás (EU-n belül)",
    description: "Szállítás az Európai Unión belül, +5 000 Ft.",
    fee: EU_SHIPPING_FEE,
  },
};

export function getDeliveryFee(method: DeliveryMethod): number {
  return DELIVERY_METHODS[method]?.fee ?? 0;
}

export function getDeliveredPrice(basePrice: number, method: DeliveryMethod): number {
  return basePrice + getDeliveryFee(method);
}

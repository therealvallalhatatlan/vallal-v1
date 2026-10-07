import "server-only"

export const DISTRIBUTION_PRODUCT_ID = "book_ii"
export const DISTRIBUTION_PRODUCT_NAME = "Vállalhatatlan II."
export const DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF = 15000

export const DISTRIBUTION_SHIPPING = {
  hu_shipping: 2500,
  eu_shipping: 4500,
  global_shipping: 6500,
} as const

export const DISTRIBUTION_FULFILLMENT = [
  "dead_drop",
  "personal",
  "hu_shipping",
  "eu_shipping",
  "global_shipping",
] as const

export type DistributionFulfillmentMethod = typeof DISTRIBUTION_FULFILLMENT[number]

export function shippingFeeHuf(method: DistributionFulfillmentMethod) {
  if (method === "hu_shipping") return DISTRIBUTION_SHIPPING.hu_shipping
  if (method === "eu_shipping") return DISTRIBUTION_SHIPPING.eu_shipping
  if (method === "global_shipping") return DISTRIBUTION_SHIPPING.global_shipping
  return 0
}

export function fulfillmentLabel(method: DistributionFulfillmentMethod) {
  switch (method) {
    case "dead_drop": return "DEAD DROP"
    case "personal": return "SZEMÉLYES"
    case "hu_shipping": return "AUTOMATA / HU"
    case "eu_shipping": return "POSTA / EU"
    case "global_shipping": return "POSTA / GLOBAL"
  }
}

export const SHIPPING_COUNTRIES = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "GB","CH","NO","IS","LI","AL","BA","ME","MK","RS","XK","UA",
  "US","CA","MX","BR","AR","CL","CO","PE","AU","NZ","JP","KR","CN","SG",
  "TH","VN","MY","PH","IN","ID","IL","AE","TR","ZA","EG"
] as const

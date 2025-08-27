/**
 * Format currency in Hungarian Forint (HUF)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format sequence numbers with leading zeros (#000 format)
 */
export function formatSequenceNumber(num: number, digits = 3): string {
  return `#${num.toString().padStart(digits, "0")}`
}

export const formatSequence = formatSequenceNumber

/**
 * Parse currency string back to number (removes HUF formatting)
 */
export function parseCurrency(currencyString: string): number {
  return Number.parseInt(currencyString.replace(/[^\d]/g, "")) || 0
}

/**
 * Format large numbers with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("hu-HU").format(num)
}

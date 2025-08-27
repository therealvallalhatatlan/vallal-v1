export function getPaymentMode(): "link" | "api" {
  const m = process.env.NEXT_PUBLIC_PAYMENT_MODE?.toLowerCase();
  return m === "api" ? "api" : "link";
}
export function getPaymentLinkUrl(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_URL || null;
}
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

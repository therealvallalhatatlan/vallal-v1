import Stripe from "stripe"

/**
 * Stripe integration stubs
 * TODO: Implement actual Stripe checkout session creation
 */

export interface CheckoutSessionParams {
  amount: number // Amount in smallest currency unit (e.g., 1500000 for 15000 HUF)
  currency: string // Currency code (e.g., 'huf')
  successUrl: string // URL to redirect after successful payment
  cancelUrl: string // URL to redirect after cancelled payment
  metadata?: Record<string, string> // Additional metadata
}

function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    // During build time or when env var is missing, return null instead of throwing
    console.warn("STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.")
    return null
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
  })
}

export const stripe = createStripeClient()

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
}

/**
 * Creates a Stripe checkout session
 * TODO: Implement actual Stripe API call
 *
 * Example usage:
 * const session = await createCheckoutSession({
 *   amount: 1500000, // 15000 HUF in fillér (smallest unit)
 *   currency: 'huf',
 *   successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
 *   cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/cancelled`,
 *   metadata: { orderId: 'demo_001' }
 * })
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }> {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: "Book Preorder",
            description: "Pre-order your copy of the upcoming book",
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata || {},
  })

  return { url: session.url! }
}

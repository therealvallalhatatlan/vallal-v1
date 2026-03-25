import Stripe from "stripe"

/**
 * Stripe integration stubs
 * TODO: Implement actual Stripe checkout session creation
 */

export interface CheckoutSessionParams {
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  productName?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

function createStripeClient(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    // During build time or when env var is missing, return null instead of throwing
    console.warn("STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.")
    return null
  }

  return new Stripe(secretKey)
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
 *   amount: 10000000, // 1000000 HUF in fillér (smallest unit) - 10,000 Ft
 *   currency: 'huf',
 *   successUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/success`,
 *   cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/cancelled`,
 *   metadata: { orderId: 'demo_001' }
 * })
 */
export async function createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.")
  }

  try {
    const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: params.productName || "Book Preorder",
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

    return { url: session.url!, sessionId: session.id }
  } catch (error) {
    console.error('Stripe checkout session creation failed:', error)
    throw error
  }
}

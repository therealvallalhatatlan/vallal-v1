import Stripe from "stripe"

export interface CheckoutSessionParams {
  amount: number
  currency: string
  successUrl: string
  cancelUrl: string
  productName?: string
  metadata?: Record<string, string>
}

export interface CheckoutSessionResult {
  url: string
  sessionId: string
}

let cachedStripe: Stripe | null | undefined

function createStripeClient(): Stripe | null {
  if (cachedStripe !== undefined) {
    return cachedStripe
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.")
    cachedStripe = null
    return null
  }

  cachedStripe = new Stripe(secretKey)
  return cachedStripe
}

const stripe = createStripeClient()

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
}

function withFallbackQuery(url: string, key: string, value: string) {
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}${key}=${encodeURIComponent(value)}`
}

function buildOfflineSession(params: CheckoutSessionParams): CheckoutSessionResult {
  return {
    url: withFallbackQuery(params.successUrl, "fallback", "stripe_disabled"),
    sessionId: `local-${Date.now()}`,
  }
}

export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  if (!stripe) {
    console.warn("Stripe is not configured. Falling back to offline success URL.")
    return buildOfflineSession(params)
  }

  try {
    const amountInFiller = Math.round(params.amount * 100)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: params.currency,
            product_data: {
              name: params.productName || "Vállalhatatlan pilot",
            },
            unit_amount: amountInFiller,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata || {},
    })

    return { url: session.url ?? params.successUrl, sessionId: session.id }
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error)
    return buildOfflineSession(params)
  }
}
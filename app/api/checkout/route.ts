import { type NextRequest, NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { stripe, getSiteUrl } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !stripe) {
      return NextResponse.json(
        {
          error: "Stripe configuration missing. Please set STRIPE_SECRET_KEY environment variable.",
        },
        { status: 500 },
      )
    }

    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error("Invalid JSON in request body:", jsonError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { email, quantity = 1 } = body

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      // HUF is a zero-decimal currency, so 15000 = 15000 HUF (not 150.00)
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Vállalhatatlan – Preorder",
            },
            unit_amount: 15000, // 15000 HUF (zero-decimal currency)
          },
          quantity,
        },
      ],
      automatic_tax: {
        enabled: false, // Can be revisited later
      },
      allow_promotion_codes: false,
      billing_address_collection: "auto",
      customer_email: email || undefined,
      locale: "hu",
      client_reference_id: nanoid(12),
      metadata: {
        project: "vallalhatatlan",
        type: "preorder",
      },
      success_url: `${getSiteUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getSiteUrl()}/cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Checkout session creation failed:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}

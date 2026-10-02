import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { guardWriteOperation } from "@/lib/systemGuard"
import { buildCheckoutMetadata } from "@/lib/stripeAttribution"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

const MIN_AMOUNT_HUF = 1000
const MAX_AMOUNT_HUF = 1000000

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  if (!stripe || !stripeKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
  }

  try {
    const body: unknown = await req.json()
    const amount =
      typeof body === "object" &&
      body !== null &&
      "amount" in body &&
      typeof body.amount === "number"
        ? body.amount
        : Number.NaN

    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      return NextResponse.json({ error: "Az összegnek egész számnak kell lennie." }, { status: 400 })
    }

    if (amount < MIN_AMOUNT_HUF) {
      return NextResponse.json({ error: `A minimális összeg ${MIN_AMOUNT_HUF} Ft.` }, { status: 400 })
    }

    if (amount > MAX_AMOUNT_HUF) {
      return NextResponse.json(
        { error: `A maximális összeg ${MAX_AMOUNT_HUF.toLocaleString("hu-HU")} Ft.` },
        { status: 400 },
      )
    }

    const origin = new URL(req.url).origin
    const configuredBase = process.env.NEXT_PUBLIC_SITE_URL
    const baseUrl = configuredBase?.trim() ? configuredBase : origin

    const metadata = await buildCheckoutMetadata(
      req,
      {
        project: "vallalhatatlan",
        type: "legbelso-kor",
        amount_huf: String(amount),
        product_id: "legbelso-kor",
        source: "legbelso-kor",
      },
      { cartSummary: `legbelso-kor:${amount}` },
    )

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      billing_address_collection: "auto",
      success_url: `${baseUrl}/legbelso-kor/koszonom?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/legbelso-kor`,
      client_reference_id: metadata.order_id,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Vállalhatatlan / Leg Belső Kör beszállás",
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
    })

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("[legbelso-kor/checkout] Stripe error:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { guardWriteOperation } from "@/lib/systemGuard"
import { buildCheckoutMetadata } from "@/lib/stripeAttribution"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" })
  : null

const MIN_AMOUNT_HUF = 15000
const MAX_AMOUNT_HUF = 1000000
const MAX_NAME_LENGTH = 120
const MAX_MESSAGE_LENGTH = 500

type CheckoutBody = {
  amount?: unknown
  supporter_name?: unknown
  publish_name?: unknown
  message?: unknown
}

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  if (!stripe || !stripeKey) {
    return NextResponse.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 })
  }

  try {
    const body = (await req.json()) as CheckoutBody
    const amount = typeof body.amount === "number" ? body.amount : Number.NaN
    const supporterName =
      typeof body.supporter_name === "string" ? body.supporter_name.trim() : ""
    const publishName = body.publish_name === true
    const message =
      typeof body.message === "string" ? body.message.trim() : ""

    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: "Az összegnek egész számnak kell lennie." },
        { status: 400 },
      )
    }

    if (amount < MIN_AMOUNT_HUF) {
      return NextResponse.json(
        { error: `A minimális beszállás ${MIN_AMOUNT_HUF} Ft.` },
        { status: 400 },
      )
    }

    if (amount > MAX_AMOUNT_HUF) {
      return NextResponse.json(
        { error: `A maximális összeg ${MAX_AMOUNT_HUF.toLocaleString("hu-HU")} Ft.` },
        { status: 400 },
      )
    }

    if (!supporterName) {
      return NextResponse.json(
        { error: "A név megadása kötelező." },
        { status: 400 },
      )
    }

    if (supporterName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `A név maximum ${MAX_NAME_LENGTH} karakter lehet.` },
        { status: 400 },
      )
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Az üzenet maximum ${MAX_MESSAGE_LENGTH} karakter lehet.` },
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
        supporter_name: supporterName,
        publish_name: publishName ? "true" : "false",
        supporter_message: message,
      },
      { cartSummary: `legbelso-kor:${amount}` },
    )

    const expectedStripeAmountMinor = amount * 100

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      billing_address_collection: "auto",
      success_url: `${baseUrl}/legbelso-kor/koszonom?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/legbelso-kor`,
      client_reference_id: metadata.order_id,
      metadata: {
        ...metadata,
        expected_amount_huf: String(amount),
        expected_stripe_amount_minor: String(expectedStripeAmountMinor),
      },
      payment_intent_data: {
        metadata: {
          ...metadata,
          expected_amount_huf: String(amount),
          expected_stripe_amount_minor: String(expectedStripeAmountMinor),
        },
      },
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: {
              name: "Vállalhatatlan / Leg Belső Kör Alapítói Részvétel",
            },
            // Stripe expects HUF charges in minor units.
            unit_amount: expectedStripeAmountMinor,
          },
          quantity: 1,
        },
      ],
    })

    // Defense in depth: confirm Stripe created exactly the amount
    // validated by this server.
    if (
      session.amount_total !== expectedStripeAmountMinor ||
      session.amount_subtotal !== expectedStripeAmountMinor
    ) {
      console.error("[legbelso-kor/checkout] Stripe amount mismatch", {
        sessionId: session.id,
        expectedAmountHuf: amount,
        expectedStripeAmountMinor,
        amountSubtotal: session.amount_subtotal,
        amountTotal: session.amount_total,
      })

      try {
        if (session.status === "open") {
          await stripe.checkout.sessions.expire(session.id)
        }
      } catch (expireError) {
        console.error("[legbelso-kor/checkout] Failed to expire mismatched session", expireError)
      }

      return NextResponse.json(
        { error: "A fizetési összeg ellenőrzése sikertelen. A fizetés nem indítható el." },
        { status: 500 },
      )
    }

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Stripe error"
    console.error("[legbelso-kor/checkout] Stripe error:", message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

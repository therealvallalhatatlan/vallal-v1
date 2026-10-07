import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import {
  DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF,
  DISTRIBUTION_SHIPPING,
  SHIPPING_COUNTRIES,
} from "@/lib/distributionNetwork"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

const METHODS = ["hu_shipping", "eu_shipping", "global_shipping"] as const
type ShippingMethod = typeof METHODS[number]

function origin(request: NextRequest) {
  return (request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "")
}

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 })

  let body: { fulfillment_method?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const method = typeof body.fulfillment_method === "string"
    ? body.fulfillment_method.trim() as ShippingMethod
    : null

  if (!method || !METHODS.includes(method)) {
    return NextResponse.json({ error: "invalid_shipping_method" }, { status: 400 })
  }

  const shippingFee = DISTRIBUTION_SHIPPING[method]
  const totalHuf = DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF + shippingFee
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "huf",
          unit_amount: totalHuf * 100,
          product_data: {
            name: "Vállalhatatlan II. • postázás",
            description: "Könyv: " + DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF + " Ft + szállítás: " + shippingFee + " Ft",
          },
        },
      }],
      shipping_address_collection: {
        allowed_countries: SHIPPING_COUNTRIES as unknown as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"],
      },
      success_url: origin(request) + "/dashboard?distribution_shipping=success&session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin(request) + "/fooldal-3?checkout=cancelled&shipping=" + encodeURIComponent(method),
      client_reference_id: user.id,
      metadata: {
        type: "distribution_shipping",
        product_id: "book_ii",
        product_name: "Vállalhatatlan II.",
        user_id: user.id,
        fulfillment_method: method,
        shipping_fee_huf: String(shippingFee),
        product_price_huf: String(DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF),
        total_amount_huf: String(totalHuf),
      },
      payment_intent_data: {
        metadata: {
          type: "distribution_shipping",
          user_id: user.id,
          fulfillment_method: method,
        },
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })

    if (!session.url) throw new Error("missing_checkout_url")

    return NextResponse.json({ ok: true, url: session.url, session_id: session.id, total_huf: totalHuf })
  } catch (error) {
    console.error("[distribution/shipping] Stripe error", error)
    return NextResponse.json({ error: "stripe_checkout_failed" }, { status: 500 })
  }
}

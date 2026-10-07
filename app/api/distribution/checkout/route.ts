import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF,
  DISTRIBUTION_FULFILLMENT,
  SHIPPING_COUNTRIES,
  shippingFeeHuf,
  type DistributionFulfillmentMethod,
} from "@/lib/distributionNetwork"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

function origin(request: NextRequest) {
  return (
    request.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

export async function POST(request: NextRequest) {
  const token = parseBearerToken(request.headers)
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 401 })

  const user = await getUserFromToken(token)
  if (!user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  if (!stripe) return NextResponse.json({ error: "stripe_not_configured" }, { status: 500 })

  let body: { drop_id?: unknown; fulfillment_method?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const dropId = typeof body.drop_id === "string" ? body.drop_id.trim() : ""
  const method = typeof body.fulfillment_method === "string"
    ? body.fulfillment_method.trim() as DistributionFulfillmentMethod
    : null

  if (!dropId) return NextResponse.json({ error: "missing_drop_id" }, { status: 400 })
  if (!method || !DISTRIBUTION_FULFILLMENT.includes(method)) {
    return NextResponse.json({ error: "invalid_fulfillment_method" }, { status: 400 })
  }

  const db = supabaseAdmin()
  const now = new Date().toISOString()

  await db
    .from("distribution_drops")
    .update({
      status: "active",
      reserved_by_user_id: null,
      reserved_until: null,
      reserved_fulfillment_method: null,
      updated_at: now,
    })
    .eq("status", "reserved")
    .lt("reserved_until", now)

  const { data: drop, error } = await db
    .from("distribution_drops")
    .update({
      status: "reserved",
      reserved_by_user_id: user.id,
      reserved_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      reserved_fulfillment_method: method,
      updated_at: now,
    })
    .eq("id", dropId)
    .eq("status", "active")
    .contains("fulfillment_options", [method])
    .select("id, cell_id, product_id, product_name, price_huf, city, district, location_hint, fulfillment_options")
    .maybeSingle()

  if (error) {
    console.error("[distribution/checkout] reserve error", error)
    return NextResponse.json({ error: "reservation_failed" }, { status: 500 })
  }
  if (!drop) return NextResponse.json({ error: "drop_unavailable" }, { status: 409 })

  const shippingFee = shippingFeeHuf(method)
  const bookPrice = Number.isFinite(drop.price_huf) && drop.price_huf > 0
    ? Math.round(drop.price_huf)
    : DISTRIBUTION_DEFAULT_BOOK_PRICE_HUF
  const totalHuf = bookPrice + shippingFee

  try {
    const successPath = method === "dead_drop" || method === "personal"
      ? "/halozat?distribution_drop=" + encodeURIComponent(drop.id)
      : "/dashboard?distribution_drop=" + encodeURIComponent(drop.id)

    const metadata = {
      type: "distribution_drop",
      product_id: drop.product_id,
      product_name: drop.product_name,
      drop_id: drop.id,
      cell_id: drop.cell_id,
      user_id: user.id,
      fulfillment_method: method,
      shipping_fee_huf: String(shippingFee),
      product_price_huf: String(bookPrice),
      total_amount_huf: String(totalHuf),
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "huf",
          unit_amount: totalHuf * 100,
          product_data: {
            name: drop.product_name,
            description: shippingFee > 0
              ? "Könyv: " + bookPrice + " Ft + szállítás: " + shippingFee + " Ft"
              : "Könyv: " + bookPrice + " Ft",
          },
        },
      }],
      ...(shippingFee > 0 ? {
        shipping_address_collection: {
          allowed_countries: SHIPPING_COUNTRIES as unknown as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection["allowed_countries"],
        },
      } : {}),
      success_url: origin(request) + successPath,
      cancel_url: origin(request) + "/fooldal-3?checkout=cancelled&drop=" + encodeURIComponent(drop.id),
      client_reference_id: drop.id,
      metadata,
      payment_intent_data: { metadata },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })

    if (!session.url) throw new Error("missing_checkout_url")

    return NextResponse.json({
      ok: true,
      url: session.url,
      session_id: session.id,
      total_huf: totalHuf,
    })
  } catch (checkoutError) {
    console.error("[distribution/checkout] Stripe error", checkoutError)
    await db
      .from("distribution_drops")
      .update({
        status: "active",
        reserved_by_user_id: null,
        reserved_until: null,
        reserved_fulfillment_method: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", drop.id)
      .eq("status", "reserved")
      .eq("reserved_by_user_id", user.id)

    return NextResponse.json({ error: "stripe_checkout_failed" }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { guardWriteOperation } from "@/lib/systemGuard"
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit"
import { buildCheckoutMetadata } from "@/lib/stripeAttribution"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null
const UNIT_PRICE_HUF = 12000
const DEPOSIT_HUF = 5000
const BALANCE_HUF = UNIT_PRICE_HUF - DEPOSIT_HUF
const NOTIFICATION_EMAIL = "therealvallalhatatlan@gmail.com"

const schema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().max(120).optional().default(""),
  quantity: z.number().int().min(1).max(10).default(1),
  fulfillmentMethod: z.enum(["pickup", "shipping"]).default("pickup"),
  note: z.string().max(500).optional().default(""),
  consent: z.literal(true),
})

export async function POST(req: NextRequest) {
  const guarded = await guardWriteOperation(req)
  if (guarded) return guarded

  const rate = checkRateLimit("kalendarium-preorder:" + getClientIp(req), 5, 60 * 60_000)
  if (!rate.allowed) {
    return NextResponse.json({ error: "rate_limited", retryAfterSeconds: rate.retryAfterSeconds }, {
      status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" },
    })
  }

  if (!stripe) {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 })
  }

  let input
  try {
    input = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }

  const token = parseBearerToken(req.headers)
  const user = token ? await getUserFromToken(token) : null
  const reference = "VK27-" + crypto.randomUUID().slice(0, 8).toUpperCase()
  const fullAmountHuf = UNIT_PRICE_HUF * input.quantity
  const depositAmountHuf = DEPOSIT_HUF * input.quantity
  const balanceDueHuf = BALANCE_HUF * input.quantity
  const db = supabaseAdmin()

  const { data: row, error: insertError } = await db.from("kalendarium_preorders").insert({
    reference,
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    quantity: input.quantity,
    fulfillment_method: input.fulfillmentMethod,
    note: input.note,
    status: "checkout_pending",
    payment_status: "pending",
    unit_price_huf: UNIT_PRICE_HUF,
    amount_huf: fullAmountHuf,
    deposit_amount_huf: DEPOSIT_HUF,
    balance_due_huf: balanceDueHuf,
    amount_paid_huf: 0,
    user_id: user?.id ?? null,
    consent_data_at: new Date().toISOString(),
  }).select("id, reference").single()

  if (insertError || !row) {
    console.error("[kalendarium-preorder] insert failed", insertError)
    return NextResponse.json({ error: "save_failed" }, { status: 500 })
  }

  try {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vallalhatatlan.online").replace(/\/+$/, "")
    const metadata = await buildCheckoutMetadata(req, {
      project: "vallalhatatlan",
      type: "kalendarium_2027",
      product_id: "kalendarium_2027",
      preorder_id: row.id,
      preorder_reference: row.reference,
      quantity: String(input.quantity),
      amount_huf: String(fullAmountHuf),
      deposit_amount_huf: String(depositAmountHuf),
      balance_due_huf: String(balanceDueHuf),
      fulfillment_method: input.fulfillmentMethod,
    }, { orderId: row.id, cartSummary: "kalendarium-2027x" + input.quantity, userUuid: user?.id ?? null })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      billing_address_collection: "auto",
      line_items: [{
        price_data: {
          currency: "huf",
          product_data: {
            name: "Vállalhatatlan Kalendárium 2027 · előleg",
            description: "5 000 Ft előleg / példány. Teljes ár: 12 000 Ft / példány. Fennmaradó összeg: 7 000 Ft / példány.",
          },
          unit_amount: DEPOSIT_HUF * 100,
        },
        quantity: input.quantity,
      }],
      success_url: origin + "/kalendarium/siker?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/kalendarium?payment=cancelled&ref=" + encodeURIComponent(row.reference),
      client_reference_id: row.id,
      metadata,
      payment_intent_data: { metadata },
    })

    const { error: updateError } = await db.from("kalendarium_preorders").update({
      stripe_checkout_session_id: session.id,
    }).eq("id", row.id)

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      url: session.url,
      reference: row.reference,
      depositAmountHuf,
      balanceDueHuf,
      fullAmountHuf,
    })
  } catch (error) {
    console.error("[kalendarium-preorder] checkout creation failed", error)
    await db.from("kalendarium_preorders").update({
      status: "reserved",
      payment_status: "failed",
    }).eq("id", row.id).eq("payment_status", "pending")
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 })
  }
}

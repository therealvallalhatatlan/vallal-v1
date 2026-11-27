import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { getUserFromToken, parseBearerToken } from "@/lib/auth"
import { guardWriteOperation } from "@/lib/systemGuard"
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit"
import { buildCheckoutMetadata } from "@/lib/stripeAttribution"

export const dynamic = "force-dynamic"

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" }) : null

const STANDARD_PRICE_HUF = 12000
const SUPPORTER_PRICE_HUF = 10000
const SUPPORTER_DEPOSIT_HUF = 10000
const NOTIFICATION_EMAIL = "therealvallalhatatlan@gmail.com"

function escapeEmailHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, character => entities[character] || character)
}

const schema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().max(120).optional().default(""),
  fulfillmentMethod: z.enum(["pickup", "shipping"]).default("pickup"),
  note: z.string().max(500).optional().default(""),
  preorderType: z.enum(["reservation", "supporter"]).default("reservation"),
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

  let input
  try {
    input = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 })
  }

  if (input.preorderType === "supporter" && !stripe) {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 })
  }

  const token = parseBearerToken(req.headers)
  const user = token ? await getUserFromToken(token) : null
  const reference = "VK27-" + crypto.randomUUID().slice(0, 8).toUpperCase()
  const isSupporter = input.preorderType === "supporter"
  const quantity = 1
  const unitPriceHuf = isSupporter ? SUPPORTER_PRICE_HUF : STANDARD_PRICE_HUF
  const fullAmountHuf = unitPriceHuf
  const depositPerUnitHuf = isSupporter ? SUPPORTER_DEPOSIT_HUF : 0
  const depositAmountHuf = depositPerUnitHuf
  const balanceDueHuf = fullAmountHuf - depositAmountHuf
  const db = supabaseAdmin()

  const { data: row, error: insertError } = await db.from("kalendarium_preorders").insert({
    reference,
    preorder_type: input.preorderType,
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    quantity,
    fulfillment_method: input.fulfillmentMethod,
    note: input.note,
    status: isSupporter ? "checkout_pending" : "reserved",
    payment_status: isSupporter ? "pending" : "unpaid",
    unit_price_huf: unitPriceHuf,
    amount_huf: fullAmountHuf,
    deposit_amount_huf: depositPerUnitHuf,
    balance_due_huf: balanceDueHuf,
    amount_paid_huf: 0,
    user_id: user?.id ?? null,
    consent_data_at: new Date().toISOString(),
  }).select("id, reference").single()

  if (insertError || !row) {
    console.error("[kalendarium-preorder] insert failed", insertError)
    return NextResponse.json({ error: "save_failed" }, { status: 500 })
  }

  const fulfillmentLabel = input.fulfillmentMethod === "shipping"
    ? "Postai vagy csomagküldés (a részleteket később egyeztetjük)"
    : "Személyes / közösségi átvétel"
  const safeName = escapeEmailHtml(input.fullName || "Nincs megadva")
  const safeEmail = escapeEmailHtml(input.email)
  const safeNote = escapeEmailHtml(input.note || "Nincs megjegyzés")

  if (!isSupporter) {
    let notificationSent = false
    let confirmationSent = false
    const resendApiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.EMAIL_FROM

    if (resendApiKey && emailFrom) {
      const resend = new Resend(resendApiKey)
      const details = [
        "Előjegyzési azonosító: " + row.reference,
        "Név: " + (input.fullName || "Nincs megadva"),
        "E-mail: " + input.email,
        "Digitális hozzáférés: 1 db",
        "Teljes ár: " + fullAmountHuf.toLocaleString("hu-HU") + " Ft",
        "Átvétel: " + fulfillmentLabel,
        "Megjegyzés: " + (input.note || "Nincs megjegyzés"),
        "",
        "Ingyenes előjegyzés. Fizetés nem történt.",
      ].join("\n")

      try {
        const adminResult = await resend.emails.send({
          from: emailFrom,
          to: [NOTIFICATION_EMAIL],
          replyTo: input.email,
          subject: "[Kalendárium 2027] Új ingyenes előjegyzés: " + row.reference,
          text: details,
          html: [
            '<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.6;max-width:640px">',
            "<h1>Új Kalendárium 2027 előjegyzés</h1>",
            "<p><strong>Azonosító:</strong> " + escapeEmailHtml(row.reference) + "</p>",
            "<p><strong>Név:</strong> " + safeName + "<br><strong>E-mail:</strong> " + safeEmail +
              "<br><strong>Digitális hozzáférés:</strong> 1 db<br><strong>Teljes ár:</strong> " +
              fullAmountHuf.toLocaleString("hu-HU") + " Ft<br><strong>Átvétel:</strong> " +
              escapeEmailHtml(fulfillmentLabel) + "<br><strong>Megjegyzés:</strong> " + safeNote + "</p>",
            "<p>Ingyenes előjegyzés. Fizetés nem történt.</p>",
            "</div>",
          ].join(""),
        })
        if (adminResult.error) throw adminResult.error
        notificationSent = true
      } catch (mailError) {
        console.error("[kalendarium-preorder] reservation admin notification failed", mailError)
      }

      try {
        const customerResult = await resend.emails.send({
          from: emailFrom,
          to: [input.email],
          subject: "Előjegyzés rögzítve · Vállalhatatlan Kalendárium 2027",
          text: [
            "Szia" + (input.fullName ? " " + input.fullName : "") + "!",
            "",
            "Rögzítettük a Vállalhatatlan Kalendárium 2027 ingyenes előjegyzését.",
            "Azonosító: " + row.reference,
            "Digitális hozzáférés: 1 db",
            "Tervezett teljes ár: " + fullAmountHuf.toLocaleString("hu-HU") + " Ft",
            "",
            "Ez ingyenes előjegyzés, fizetés nem történt és most nincs teendőd.",
            "A kiadvány részleteiről, a végleges rendelésről és az átvételről e-mailben küldünk tájékoztatást.",
            "",
            "Köszönjük az érdeklődést!",
            "Vállalhatatlan",
          ].join("\n"),
        })
        if (customerResult.error) throw customerResult.error
        confirmationSent = true
      } catch (mailError) {
        console.error("[kalendarium-preorder] reservation confirmation email failed", mailError)
      }
    } else {
      console.warn("[kalendarium-preorder] reservation saved, but Resend configuration is missing")
    }

    return NextResponse.json({
      ok: true,
      reference: row.reference,
      preorderType: "reservation",
      payment: "unpaid",
      notificationSent,
      confirmationSent,
    })
  }

  try {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vallalhatatlan.online").replace(/\/+$/, "")
    const metadata = await buildCheckoutMetadata(req, {
      project: "vallalhatatlan",
      type: "kalendarium_2027",
      product_id: "kalendarium_2027",
      preorder_id: row.id,
      preorder_reference: row.reference,
      preorder_type: "supporter",
      quantity: String(quantity),
      amount_huf: String(fullAmountHuf),
      deposit_amount_huf: String(depositAmountHuf),
      balance_due_huf: String(balanceDueHuf),
      fulfillment_method: input.fulfillmentMethod,
    }, { orderId: row.id, cartSummary: "kalendarium-supporter-2027x1", userUuid: user?.id ?? null })

    const session = await stripe!.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      billing_address_collection: "auto",
      line_items: [{
        price_data: {
          currency: "huf",
          product_data: {
            name: "Vállalhatatlan Kalendárium 2027 · támogatói előrendelés",
            description: "Támogatói előrendelési ár: 10 000 Ft. Korai hozzáférés 2 000 Ft-tal kedvezőbben a későbbi 12 000 Ft-os árnál.",
          },
          unit_amount: SUPPORTER_PRICE_HUF * 100,
        },
        quantity,
      }],
      success_url: origin + "/kalendarium/siker?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: origin + "/kalendarium?payment=cancelled&ref=" + encodeURIComponent(row.reference),
      client_reference_id: row.id,
      metadata,
      payment_intent_data: { metadata },
    })

    const { error: updateError } = await db.from("kalendarium_preorders").update({
      stripe_checkout_session_id: session.id,
    }).eq("id", row.id).eq("payment_status", "pending")

    if (updateError) throw updateError

    return NextResponse.json({
      ok: true,
      url: session.url,
      reference: row.reference,
      preorderType: "supporter",
      depositAmountHuf,
      balanceDueHuf,
      fullAmountHuf,
    })
  } catch (error) {
    console.error("[kalendarium-preorder] supporter checkout creation failed", error)
    await db.from("kalendarium_preorders").update({
      status: "cancelled",
      payment_status: "failed",
    }).eq("id", row.id).eq("payment_status", "pending")
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 })
  }
}

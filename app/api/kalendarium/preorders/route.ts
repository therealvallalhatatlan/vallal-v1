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
const UNIT_PRICE_HUF = 12000
const NOTIFICATION_EMAIL = "therealvallalhatatlan@gmail.com"

function escapeEmailHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }
  return value.replace(/[&<>"']/g, (character) => entities[character] || character)
}
const schema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().max(120).optional().default(""),
  quantity: z.number().int().min(1).max(10).default(1),
  fulfillmentMethod: z.enum(["pickup", "shipping"]).default("pickup"),
  note: z.string().max(500).optional().default(""),
  payment: z.enum(["reserve", "preorder"]),
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

  if (input.payment === "preorder" && process.env.KALENDARIUM_PREORDER_PAYMENTS_ENABLED !== "true") {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 })
  }

  const token = parseBearerToken(req.headers)
  const user = token ? await getUserFromToken(token) : null
  const reference = "VK27-" + crypto.randomUUID().slice(0, 8).toUpperCase()
  const amountHuf = UNIT_PRICE_HUF * input.quantity
  const db = supabaseAdmin()

  const { data: row, error: insertError } = await db.from("kalendarium_preorders").insert({
    reference,
    email: input.email.toLowerCase(),
    full_name: input.fullName,
    quantity: input.quantity,
    fulfillment_method: input.fulfillmentMethod,
    note: input.note,
    status: input.payment === "preorder" ? "checkout_pending" : "reserved",
    payment_status: input.payment === "preorder" ? "pending" : "unpaid",
    unit_price_huf: UNIT_PRICE_HUF,
    amount_huf: amountHuf,
    user_id: user?.id ?? null,
    consent_data_at: new Date().toISOString(),
  }).select("id, reference").single()

  if (insertError || !row) {
    console.error("[kalendarium-preorder] insert failed", insertError)
    return NextResponse.json({ error: "save_failed" }, { status: 500 })
  }

  if (input.payment === "reserve") {
    let notificationSent = false
    let confirmationSent = false
    const resendApiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.EMAIL_FROM

    // Email delivery is best-effort: a mail provider outage must never undo
    // a successfully saved reservation or encourage duplicate submissions.
    if (resendApiKey && emailFrom) {
      const resend = new Resend(resendApiKey)
      const safeName = escapeEmailHtml(input.fullName || "Nincs megadva")
      const safeEmail = escapeEmailHtml(input.email)
      const safeNote = escapeEmailHtml(input.note || "Nincs megjegyzés")
      const fulfillmentLabel =
        input.fulfillmentMethod === "shipping"
          ? "Postai vagy csomagküldés (a részleteket később egyeztetjük)"
          : "Személyes / közösségi átvétel"

      try {
        const adminResult = await resend.emails.send({
          from: emailFrom,
          to: [NOTIFICATION_EMAIL],
          replyTo: input.email,
          subject: "[Kalendárium 2027] Új előjegyzés: " + row.reference,
          text: [
            "Új Kalendárium 2027 előjegyzés érkezett.",
            "Azonosító: " + row.reference,
            "Név: " + (input.fullName || "Nincs megadva"),
            "E-mail: " + input.email,
            "Mennyiség: " + input.quantity + " db",
            "Átvétel: " + fulfillmentLabel,
            "Megjegyzés: " + (input.note || "Nincs megjegyzés"),
            "",
            "Ez ingyenes, kötelezettségmentes előjegyzés, fizetés nem történt.",
          ].join("\n"),
          html: [
            '<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.6;max-width:640px">',
            "<h1>Új Kalendárium 2027 előjegyzés</h1>",
            "<p><strong>Azonosító:</strong> " + escapeEmailHtml(row.reference) + "</p>",
            "<p><strong>Név:</strong> " + safeName + "<br><strong>E-mail:</strong> " + safeEmail +
              "<br><strong>Mennyiség:</strong> " + input.quantity + " db<br><strong>Átvétel:</strong> " +
              escapeEmailHtml(fulfillmentLabel) + "<br><strong>Megjegyzés:</strong> " + safeNote + "</p>",
            "<p>Ingyenes, kötelezettségmentes előjegyzés. Fizetés nem történt.</p>",
            "</div>",
          ].join(""),
        })
        if (adminResult.error) throw adminResult.error
        notificationSent = true
      } catch (mailError) {
        console.error("[kalendarium-preorder] admin notification failed", mailError)
      }

      try {
        const customerResult = await resend.emails.send({
          from: emailFrom,
          to: [input.email],
          subject: "Előjegyzés rögzítve · Vállalhatatlan Kalendárium 2027",
          text: [
            "Szia" + (input.fullName ? " " + input.fullName : "") + "!",
            "",
            "Rögzítettük a Vállalhatatlan Kalendárium 2027 előjegyzésedet.",
            "Azonosító: " + row.reference,
            "Példányszám: " + input.quantity + " db",
            "",
            "Ez egy ingyenes, kötelezettségmentes előjegyzés. Fizetés nem történt, és most nincs teendőd.",
            "Amint végleges a kiadvány ára, a nyomtatás ütemezése és az átvétel módja, e-mailben küldjük a részleteket.",
            "",
            "Köszönjük, hogy velünk tartasz!",
            "Vállalhatatlan",
          ].join("\n"),
          html: [
            '<div style="font-family:Arial,sans-serif;color:#181818;line-height:1.65;max-width:640px">',
            "<p>Szia" + (input.fullName ? " " + escapeEmailHtml(input.fullName) : "") + "!</p>",
            "<h1>Rögzítettük az előjegyzésedet.</h1>",
            "<p>A Vállalhatatlan Kalendárium 2027 előjegyzése sikeres.</p>",
            "<p><strong>Azonosító:</strong> " + escapeEmailHtml(row.reference) +
              "<br><strong>Példányszám:</strong> " + input.quantity + " db</p>",
            "<p>Ez egy ingyenes, kötelezettségmentes előjegyzés. Fizetés nem történt, most nincs teendőd.</p>",
            "<p>Amint végleges a kiadvány ára, a nyomtatás ütemezése és az átvétel módja, e-mailben küldjük a részleteket.</p>",
            "<p>Köszönjük, hogy velünk tartasz!<br>Vállalhatatlan</p>",
            "</div>",
          ].join(""),
        })
        if (customerResult.error) throw customerResult.error
        confirmationSent = true
      } catch (mailError) {
        console.error("[kalendarium-preorder] customer confirmation failed", mailError)
      }
    } else {
      console.warn("[kalendarium-preorder] reservation saved, but RESEND_API_KEY or EMAIL_FROM is missing")
    }

    return NextResponse.json({
      ok: true,
      reference: row.reference,
      payment: "unpaid",
      notificationSent,
      confirmationSent,
    })
  }

  if (!stripe) {
    await db.from("kalendarium_preorders").update({
      status: "reserved", payment_status: "failed",
    }).eq("id", row.id)
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 })
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://vallalhatatlan.online"
    const metadata = await buildCheckoutMetadata(req, {
      project: "vallalhatatlan",
      type: "kalendarium_2027",
      product_id: "kalendarium_2027",
      preorder_id: row.id,
      preorder_reference: row.reference,
      quantity: String(input.quantity),
      amount_huf: String(amountHuf),
      fulfillment_method: input.fulfillmentMethod,
    }, { orderId: row.id, cartSummary: "kalendarium-2027x" + input.quantity, userUuid: user?.id ?? null })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      line_items: [{
        price_data: {
          currency: "huf",
          product_data: { name: "Vállalhatatlan Kalendárium 2027" },
          unit_amount: UNIT_PRICE_HUF * 100,
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

    return NextResponse.json({ ok: true, url: session.url, reference: row.reference })
  } catch (error) {
    console.error("[kalendarium-preorder] checkout creation failed", error)
    await db.from("kalendarium_preorders").update({
      status: "reserved", payment_status: "failed",
    }).eq("id", row.id)
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 })
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardWriteOperation } from "@/lib/systemGuard";

const stripeKey = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" });

const MIN_AMOUNT_HUF = 1000;
const MAX_AMOUNT_HUF = 1_000_000;

export async function POST(req: Request) {
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;

  try {
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const rawAmount = Number(body?.amount);

    if (!Number.isFinite(rawAmount) || !Number.isInteger(rawAmount)) {
      return NextResponse.json(
        { error: "Az összegnek egész számnak kell lennie." },
        { status: 400 }
      );
    }

    if (rawAmount < MIN_AMOUNT_HUF) {
      return NextResponse.json(
        { error: `A minimális összeg ${MIN_AMOUNT_HUF} Ft.` },
        { status: 400 }
      );
    }

    if (rawAmount > MAX_AMOUNT_HUF) {
      return NextResponse.json(
        { error: `A maximális összeg ${MAX_AMOUNT_HUF.toLocaleString("hu-HU")} Ft.` },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://vallalhatatlan.online";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      billing_address_collection: "auto",
      success_url: `${baseUrl}/mecenas/koszonom?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/mecenas`,
      client_reference_id: "mecenas-" + Math.random().toString(36).slice(2, 10),
      metadata: {
        project: "vallalhatatlan",
        type: "mecenas",
        amount_huf: String(rawAmount),
      },
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: { name: "Vállalhatatlan – Mecénás Támogatás" },
            unit_amount: rawAmount * 100, // fillér
          },
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    const message = err?.message || "Stripe error";
    console.error("[mecenas/checkout] Stripe error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// /checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { guardWriteOperation } from "@/lib/systemGuard";

const stripeKey = process.env.STRIPE_SECRET_KEY!;
const stripe = new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" });

export async function POST(req: Request) {
  // Check system mode
  const guardResponse = await guardWriteOperation(req as any);
  if (guardResponse) return guardResponse;
  
  try {
    if (!stripeKey) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    // Legyszerűbb, stabil megoldás: fix típusok, helyes struktúra.
    // (Ha később testre akarod szabni, átemelheted a body-ból,
    // de ügyelj rá, hogy az értékek integer/boolean típusok legyenek.)
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "huf",
      locale: "hu",
      allow_promotion_codes: false,
      automatic_tax: { enabled: false },
      billing_address_collection: "auto",
      success_url:
        "https://vallalhatatlan.online/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "https://vallalhatatlan.online/cancelled",
      client_reference_id: "hpp-" + Math.random().toString(36).slice(2, 10),
      metadata: {
        project: "vallalhatatlan",
        type: "preorder",
      },
      line_items: [
        {
          price_data: {
            currency: "huf",
            product_data: { name: "Vállalhatatlan – Preorder" },
            // FONTOS: integer (fillér/pénzegység), nem string!
            unit_amount: 15000,
          },
          // FONTOS: integer, nem string!
          quantity: 1,
        },
      ],
    });

    return NextResponse.json({ id: session.id, url: session.url });
  } catch (err: any) {
    const message = err?.message || "Stripe error";
    console.error("Stripe Checkout create error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

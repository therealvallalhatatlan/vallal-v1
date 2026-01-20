// app/api/checkout/digital/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
});

export async function POST() {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_DIGITAL, // Stripe dashboardból
          quantity: 1,
        },
      ],
      success_url: "https://vallalhatatlan.online/reader",
      cancel_url: "https://vallalhatatlan.online/",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return new NextResponse("Stripe error", { status: 500 });
  }
}

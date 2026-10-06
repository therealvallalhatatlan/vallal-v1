// app/api/checkout/digital/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { buildCheckoutMetadata } from "@/lib/stripeAttribution";
import { trackServerEvent } from "@/lib/siteAnalyticsServer";
import { getAttributionSource } from "@/lib/stripeAttribution";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",
});

export async function POST(req: NextRequest) {
  try {
    const metadata = await buildCheckoutMetadata(
      req,
      {
        project: "vallalhatatlan",
        type: "digital_reader",
        product_id: "digital-reader",
      },
      { cartSummary: "digital-readerx1" },
    );

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
      client_reference_id: metadata.order_id,
      metadata,
      payment_intent_data: { metadata },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    await trackServerEvent("checkout_created", {
    product: "digital-reader",
    source: getAttributionSource(req),
  });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return new NextResponse("Stripe error", { status: 500 });
  }
}

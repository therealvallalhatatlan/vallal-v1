import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Induló ár és időpont (UTC)
const START_PRICE = 5000;
const INCREMENT = 100; // Ft
const INCREMENT_INTERVAL = 1800; // másodperc (30 perc)
// 2026-04-26 15:00:00 CEST (UTC+2) => 2026-04-26T13:00:00Z
const START_TIMESTAMP = new Date("2026-04-26T13:00:00Z").getTime(); // Induló időpont magyar idő szerint 15:00

function getCurrentPrice() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - START_TIMESTAMP) / 1000);
  const increments = Math.max(0, Math.floor(elapsedSeconds / INCREMENT_INTERVAL));
  return START_PRICE + increments * INCREMENT;
}

export async function POST(req: NextRequest) {
  const price = getCurrentPrice();
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "huf",
          product_data: {
            name: "#105-ös könyv (aukciós)",
          },
          unit_amount: price * 100, // Stripe expects amount in fillér
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/105?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/105?cancelled=1`,
  });
  return NextResponse.json({ url: session.url });
}

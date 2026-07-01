import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { DeliveryMethod, getDeliveryFee } from "@/lib/shop/delivery";
import { products } from "@/lib/shop/products";
import {
  attachStripeSessionToOrder,
  createShopOrderDraft,
  validateCheckoutItems,
} from "@/lib/shop/preorderServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { guardWriteOperation } from "@/lib/systemGuard";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2025-07-30.basil" })
  : null;

type CheckoutItem = {
  productId: string;
  quantity: number;
  variantId?: string;
};

function parseDeliveryMethod(input: unknown): DeliveryMethod {
  return input === "postaautomata" ? "postaautomata" : "dead-drop";
}

export async function POST(req: NextRequest) {
  let draftOrderId: string | null = null;

  const guardResponse = await guardWriteOperation(req);
  if (guardResponse) return guardResponse;

  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Missing STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : [];
    const deliveryMethod = parseDeliveryMethod(body?.deliveryMethod);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    const validatedItems = validateCheckoutItems(items);
    const draftOrder = await createShopOrderDraft({ items: validatedItems, deliveryMethod });
    draftOrderId = draftOrder.orderId;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = validatedItems.map((item) => {
      const product = products.find((p) => p.id === item.product.id);
      if (!product) throw new Error(`Product not found: ${item.product.id}`);

      return {
        price_data: {
          currency: "huf",
          product_data: {
            name: `${product.name}${item.variantId ? ` (${item.variantId})` : ""}`,
          },
          // In this project Stripe checkout expects HUF amount in fillér.
          unit_amount: product.price * 100,
        },
        quantity: item.quantity,
      };
    });

    const deliveryFee = getDeliveryFee(deliveryMethod);
    if (deliveryFee > 0) {
      line_items.push({
        price_data: {
          currency: "huf",
          product_data: {
            name: "Postaautomata kézbesítés",
          },
          unit_amount: deliveryFee * 100,
        },
        quantity: 1,
      });
    }

    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${origin}/shop/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop/order/cancel`,
      metadata: {
        orderType: "merch",
        orderId: draftOrder.orderId,
        deliveryMethod,
        shippingAmount: String(draftOrder.shippingAmount),
        totalAmount: String(draftOrder.totalAmount),
      },
      shipping_address_collection: { allowed_countries: ["HU"] },
    });

    await attachStripeSessionToOrder(draftOrder.orderId, session.id);

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    if (draftOrderId) {
      await supabaseAdmin()
        .from("shop_orders")
        .update({
          status: "payment_failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftOrderId);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
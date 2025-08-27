import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

const processedEvents = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("[STRIPE_WEBHOOK] Missing stripe-signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type} (${event.id})`)

    if (processedEvents.has(event.id)) {
      console.log(`[STRIPE_WEBHOOK] Event ${event.id} already processed`)
      return NextResponse.json({ received: true })
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object as any

        const orderData = {
          stripe_session_id: session.id,
          amount_total: session.amount_total,
          currency: session.currency,
          client_reference_id: session.client_reference_id,
          customer_email: session.customer_email,
          payment_status: session.payment_status,
          created_at: new Date().toISOString(),
        }

        console.log("[STRIPE_WEBHOOK] ORDER_UPSERT:", JSON.stringify(orderData, null, 2))

        // TODO: In production, implement database transaction:
        // 1. upsert user by email (if present)
        // 2. create order with status='paid'
        // 3. assign sequenceNumber atomically
        // 4. store stripe_session_id, amount_total, currency, timestamps, etc.
        // 5. send confirmation email
        // 6. update preorder counter

        processedEvents.add(event.id)
        break

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK] Webhook verification failed:", error.message)
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 })
  }
}

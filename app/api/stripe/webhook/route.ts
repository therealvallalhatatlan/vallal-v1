export const runtime = "nodejs"
import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import fs from "fs/promises"
import path from "path"

const processedEvents = new Set<string>()
const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")

async function readCounters() {
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    return { goal: 100, preorders: 0 }
  }
}

async function writeCounters(obj: { goal: number; preorders: number }) {
  await fs.mkdir(path.dirname(COUNTERS_PATH), { recursive: true })
  await fs.writeFile(COUNTERS_PATH, JSON.stringify(obj, null, 2), "utf-8")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      console.error("[STRIPE_WEBHOOK] Missing stripe-signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    if (!stripe) {
      console.error("[STRIPE_WEBHOOK] Stripe instance is not initialized");
      return NextResponse.json({ error: "Stripe not initialized" }, { status: 500 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET not set");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    console.log(`[STRIPE_WEBHOOK] Received event: ${event.type} (${event.id})`)

    if (processedEvents.has(event.id)) {
      console.log(`[STRIPE_WEBHOOK] Event ${event.id} already processed`)
      return NextResponse.json({ received: true })
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any

        // Only count paid sessions
        if (session.payment_status === "paid") {
          try {
            const counters = await readCounters()
            const goal = Number.isFinite(Number(counters.goal)) ? Math.max(1, Number(counters.goal)) : 100
            const current = Number.isFinite(Number(counters.preorders)) ? Math.max(0, Number(counters.preorders)) : 0
            const newPreorders = Math.min(goal, current + 1)

            await writeCounters({ goal, preorders: newPreorders })

            console.log(`[STRIPE_WEBHOOK] Incremented preorders: ${current} -> ${newPreorders} (goal ${goal})`)
          } catch (fsErr) {
            console.error("[STRIPE_WEBHOOK] Failed to update counters file:", fsErr)
            // continue — don't fail the webhook response to Stripe
          }
        } else {
          console.log(`[STRIPE_WEBHOOK] Session ${session.id} not paid (status=${session.payment_status}), skipping counter increment`)
        }

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

        processedEvents.add(event.id)
        break
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK] Webhook verification failed:", error?.message || error)
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 })
  }
}

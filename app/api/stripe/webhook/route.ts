export const runtime = "nodejs"
import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import fs from "fs/promises"
import path from "path"

const processedEvents = new Set<string>()
const COUNTERS_PATH = path.join(process.cwd(), "data", "counters.json")
const TMP_COUNTERS = path.join("/tmp", "counters.json")

async function readCountersLocal() {
  try {
    const raw = await fs.readFile(COUNTERS_PATH, "utf-8")
    return JSON.parse(raw)
  } catch {
    try {
      const tmp = await fs.readFile(TMP_COUNTERS, "utf-8")
      return JSON.parse(tmp)
    } catch {
      return { goal: 100, preorders: 0 }
    }
  }
}

async function writeCountersLocal(obj: { goal: number; preorders: number }) {
  try {
    await fs.mkdir(path.dirname(COUNTERS_PATH), { recursive: true })
    await fs.writeFile(COUNTERS_PATH, JSON.stringify(obj, null, 2), "utf-8")
    return true
  } catch (e) {
    // attempt tmp fallback
    try {
      await fs.mkdir(path.dirname(TMP_COUNTERS), { recursive: true })
      await fs.writeFile(TMP_COUNTERS, JSON.stringify(obj, null, 2), "utf-8")
      return true
    } catch (err) {
      console.error("[STRIPE_WEBHOOK] Local write failed (including tmp):", err)
      return false
    }
  }
}

async function supabaseGetCounters() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const resp = await fetch(`${url}/rest/v1/counters?id=eq.1`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  })
  if (!resp.ok) {
    console.warn("[STRIPE_WEBHOOK] Supabase GET failed:", resp.status, await resp.text())
    return null
  }
  const json = await resp.json()
  return json && json[0] ? json[0] : null
}

async function supabaseUpsertCounters(obj: { goal: number; preorders: number }) {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase not configured")

  const body = JSON.stringify([{ id: 1, goal: obj.goal, preorders: obj.preorders }])
  const resp = await fetch(`${url}/rest/v1/counters`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // merge duplicates = upsert; return representation for debugging
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body,
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase upsert failed: ${resp.status} ${text}`)
  }
  return await resp.json()
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
      console.error("[STRIPE_WEBHOOK] Stripe instance is not initialized")
      return NextResponse.json({ error: "Stripe not initialized" }, { status: 500 })
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("[STRIPE_WEBHOOK] STRIPE_WEBHOOK_SECRET not set")
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

        // read current counters (prefer Supabase)
        let counters = (await supabaseGetCounters()) || (await readCountersLocal())
        const goal = Number.isFinite(Number(counters?.goal)) ? Math.max(1, Number(counters.goal)) : 100
        const current = Number.isFinite(Number(counters?.preorders)) ? Math.max(0, Number(counters.preorders)) : 0
        const newPreorders = Math.min(goal, current + 1)

        // try to persist to Supabase first
        let persisted = false
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            await supabaseUpsertCounters({ goal, preorders: newPreorders })
            console.log(`[STRIPE_WEBHOOK] Supabase upserted counters: ${current} -> ${newPreorders}`)
            persisted = true
          } catch (supErr) {
            console.error("[STRIPE_WEBHOOK] Supabase upsert failed:", supErr)
          }
        }

        // fallback to local write (will fail on read-only FS, but /tmp may work)
        if (!persisted) {
          try {
            const ok = await writeCountersLocal({ goal, preorders: newPreorders })
            if (ok) {
              console.log(`[STRIPE_WEBHOOK] Local counters updated: ${current} -> ${newPreorders}`)
              persisted = true
            }
          } catch (fsErr) {
            console.error("[STRIPE_WEBHOOK] Local write failed:", fsErr)
          }
        }

        if (!persisted) {
          console.error("[STRIPE_WEBHOOK] Could not persist counters to Supabase or local storage")
        }

        // Log order data (keep existing behavior)
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
    console.error("[STRIPE_WEBHOOK] Webhook handling failed:", error?.message || error)
    // respond 200 to Stripe only if signature verification succeeded earlier; since here verification failed, return 400
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 400 })
  }
}


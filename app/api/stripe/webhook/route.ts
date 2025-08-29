import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import fs from "fs/promises"
import path from "path"

// runtime moved after imports to avoid ordering/type issues
export const runtime = "nodejs"

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
      return { goal: 100, total_sold: 0, last_sequence_number: 0 }
    }
  }
}

async function writeCountersLocal(obj: { goal: number; total_sold: number; last_sequence_number: number }) {
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

// change RequestInit -> any to avoid missing DOM types in some Node/TS configs
async function supabaseFetch(urlPath: string, opts: any): Promise<Response> {
  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "")
  if (!url) throw new Error("SUPABASE_URL not configured")
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  const resp = await fetch(`${url}/rest/v1/${urlPath}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })
  return resp
}

// loosen return types to Promise<any> for TS
async function supabaseGetCounters(): Promise<any | null> {
  try {
    const resp = await supabaseFetch(`counters?id=eq.main`, { method: "GET", headers: { Accept: "application/json" } })
    if (!resp.ok) {
      console.warn("[STRIPE_WEBHOOK] Supabase GET counters failed:", resp.status, await resp.text())
      return null
    }
    const json = await resp.json()
    const row = json && json[0] ? json[0] : null
    if (!row) return null

    // normalize fields: support older 'preorders' key and map to total_sold
    return {
      id: row.id ?? "main",
      goal: Number.isFinite(Number(row.goal)) ? Number(row.goal) : 100,
      total_sold: Number.isFinite(Number(row.total_sold ?? row.preorders)) ? Number(row.total_sold ?? row.preorders) : 0,
      last_sequence_number: Number.isFinite(Number(row.last_sequence_number ?? row.last_sequence)) ? Number(row.last_sequence_number ?? row.last_sequence ?? 0) : 0,
    }
  } catch (err) {
    console.warn("[STRIPE_WEBHOOK] Supabase GET counters error:", err)
    return null
  }
}

async function supabaseUpsertCounters(obj: { id?: string; goal?: number; total_sold?: number; last_sequence_number?: number; preorders?: number }): Promise<any> {
  // Build a sanitized payload that uses total_sold (map preorders -> total_sold)
  const payload = {
    id: obj.id ?? "main",
    goal: Number.isFinite(Number(obj.goal)) ? Number(obj.goal) : 100,
    total_sold: Number.isFinite(Number(obj.total_sold ?? obj.preorders)) ? Number(obj.total_sold ?? obj.preorders) : 0,
    last_sequence_number: Number.isFinite(Number(obj.last_sequence_number ?? 0)) ? Number(obj.last_sequence_number ?? 0) : 0,
  }

  const body = JSON.stringify([payload])
  const resp = await supabaseFetch(`counters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase upsert counters failed: ${resp.status} ${text}`)
  }
  return resp.json()
}

async function supabaseGetOrCreateUserByEmail(email?: string): Promise<any | null> {
  if (!email) return null
  try {
    // try to find existing user
    const encoded = encodeURIComponent(email)
    const resp = await supabaseFetch(`users?email=eq.${encoded}`, { method: "GET", headers: { Accept: "application/json" } })
    if (!resp.ok) {
      console.warn("[STRIPE_WEBHOOK] Supabase GET user failed:", resp.status, await resp.text())
    } else {
      const json = await resp.json()
      if (Array.isArray(json) && json.length > 0) return json[0]
    }

    // create user
    const body = JSON.stringify([{ email }])
    const createResp = await supabaseFetch(`users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body,
    })
    if (!createResp.ok) {
      const text = await createResp.text()
      console.warn("[STRIPE_WEBHOOK] Supabase create user failed:", createResp.status, text)
      return null
    }
    const created = await createResp.json()
    return created && created[0] ? created[0] : null
  } catch (err) {
    console.warn("[STRIPE_WEBHOOK] supabaseGetOrCreateUserByEmail error:", err)
    return null
  }
}

async function supabaseInsertOrder(order: Record<string, any>): Promise<any> {
  const body = JSON.stringify([order])
  const resp = await supabaseFetch(`orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body,
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Supabase insert order failed: ${resp.status} ${text}`)
  }
  return resp.json()
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
        const customerEmail: string | undefined = session.customer_email || session.customer_details?.email

        // Read counters (prefer Supabase)
        let counters = await supabaseGetCounters()
        if (!counters) counters = await readCountersLocal()
        const goal = Number.isFinite(Number(counters?.goal)) ? Math.max(1, Number(counters.goal)) : 100
        const current = Number.isFinite(Number(counters?.total_sold ?? counters?.preorders)) ? Math.max(0, Number(counters.total_sold ?? counters.preorders)) : 0
        const lastSeq = Number.isFinite(Number(counters?.last_sequence_number)) ? Math.max(0, Number(counters.last_sequence_number) || 0) : 0

        // Determine whether the order is assigned or waitlisted
        let sequenceNumber: number | null = null
        let waitlisted = false
        if (current >= goal) {
          waitlisted = true
        } else {
          sequenceNumber = Math.min(goal, lastSeq + 1)
        }

        // Update counters if not reached goal (increment total_sold and last_sequence_number)
        let persisted = false
        if (!waitlisted) {
          const newTotal = Math.min(goal, current + 1)
          const newSequence = sequenceNumber!
          if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
              await supabaseUpsertCounters({
                id: "main",
                goal,
                total_sold: newTotal,
                last_sequence_number: newSequence,
              })
              console.log(`[STRIPE_WEBHOOK] Supabase counters updated: ${current} -> ${newTotal}, seq ${lastSeq} -> ${newSequence}`)
              persisted = true
            } catch (supErr) {
              console.error("[STRIPE_WEBHOOK] Supabase upsert failed:", supErr)
            }
          }

          if (!persisted) {
            const ok = await writeCountersLocal({ goal, total_sold: newTotal, last_sequence_number: newSequence })
            if (ok) {
              console.log(`[STRIPE_WEBHOOK] Local counters updated: ${current} -> ${newTotal}, seq ${lastSeq} -> ${newSequence}`)
              persisted = true
            }
          }
        } else {
          // On waitlist, we may still want to ensure counters row exists in Supabase
          if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
              // ensure counters row exists (no increment)
              await supabaseUpsertCounters({
                id: "main",
                goal,
                total_sold: current,
                last_sequence_number: lastSeq,
              })
              persisted = true
            } catch (supErr) {
              console.warn("[STRIPE_WEBHOOK] Supabase ensure counters failed for waitlisted order:", supErr)
            }
          }
          if (!persisted) {
            // write local to ensure a counters file exists
            await writeCountersLocal({ goal, total_sold: current, last_sequence_number: lastSeq })
          }
        }

        // Ensure user row exists in users table (by email) and get user_id
        let userId: string | null = null
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && customerEmail) {
          try {
            const user = await supabaseGetOrCreateUserByEmail(customerEmail)
            if (user && user.id) userId = user.id
          } catch (uErr) {
            console.warn("[STRIPE_WEBHOOK] Could not create/find user:", uErr)
          }
        }

        // Insert order row with correct columns
        const orderRow: Record<string, any> = {
          user_id: userId,
          stripe_session_id: session.id,
          amount: session.amount_total ?? null,
          currency: session.currency ?? null,
          status: session.payment_status ?? session.status ?? "unknown",
          sequence_number: sequenceNumber,
          waitlisted: !!waitlisted,
          created_at: new Date().toISOString(),
        }

        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            await supabaseInsertOrder(orderRow)
            console.log("[STRIPE_WEBHOOK] Order inserted into Supabase orders")
          } catch (orderErr) {
            console.error("[STRIPE_WEBHOOK] Supabase insert order failed:", orderErr)
          }
        } else {
          console.log("[STRIPE_WEBHOOK] Supabase not configured; skipping order insert")
        }

        // existing log
        const orderData = {
          stripe_session_id: session.id,
          amount_total: session.amount_total,
          currency: session.currency,
          client_reference_id: session.client_reference_id,
          payment_status: session.payment_status,
          created_at: new Date().toISOString(),
        }

        console.log("[STRIPE_WEBHOOK] ORDER_UPSERT LOG:", JSON.stringify(orderData, null, 2))

        processedEvents.add(event.id)
        break
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[STRIPE_WEBHOOK] Webhook handling failed:", error?.message || error)
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 400 })
  }
}


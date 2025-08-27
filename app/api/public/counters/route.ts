import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"

export async function GET() {
  const goalEnv = process.env.NEXT_PUBLIC_CAMPAIGN_GOAL
  const goal = Number.isFinite(Number(goalEnv)) && Number(goalEnv) > 0 ? Math.floor(Number(goalEnv)) : 100
  const priceId = process.env.STRIPE_PRICE_ID

  const headers = {
    "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    "Content-Type": "application/json",
  }

  if (!priceId) {
    // If price id is not configured return safe defaults
    const payload = {
      goal,
      preorders: 0,
      nextSequence: 1,
      remaining: goal,
      percent: 0,
    }
    return NextResponse.json(payload, { status: 200, headers })
  }

  try {
    let preorders = 0
    let hasMore = true
    let startingAfter: string | undefined = undefined
    const limit = 100 // max allowed by Stripe per request

    while (hasMore) {
      const params: any = { limit, expand: ["data.line_items"] }
      if (startingAfter) params.starting_after = startingAfter

      if (!stripe) {
        throw new Error("Stripe client is not initialized.");
      }
      const resp = await stripe.checkout.sessions.list(params)
      const sessions = resp.data || []

      // accumulate
      for (const session of sessions) {
        if (session.payment_status !== "paid") continue

        // session.line_items may be present due to expand
        const lineItems = (session as any).line_items
        if (!lineItems || !Array.isArray(lineItems.data)) continue

        for (const li of lineItems.data) {
          // price may be an object or ID depending on expand; ensure access to price.id
          const p = li.price
          const pid = p && typeof p === "object" ? p.id : p
          const qty = Number(li.quantity || 0)
          if (pid === priceId) {
            preorders += qty
          }
        }
      }

      hasMore = !!resp.has_more
      if (hasMore && sessions.length > 0) {
        startingAfter = sessions[sessions.length - 1].id
      } else {
        startingAfter = undefined
      }
    }

    const cappedPreorders = preorders
    const remaining = Math.max(0, goal - cappedPreorders)
    const nextSequence = Math.min(goal, cappedPreorders + 1)
    const percent = Math.min(100, Math.max(0, Math.round((cappedPreorders / goal) * 100)))

    const payload = {
      goal,
      preorders: cappedPreorders,
      nextSequence,
      remaining,
      percent,
    }

    return NextResponse.json(payload, { status: 200, headers })
  } catch (err) {
    console.error("Stripe counters error:", err)
    const payload = {
      goal,
      preorders: 0,
      nextSequence: 1,
      remaining: goal,
      percent: 0,
    }
    return NextResponse.json(payload, { status: 503, headers })
  }
}

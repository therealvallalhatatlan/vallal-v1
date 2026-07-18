import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { guardWriteOperation } from '@/lib/systemGuard'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' }) : null

const MIN_AMOUNT_HUF = 1000
const MAX_AMOUNT_HUF = 1000000

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  if (!stripe || !stripeKey) {
    return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const amount = Number(body?.amount)

    if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
      return NextResponse.json({ error: 'Az osszegnek egesz szamnak kell lennie.' }, { status: 400 })
    }

    if (amount < MIN_AMOUNT_HUF) {
      return NextResponse.json({ error: `A minimalis osszeg ${MIN_AMOUNT_HUF} Ft.` }, { status: 400 })
    }

    if (amount > MAX_AMOUNT_HUF) {
      return NextResponse.json({ error: `A maximalis osszeg ${MAX_AMOUNT_HUF.toLocaleString('hu-HU')} Ft.` }, { status: 400 })
    }

    const origin = new URL(req.url).origin
    const configuredBase = process.env.NEXT_PUBLIC_SITE_URL
    const baseUrl = configuredBase && configuredBase.trim().length > 0 ? configuredBase : origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'huf',
      locale: 'hu',
      billing_address_collection: 'auto',
      success_url: `${baseUrl}/tamogatas/koszonom?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/tamogatas`,
      metadata: {
        project: 'vallalhatatlan',
        type: 'tamogatas',
        amount_huf: String(amount),
      },
      line_items: [
        {
          price_data: {
            currency: 'huf',
            product_data: { name: 'Vallalhatatlan - Tamogatas' },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
    })

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err: any) {
    const message = err?.message || 'Stripe error'
    console.error('[tamogatas/checkout] Stripe error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

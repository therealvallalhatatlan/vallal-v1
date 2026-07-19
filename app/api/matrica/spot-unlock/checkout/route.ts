import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { guardWriteOperation } from '@/lib/systemGuard'
import { getActiveSpotUnlock, PAID_SPOT_UNLOCK_HOURS } from '@/lib/matricaUnlocks'
import { getUserFromToken, parseBearerToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' })
  : null

interface CheckoutBody {
  spot_id?: unknown
}

export async function POST(req: NextRequest) {
  const guardResponse = await guardWriteOperation(req)
  if (guardResponse) return guardResponse

  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 500 })
  }

  const token = parseBearerToken(req.headers)
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 401 })
  }

  const user = await getUserFromToken(token)
  if (!user?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let body: CheckoutBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const spotId = typeof body.spot_id === 'string' ? body.spot_id.trim() : ''
  if (!spotId) {
    return NextResponse.json({ error: 'missing_spot_id' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: spot, error: spotError } = await db
    .from('sticker_spots')
    .select('id, title, spot_type, price_huf, status')
    .eq('id', spotId)
    .maybeSingle<{ id: string; title: string; spot_type: 'free' | 'paid'; price_huf: number; status: string }>()

  if (spotError) {
    console.error('[matrica/spot-unlock/checkout] spot fetch error', spotError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!spot) {
    return NextResponse.json({ error: 'spot_not_found' }, { status: 404 })
  }

  if (spot.status !== 'active') {
    return NextResponse.json({ error: 'spot_unavailable' }, { status: 409 })
  }

  if (spot.spot_type !== 'paid') {
    return NextResponse.json({ error: 'spot_is_free' }, { status: 400 })
  }

  if (!Number.isFinite(spot.price_huf) || spot.price_huf <= 0) {
    return NextResponse.json({ error: 'invalid_spot_price' }, { status: 409 })
  }

  const existingUnlock = await getActiveSpotUnlock(db, user.id, spot.id)
  if (existingUnlock) {
    return NextResponse.json({
      error: 'already_unlocked',
      unlock_expires_at: existingUnlock.expires_at,
    }, { status: 409 })
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'huf',
            unit_amount: Math.round(spot.price_huf * 100),
            product_data: {
              name: `Szpot feloldas: ${spot.title}`,
              description: `${PAID_SPOT_UNLOCK_HOURS} oras hozzaferes`,
            },
          },
        },
      ],
      success_url: `${origin}/halozat?unlock=success&spot_id=${encodeURIComponent(spot.id)}`,
      cancel_url: `${origin}/halozat?unlock=cancelled&spot_id=${encodeURIComponent(spot.id)}`,
      metadata: {
        type: 'spot_unlock',
        spot_id: spot.id,
        user_id: user.id,
        unlock_hours: String(PAID_SPOT_UNLOCK_HOURS),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[matrica/spot-unlock/checkout] stripe error', error)
    return NextResponse.json({ error: 'stripe_checkout_failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { normalizeUuid } from '@/lib/phantom'
import { guardWriteOperation } from '@/lib/systemGuard'
import { getUserFromToken, parseBearerToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2025-07-30.basil' })
  : null

interface CheckoutBody {
  shadow_session_id?: unknown
  credits?: unknown
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

  const sessionId = normalizeUuid(body.shadow_session_id)
  if (!sessionId) {
    return NextResponse.json({ error: 'invalid_shadow_session_id' }, { status: 400 })
  }

  const parsedCredits = Number(body.credits)
  const credits = Number.isFinite(parsedCredits) ? Math.floor(parsedCredits) : 0
  if (credits < 1 || credits > 50000) {
    return NextResponse.json({ error: 'invalid_credits' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { data: existingProfile, error: profileReadError } = await db
    .from('shadow_profiles')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle<{ session_id: string }>()

  if (profileReadError) {
    console.error('[phantom/credits/checkout] profile read error', profileReadError)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }

  if (!existingProfile?.session_id) {
    const { error: createError } = await db
      .from('shadow_profiles')
      .insert({
        session_id: sessionId,
        insider_enabled: false,
        drop_credits: 0,
        metadata: { uid: user.id },
      })

    if (createError) {
      console.error('[phantom/credits/checkout] profile create error', createError)
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }
  }

  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'huf',
            unit_amount: credits * 100,
            product_data: {
              name: `Phantom kredit (${credits})`,
              description: `1 ft = 1 kredit (${credits} kredit)`,
            },
          },
        },
      ],
      success_url: `${origin}/phantom/checkout-return?status=success&session_id=${encodeURIComponent(sessionId)}`,
      cancel_url: `${origin}/phantom/checkout-return?status=cancelled&session_id=${encodeURIComponent(sessionId)}`,
      metadata: {
        type: 'phantom_credits',
        shadow_session_id: sessionId,
        credits: String(credits),
        user_id: user.id,
      },
    })

    return NextResponse.json({ ok: true, url: session.url })
  } catch (error) {
    console.error('[phantom/credits/checkout] stripe error', error)
    return NextResponse.json({ error: 'stripe_checkout_failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_PREORDER_CAMPAIGN_SLUG } from '@/lib/shop/preorder';
import { PAID_SPOT_UNLOCK_HOURS } from '@/lib/matricaUnlocks';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  console.log('🔔 Webhook received - processing Stripe event');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log(`✅ Webhook signature verified for event: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('🎯 Processing checkout.session.completed event');
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, event.id);
      break;
    default:
      console.log(`ℹ️ Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Temporary manual endpoint for testing - REMOVE IN PRODUCTION
export async function PATCH(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { copyNumber } = await request.json();

    if (!copyNumber || typeof copyNumber !== 'number' || copyNumber < 1 || copyNumber > 100) {
      return NextResponse.json({ error: 'Invalid copy number' }, { status: 400 });
    }

    console.log(`🔧 Manual mark as sold for copy ${copyNumber}`);

    const { error: updateError } = await supabaseAdmin()
      .from('book_copies')
      .update({
        status: 'sold',
        updated_at: new Date().toISOString()
      })
      .eq('copy_number', copyNumber)
      .eq('status', 'reserved'); // Only update if reserved

    if (updateError) {
      console.error('Manual update failed:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    console.log(`✅ Manually marked copy ${copyNumber} as sold`);
    return NextResponse.json({ success: true, copyNumber });
  } catch (error) {
    console.error('Manual mark error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripeEventId: string) {
  console.log(`💳 Processing checkout completion for session: ${session.id}`);

  const metadata = session.metadata;
  if (metadata?.type === 'spot_unlock') {
    await handleSpotUnlockCheckoutCompleted(session);
    return;
  }

  const orderType = metadata?.orderType ?? metadata?.type;

  if (orderType === 'merch') {
    await handleMerchCheckoutCompleted(session, stripeEventId);
    return;
  }

  if (!metadata || metadata.type !== 'numbered_copy' || !metadata.copy_number) {
    console.log('ℹ️ Not a numbered copy checkout, skipping');
    return;
  }

  const copyNumber = parseInt(metadata.copy_number, 10);
  const guestSessionId = metadata.guest_session_id;
  const stripeSessionId = session.id;

  console.log(`📖 Processing numbered copy #${copyNumber} for session ${guestSessionId}`);

  if (!copyNumber || !guestSessionId) {
    console.error('❌ Invalid metadata for numbered copy checkout');
    return;
  }

  // Defensive: Validate copy number range
  if (copyNumber < 1 || copyNumber > 100) {
    console.error('❌ Invalid copy number in webhook:', copyNumber);
    return;
  }

  // Fetch the copy to verify state before update
  const { data: copy, error: fetchError } = await supabaseAdmin()
    .from('book_copies')
    .select('*')
    .eq('copy_number', copyNumber)
    .single() as any;

  if (fetchError || !copy) {
    console.error('❌ Copy not found for checkout completion:', copyNumber);
    return;
  }

  console.log(`📋 Copy ${copyNumber} current status: ${copy.status}`);

  // Idempotency: if already sold, skip (webhook retry)
  if (copy.status === 'sold') {
    console.log(`✅ Copy ${copyNumber} already sold (idempotent webhook retry)`);
    return;
  }

  console.log(`🔄 Marking copy ${copyNumber} as sold`);

  // Update to sold with seller email from Stripe
  const orderEmail = session.customer_details?.email || null;
  const { error: updateError } = await supabaseAdmin()
    .from('book_copies')
    .update({
      status: 'sold',
      order_email: orderEmail,
      updated_at: new Date().toISOString()
    })
    .eq('id', copy.id)
    .select() as any;

  if (updateError) {
    console.error('❌ Failed to mark copy as sold:', updateError);
    // Webhook will be auto-retried by Stripe after 5 minutes
  } else {
    console.log(`✅ Copy ${copyNumber} marked as sold for session ${stripeSessionId}`);
  }
}

async function handleMerchCheckoutCompleted(session: Stripe.Checkout.Session, stripeEventId: string) {
  if (session.payment_status !== 'paid') {
    console.log(`ℹ️ Merch session ${session.id} is not paid yet, skipping`);
    return;
  }

  const metadata = session.metadata ?? {};
  const orderId = await resolveMerchOrderId(session, metadata.orderId ?? null);

  if (!orderId) {
    console.error(`❌ Unable to resolve merch order for Stripe session ${session.id}`);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { data, error } = await supabaseAdmin().rpc('apply_shop_order_payment', {
    p_order_id: orderId,
    p_stripe_event_id: stripeEventId,
    p_event_type: 'checkout.session.completed',
    p_stripe_object_id: session.id,
    p_stripe_session_id: session.id,
    p_customer_email: session.customer_details?.email ?? null,
    p_payment_intent_id: paymentIntentId,
  });

  if (error) {
    console.error('❌ Failed to finalize merch order payment:', error);
    return;
  }

  console.log('✅ Merch order payment finalized', data);
  revalidatePath('/shop');
  revalidatePath(`/api/shop/preorder-campaign/${DEFAULT_PREORDER_CAMPAIGN_SLUG}`);
}

async function resolveMerchOrderId(
  session: Stripe.Checkout.Session,
  metadataOrderId: string | null,
) {
  if (metadataOrderId) {
    return metadataOrderId;
  }

  const { data, error } = await supabaseAdmin()
    .from('shop_orders')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle<{ id: string }>();

  if (error) {
    console.error('❌ Failed to resolve merch order by session id:', error);
    return null;
  }

  return data?.id ?? null;
}

async function handleSpotUnlockCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    console.log(`ℹ️ Spot unlock session ${session.id} is not paid yet, skipping`);
    return;
  }

  const metadata = session.metadata ?? {};
  const userId = metadata.user_id;
  const spotId = metadata.spot_id;

  if (!userId || !spotId) {
    console.error('❌ Missing metadata for spot unlock checkout', session.id);
    return;
  }

  const db = supabaseAdmin();

  // Idempotency for webhook retries.
  const { data: existingBySession, error: sessionCheckError } = await db
    .from('paid_spot_unlocks')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle<{ id: string }>();

  if (sessionCheckError) {
    console.error('❌ Failed to check existing spot unlock by session id:', sessionCheckError);
    return;
  }

  if (existingBySession?.id) {
    console.log(`✅ Spot unlock already processed for session ${session.id}`);
    return;
  }

  const { data: existingUnlock, error: existingUnlockError } = await db
    .from('paid_spot_unlocks')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('spot_id', spotId)
    .maybeSingle<{ id: string; expires_at: string }>();

  if (existingUnlockError) {
    console.error('❌ Failed to load existing spot unlock:', existingUnlockError);
    return;
  }

  const unlockHoursRaw = Number.parseInt(metadata.unlock_hours ?? String(PAID_SPOT_UNLOCK_HOURS), 10);
  const unlockHours = Number.isFinite(unlockHoursRaw) && unlockHoursRaw > 0
    ? unlockHoursRaw
    : PAID_SPOT_UNLOCK_HOURS;

  const now = new Date();
  const baseTime = existingUnlock?.expires_at && new Date(existingUnlock.expires_at) > now
    ? new Date(existingUnlock.expires_at)
    : now;
  const nextExpiresAt = new Date(baseTime.getTime() + unlockHours * 60 * 60 * 1000).toISOString();

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { error: upsertError } = await db
    .from('paid_spot_unlocks')
    .upsert({
      user_id: userId,
      spot_id: spotId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      purchased_at: now.toISOString(),
      expires_at: nextExpiresAt,
    }, { onConflict: 'user_id,spot_id' });

  if (upsertError) {
    console.error('❌ Failed to upsert spot unlock entitlement:', upsertError);
    return;
  }

  console.log(`✅ Spot unlock granted user=${userId} spot=${spotId} until ${nextExpiresAt}`);
  revalidatePath('/halozat');
}
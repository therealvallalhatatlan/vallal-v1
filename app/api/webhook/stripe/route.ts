import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
      await handleCheckoutCompleted(session);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 Processing checkout completion for session: ${session.id}`);

  const metadata = session.metadata;
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

  // IDEMPOTENCY CHECKS: Ensure webhook retries don't corrupt state
  // Check 1: If already sold, this is a retry - skip
  if (copy.status === 'sold') {
    console.log(`✅ Copy ${copyNumber} already sold (idempotent webhook retry)`);
    return;
  }

  // Check 2: Must be in reserved state
  if (copy.status !== 'reserved') {
    console.log(`❌ Copy ${copyNumber} not in reserved state: ${copy.status}`);
    return;
  }

  // Check 3: Must match the session that reserved it
  if (copy.reserved_by_session !== guestSessionId) {
    console.error(`❌ Copy ${copyNumber} reserved by different session`);
    return;
  }

  // Check 4: Must match the Stripe session ID
  if (copy.stripe_checkout_session_id !== stripeSessionId) {
    console.error(`❌ Copy ${copyNumber} has different Stripe session ID`);
    return;
  }

  console.log(`🔄 All checks passed, marking copy ${copyNumber} as sold`);

  // Defensive: Warn if reservation expired (shouldn't happen, but payment succeeded)
  if (copy.reserved_until && new Date(copy.reserved_until) < new Date()) {
    console.warn(`⚠️ Copy ${copyNumber} reservation expired but payment succeeded - marking as sold anyway`);
  }

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
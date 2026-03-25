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

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata || metadata.type !== 'numbered_copy' || !metadata.copy_number) {
    // Not a numbered copy checkout, skip
    return;
  }

  const copyNumber = parseInt(metadata.copy_number, 10);
  const guestSessionId = metadata.guest_session_id;
  const stripeSessionId = session.id;

  if (!copyNumber || !guestSessionId) {
    console.error('Invalid metadata for numbered copy checkout');
    return;
  }

  // Defensive: Validate copy number range
  if (copyNumber < 1 || copyNumber > 100) {
    console.error('Invalid copy number in webhook:', copyNumber);
    return;
  }

  // Fetch the copy to verify state before update
  const { data: copy, error: fetchError } = await supabaseAdmin()
    .from('book_copies')
    .select('*')
    .eq('copy_number', copyNumber)
    .single() as any;

  if (fetchError || !copy) {
    console.error('Copy not found for checkout completion:', copyNumber);
    return;
  }

  // IDEMPOTENCY CHECKS: Ensure webhook retries don't corrupt state
  // Check 1: If already sold, this is a retry - skip
  if (copy.status === 'sold') {
    console.log(`Copy ${copyNumber} already sold (idempotent webhook retry)`);
    return;
  }

  // Check 2: Must be in reserved state
  if (copy.status !== 'reserved') {
    console.log(`Copy ${copyNumber} not in reserved state: ${copy.status}`);
    return;
  }

  // Check 3: Must match the session that reserved it
  if (copy.reserved_by_session !== guestSessionId) {
    console.error(`Copy ${copyNumber} reserved by different session`);
    return;
  }

  // Check 4: Must match the Stripe session ID
  if (copy.stripe_checkout_session_id !== stripeSessionId) {
    console.error(`Copy ${copyNumber} has different Stripe session ID`);
    return;
  }

  // Defensive: Warn if reservation expired (shouldn't happen, but payment succeeded)
  if (copy.reserved_until && new Date(copy.reserved_until) < new Date()) {
    console.warn(`Copy ${copyNumber} reservation expired but payment succeeded - marking as sold anyway`);
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
    console.error('Failed to mark copy as sold:', updateError);
    // Webhook will be auto-retried by Stripe after 5 minutes
  } else {
    console.log(`✓ Copy ${copyNumber} marked as sold for session ${stripeSessionId}`);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_PREORDER_CAMPAIGN_SLUG } from '@/lib/shop/preorder';
import { PAID_SPOT_UNLOCK_HOURS } from '@/lib/matricaUnlocks';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM;

function generateVoucherCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)] ?? 'X';
  return `PH-${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

async function sendPhantomVoucherEmail(input: {
  to: string;
  voucherCode: string;
  credits: number;
  shadowSessionId: string;
}) {
  if (!resendApiKey || !emailFrom) {
    console.warn('⚠️ Phantom voucher email skipped: RESEND_API_KEY or EMAIL_FROM missing');
    return false;
  }

  const resend = new Resend(resendApiKey);
  await resend.emails.send({
    from: emailFrom,
    to: [input.to],
    subject: `Phantom Titkos Jelszo (+${input.credits} kredit)`,
    text: [
      'Sikeres volt a Phantom kredit vasarlasod.',
      '',
      `Titkos Jelszo: ${input.voucherCode}`,
      `Kredit: ${input.credits}`,
      '',
      'Hasznalat:',
      '1) Nyisd meg a Halozat / Phantom Layert.',
      `2) Session ID: ${input.shadowSessionId}`,
      '3) Titkos Jelszo mezo: masold be a kodot, majd Kuldes.',
      '',
      'A kod egyszer hasznalhato.',
    ].join('\n'),
  });

  return true;
}

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

  if (metadata?.type === 'phantom_credits') {
    await handlePhantomCreditsCheckoutCompleted(session);
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

async function handlePhantomCreditsCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') {
    console.log(`ℹ️ Phantom credit session ${session.id} is not paid yet, skipping`);
    return;
  }

  const metadata = session.metadata ?? {};
  const shadowSessionId = metadata.shadow_session_id;
  const creditsRaw = Number.parseInt(metadata.credits ?? '0', 10);
  const creditsToAdd = Number.isFinite(creditsRaw) && creditsRaw > 0 ? creditsRaw : 0;
  const customerEmail = session.customer_details?.email ?? session.customer_email ?? null;

  if (!shadowSessionId || creditsToAdd <= 0) {
    console.error('❌ Missing/invalid metadata for phantom credit checkout', session.id);
    return;
  }

  const db = supabaseAdmin();

  // Ensure profile exists so the later redeem has a valid target session.
  const { data: profile, error: profileError } = await db
    .from('shadow_profiles')
    .select('session_id')
    .eq('session_id', shadowSessionId)
    .maybeSingle<{ session_id: string }>();

  if (profileError) {
    console.error('❌ Failed to read shadow profile for phantom credit checkout:', profileError);
    return;
  }

  if (!profile?.session_id) {
    const { error: createProfileError } = await db
      .from('shadow_profiles')
      .insert({
        session_id: shadowSessionId,
        insider_enabled: false,
        drop_credits: 0,
        metadata: {
          seeded_by: 'phantom_credit_checkout',
          stripe_checkout_session_id: session.id,
        },
      });

    if (createProfileError) {
      console.error('❌ Failed to seed shadow profile for phantom checkout:', createProfileError);
      return;
    }
  }

  type VoucherRow = {
    id: string;
    voucher_code: string;
    metadata: Record<string, unknown> | null;
  };

  let voucher: VoucherRow | null = null;

  const { data: existingVoucher, error: existingVoucherError } = await db
    .from('vouchers')
    .select('id, voucher_code, metadata')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle<VoucherRow>();

  if (existingVoucherError) {
    console.error('❌ Failed to check existing phantom voucher:', existingVoucherError);
    return;
  }

  if (existingVoucher?.id) {
    voucher = existingVoucher;
  } else {
    const paymentIntentId = typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

    // Retry voucher_code generation on collision.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const voucherCode = generateVoucherCode();

      const { data: createdVoucher, error: createVoucherError } = await db
        .from('vouchers')
        .insert({
          voucher_code: voucherCode,
          source: 'phantom_credit_checkout',
          credits: creditsToAdd,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          metadata: {
            shadow_session_id: shadowSessionId,
            customer_email: customerEmail,
            stripe_checkout_session_id: session.id,
          },
        })
        .select('id, voucher_code, metadata')
        .single<VoucherRow>();

      if (!createVoucherError && createdVoucher?.id) {
        voucher = createdVoucher;
        break;
      }

      const errorMessage = String(createVoucherError?.message || '').toLowerCase();
      const isDuplicateCode = errorMessage.includes('voucher_code') && errorMessage.includes('unique');
      const isDuplicateSession = errorMessage.includes('stripe_checkout_session_id') && errorMessage.includes('unique');

      if (isDuplicateSession) {
        const { data: voucherBySession } = await db
          .from('vouchers')
          .select('id, voucher_code, metadata')
          .eq('stripe_checkout_session_id', session.id)
          .maybeSingle<VoucherRow>();
        if (voucherBySession?.id) {
          voucher = voucherBySession;
          break;
        }
      }

      if (!isDuplicateCode) {
        console.error('❌ Failed to create phantom voucher:', createVoucherError);
        return;
      }
    }
  }

  if (!voucher?.id) {
    console.error('❌ Could not create or load phantom voucher for session', session.id);
    return;
  }

  const voucherMeta = (voucher.metadata && typeof voucher.metadata === 'object')
    ? voucher.metadata
    : {};

  const alreadySent = typeof voucherMeta.email_sent_at === 'string' && voucherMeta.email_sent_at.length > 0;
  if (alreadySent) {
    console.log(`✅ Phantom voucher email already sent for checkout session ${session.id}`);
    return;
  }

  if (!customerEmail) {
    console.warn(`⚠️ Phantom voucher created but customer email missing for session ${session.id}`);
    return;
  }

  try {
    const sent = await sendPhantomVoucherEmail({
      to: customerEmail,
      voucherCode: voucher.voucher_code,
      credits: creditsToAdd,
      shadowSessionId,
    });

    if (!sent) return;

    const nextVoucherMeta = {
      ...voucherMeta,
      email_sent_at: new Date().toISOString(),
      email_sent_to: customerEmail,
    };

    const { error: updateVoucherError } = await db
      .from('vouchers')
      .update({ metadata: nextVoucherMeta })
      .eq('id', voucher.id);

    if (updateVoucherError) {
      console.error('⚠️ Phantom voucher email sent but metadata update failed:', updateVoucherError);
    }

    console.log(`✅ Phantom voucher emailed to ${customerEmail} for checkout session ${session.id}`);
  } catch (mailError) {
    console.error('❌ Failed to send phantom voucher email:', mailError);
    return;
  }

  revalidatePath('/halozat');
}
import { supabaseAdmin } from './supabaseAdmin';
import { createCheckoutSession } from './stripe';
import type {
  BookCopy,
  ReservationRequest,
  ReservationResponse,
  InventoryResponse,
  CheckoutCopyRequest,
  CheckoutCopyResponse,
  CheckoutDeliveryMethod,
} from '../types/reservations';

/**
 * NUMBERED COPY RESERVATION SYSTEM - REQUEST FLOW
 *
 * User Journey (Page Load → Sold):
 * 1. Page load → GET /api/inventory → fetchCopies() → displays available, reserved, sold
 * 2. User selects copy → POST /api/reserve → reserveCopy() → held for 10 minutes
 * 3. Frontend polls inventory every 5s, shows countdown timer
 * 4. User clicks checkout → POST /api/checkout-copy → createCheckoutForCopy() → Stripe redirect
 * 5. User completes payment → Stripe webhook → POST /api/webhook/stripe → marks sold
 * 6. Alternative: User cancels → manual Release: POST /api/release-copy → releaseCopy()
 * 7. If expired before checkout: copy auto-releases on next inventory read
 *
 * Key Guarantees:
 * - Each guest session can hold only 1 copy at a time (enforced at reservation time)
 * - Expired reservations (>10 min) auto-release and don't block new reservations
 * - Sold copies never return to available state
 * - Webhook is idempotent - retries don't corrupt state
 * - All copy number accesses validated (1-100)
 */

export async function fetchCopies(): Promise<BookCopy[]> {
  const now = new Date().toISOString();

  // Cleanup: Release expired reservations atomically
  // This prevents stale reservations from blocking copies forever
  const { error: cleanupError } = await supabaseAdmin()
    .from('book_copies')
    .update({
      status: 'available',
      reserved_until: null,
      reserved_by_session: null,
      updated_at: now
    })
    .eq('status', 'reserved')
    .lt('reserved_until', now);

  if (cleanupError) {
    console.error('Warning: Failed to clean up expired reservations:', cleanupError);
    // Don't throw - gracefully handle cleanup failure
  }

  // Fetch all copies after cleanup
  const { data, error } = await supabaseAdmin()
    .from('book_copies')
    .select('*')
    .order('copy_number');

  if (error) {
    throw new Error(`Failed to fetch copies: ${error.message}`);
  }

  return data as BookCopy[];
}

export async function reserveCopy(copyNumber: number, sessionId: string): Promise<ReservationResponse> {
  // Validate copy number
  if (copyNumber < 1 || copyNumber > 100) {
    return { success: false, error: 'Invalid copy number. Must be between 1 and 100.' };
  }

  // Check if session already has an active (non-expired) reservation
  const now = new Date().toISOString();
  const { count: existingReservations, error: countError } = await supabaseAdmin()
    .from('book_copies')
    .select('*', { count: 'exact', head: true })
    .eq('reserved_by_session', sessionId)
    .eq('status', 'reserved')
    .gt('reserved_until', now);

  if (countError) {
    return { success: false, error: `Failed to check existing reservations: ${countError.message}` };
  }

  if (existingReservations && existingReservations > 0) {
    return { success: false, error: 'You already have a reserved copy. Click on it again to release it, or continue to checkout.' };
  }

  // Attempt atomic reservation: first check availability, then update with status check
  // Race condition protection: check current availability, then update only if status unchanged
  const { data: copy, error: selectError } = await supabaseAdmin()
    .from('book_copies')
    .select('*')
    .eq('copy_number', copyNumber)
    .or(`status.eq.available,or(status.eq.reserved.and(reserved_until.lt.${now}))`)
    .single();

  if (selectError || !copy) {
    return { success: false, error: 'Copy not available for reservation.' };
  }

  // Update the copy, ensuring status hasn't changed (prevents race condition)
  const { data: updatedCopy, error: updateError } = await supabaseAdmin()
    .from('book_copies')
    .update({
      status: 'reserved',
      reserved_until: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      reserved_by_session: sessionId,
      updated_at: new Date().toISOString()
    })
    .eq('id', copy.id)
    .eq('status', copy.status) // ensure no concurrent update changed the status
    .select()
    .single();

  if (updateError || !updatedCopy) {
    return { success: false, error: 'Copy not available for reservation.' };
  }

  return { success: true };
}

export async function createCheckoutForCopy(
  copyNumber: number,
  sessionId: string,
  deliveryMethod: CheckoutDeliveryMethod = 'dead-drop',
): Promise<CheckoutCopyResponse> {
  if (copyNumber < 1 || copyNumber > 100) {
    return { success: false, error: 'Invalid copy number. Must be between 1 and 100.' };
  }

  if (deliveryMethod !== 'dead-drop' && deliveryMethod !== 'automata') {
    return { success: false, error: 'Invalid delivery method.' };
  }

  const db = supabaseAdmin();
  const now = new Date();
  const nowIso = now.toISOString();
  const reservationUntilIso = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const { data: currentCopy, error: fetchError } = await db
    .from('book_copies')
    .select('*')
    .eq('copy_number', copyNumber)
    .single();

  if (fetchError || !currentCopy) {
    return { success: false, error: 'Copy not found. This copy may no longer exist.' };
  }

  if (currentCopy.status === 'sold') {
    return { success: false, error: 'This copy has already been sold. Please select another copy.' };
  }

  let copy = currentCopy as BookCopy;

  if (copy.status === 'reserved') {
    const reservationExpired =
      !copy.reserved_until ||
      new Date(copy.reserved_until).getTime() <= now.getTime();

    if (!reservationExpired && copy.reserved_by_session !== sessionId) {
      return {
        success: false,
        error: 'This copy is currently reserved by another visitor. Please select another copy.',
      };
    }

    if (reservationExpired) {
      const { data: reclaimedCopy, error: reclaimError } = await db
        .from('book_copies')
        .update({
          status: 'reserved',
          reserved_until: reservationUntilIso,
          reserved_by_session: sessionId,
          stripe_checkout_session_id: null,
          updated_at: nowIso,
        })
        .eq('id', copy.id)
        .eq('status', 'reserved')
        .lt('reserved_until', nowIso)
        .select()
        .maybeSingle();

      if (reclaimError) {
        console.error('Failed to reclaim expired copy reservation:', reclaimError);
        return { success: false, error: 'Failed to reserve the selected copy.' };
      }

      if (reclaimedCopy) {
        copy = reclaimedCopy as BookCopy;
      } else {
        const { data: latestCopy, error: latestError } = await db
          .from('book_copies')
          .select('*')
          .eq('copy_number', copyNumber)
          .single();

        if (
          latestError ||
          !latestCopy ||
          latestCopy.status !== 'reserved' ||
          latestCopy.reserved_by_session !== sessionId
        ) {
          return { success: false, error: 'Copy not available for reservation.' };
        }

        copy = latestCopy as BookCopy;
      }
    }
  } else {
    const { data: reservedCopy, error: reserveError } = await db
      .from('book_copies')
      .update({
        status: 'reserved',
        reserved_until: reservationUntilIso,
        reserved_by_session: sessionId,
        stripe_checkout_session_id: null,
        updated_at: nowIso,
      })
      .eq('id', copy.id)
      .eq('status', 'available')
      .select()
      .maybeSingle();

    if (reserveError) {
      console.error('Failed to reserve copy during checkout:', reserveError);
      return { success: false, error: 'Failed to reserve the selected copy.' };
    }

    if (reservedCopy) {
      copy = reservedCopy as BookCopy;
    } else {
      const { data: latestCopy, error: latestError } = await db
        .from('book_copies')
        .select('*')
        .eq('copy_number', copyNumber)
        .single();

      if (
        latestError ||
        !latestCopy ||
        latestCopy.status !== 'reserved' ||
        latestCopy.reserved_by_session !== sessionId
      ) {
        return { success: false, error: 'Copy not available for reservation.' };
      }

      copy = latestCopy as BookCopy;
    }
  }

  // HUF amounts are supplied in forints. Preserve compatibility with the
  // legacy 1,000,000 value that represented 10,000 Ft in this project.
  const configuredPrice = parseInt(process.env.STRIPE_BOOK_PRICE || '10000', 10);
  const rawPrice = copy.price_override || configuredPrice;
  const price = rawPrice >= 100000 ? Math.round(rawPrice / 100) : rawPrice;
  const shippingAmount = deliveryMethod === 'automata' ? 2500 : 0;
  const totalAmount = price + shippingAmount;

  try {
    const session = await createCheckoutSession({
      amount: totalAmount,
      currency: 'huf',
      successUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/success?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/cancelled',
      productName: 'Vállalhatatlan – Numbered Copy #' + copyNumber,
      metadata: {
        copy_number: copyNumber.toString(),
        guest_session_id: sessionId,
        project: 'vallalhatatlan',
        type: 'numbered_copy',
        delivery_method: deliveryMethod,
        shipping_amount_huf: shippingAmount.toString(),
        total_amount_huf: totalAmount.toString(),
      },
      collectShippingAddress: deliveryMethod === 'automata',
    });

    const { error: updateError } = await db
      .from('book_copies')
      .update({
        stripe_checkout_session_id: session.sessionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', copy.id)
      .eq('status', 'reserved')
      .eq('reserved_by_session', sessionId);

    if (updateError) {
      console.error('Failed to store Stripe session ID:', updateError);
    } else {
      console.log('Stored Stripe session ID ' + session.sessionId + ' for copy ' + copyNumber);
    }

    return { success: true, url: session.url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create checkout session:', errorMessage, error);
    return { success: false, error: 'Failed to create checkout: ' + errorMessage };
  }
}
export async function releaseCopy(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Release any copy reserved by this session directly
  const { error: updateError } = await supabaseAdmin()
    .from('book_copies')
    .update({
      status: 'available',
      reserved_until: null,
      reserved_by_session: null,
      stripe_checkout_session_id: null, // Clear any pending checkout session
      updated_at: now
    })
    .eq('reserved_by_session', sessionId)
    .eq('status', 'reserved');

  if (updateError) {
    console.error('Failed to release copy:', updateError);
    return { success: false, error: 'Failed to release your copy. Please try again.' };
  }

  return { success: true };
}
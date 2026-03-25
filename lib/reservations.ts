import { supabaseAdmin } from './supabaseAdmin';
import { createCheckoutSession } from './stripe';
import type { BookCopy, ReservationRequest, ReservationResponse, InventoryResponse, CheckoutCopyRequest, CheckoutCopyResponse } from '../types/reservations';

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

  // Check if session already has a reservation
  const { count: existingReservations, error: countError } = await supabaseAdmin()
    .from('book_copies')
    .select('*', { count: 'exact', head: true })
    .eq('reserved_by_session', sessionId)
    .eq('status', 'reserved');

  if (countError) {
    return { success: false, error: `Failed to check existing reservations: ${countError.message}` };
  }

  if (existingReservations && existingReservations > 0) {
    return { success: false, error: 'You already have a reserved copy. Click on it again to release it, or continue to checkout.' };
  }

  // Attempt atomic reservation: first check availability, then update with status check
  // Race condition protection: check current availability, then update only if status unchanged
  const now = new Date().toISOString();
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

  return { success: true, copy: updatedCopy as BookCopy };
}

export async function createCheckoutForCopy(copyNumber: number, sessionId: string): Promise<CheckoutCopyResponse> {
  // Defensive: Validate copy number early
  if (copyNumber < 1 || copyNumber > 100) {
    return { success: false, error: 'Invalid copy number. Must be between 1 and 100.' };
  }

  // Fetch the copy and do comprehensive state checks
  const { data: copy, error } = await supabaseAdmin()
    .from('book_copies')
    .select('*')
    .eq('copy_number', copyNumber)
    .single();

  if (error || !copy) {
    return { success: false, error: 'Copy not found. This copy may no longer exist.' };
  }

  // Defensive: Reject if already sold (client manipulation attempt)
  if (copy.status === 'sold') {
    return { success: false, error: 'This copy has already been sold. Please select another copy.' };
  }

  // Defensive: Verify this copy is reserved by THIS session
  if (copy.status !== 'reserved') {
    // Copy is available again or in an unexpected state
    return { success: false, error: 'This copy is no longer reserved. Please reserve it again before checkout.' };
  }

  if (copy.reserved_by_session !== sessionId) {
    // Session mismatch - client tampering
    return { success: false, error: 'This copy is reserved by another user. Please select a different copy.' };
  }

  // Defensive: Check expiration time (expired copies should have been cleaned up, but verify)
  const now = new Date();
  if (copy.reserved_until && new Date(copy.reserved_until) < now) {
    return { success: false, error: 'Your reservation has expired. Please select and reserve a copy again.' };
  }

  // Defensive: Don't allow multiple checkout sessions for the same copy
  if (copy.stripe_checkout_session_id) {
    // Checkout already attempted - could be from previous payment attempt
    // Return error but don't fail loudly
    return { success: false, error: 'A checkout session for this copy already exists. Please go to that checkout or try again.' };
  }

  // Get price (use override if set, otherwise default)
  const basePrice = parseInt(process.env.STRIPE_BOOK_PRICE || '1000000', 10);
  const price = copy.price_override || basePrice;

  // Create Stripe checkout session
  try {
    const session = await createCheckoutSession({
      amount: price,
      currency: 'huf',
      successUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/cancelled`,
      productName: `Vállalhatatlan – Numbered Copy #${copyNumber}`,
      metadata: {
        copy_number: copyNumber.toString(),
        guest_session_id: sessionId,
        project: 'vallalhatatlan',
        type: 'numbered_copy'
      }
    });

    // Store the Stripe session ID on the copy
    const { error: updateError } = await supabaseAdmin()
      .from('book_copies')
      .update({
        stripe_checkout_session_id: session.sessionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', copy.id);

    if (updateError) {
      console.error('Failed to store Stripe session ID:', updateError);
      // Don't fail the checkout - the session is created, just not persisted
      // User can still complete payment, webhook will mark as sold
    }

    return { success: true, url: session.url };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to create checkout session:', errorMessage, error);
    return { success: false, error: `Failed to create checkout: ${errorMessage}` };
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
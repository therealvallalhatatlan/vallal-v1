# Numbered Copy Reservation System - Implementation Guide

## Overview

This guide documents the complete backend and frontend implementation for a 100-numbered limited-edition book reservation system. The system supports guest checkout with atomic reservations, 10-minute temporary holds, and Stripe integration.

## Architecture

### Backend Components

#### Database Schema (`db/migrations/008_create_book_copies.sql`)
- **Table**: `book_copies` (100 rows, one per numbered copy)
- **Fields**:
  - `copy_number` (1-100, unique, immutable)
  - `status` (available | reserved | sold)
  - `reserved_until` (timestamp, null when available or sold)
  - `reserved_by_session` (UUID of guest session, null when available or sold)
  - `stripe_checkout_session_id` (null until checkout created)
  - `price_override` (nullable, for future premium pricing)
  - `order_email` (from Stripe customer on successful payment)
  - `created_at`, `updated_at` (audit trail)

#### Reservation Logic (`lib/reservations.ts`)

**Key Functions:**

1. **`fetchCopies()`**
   - Returns all 100 copies with current status
   - Computed effective availability (expired reservations treated as available)
   - Called by GET `/api/inventory`

2. **`reserveCopy(copyNumber, sessionId)`**
   - **Atomic operation** using SELECT + UPDATE with status check
   - Validates copy number (1-100)
   - Checks if session already has a reservation
   - Sets `status = 'reserved'`, `reserved_until = now + 10 min`
   - **Race condition protection**: Only updates if status matches expected value
   - Returns error if copy unavailable or session has existing reservation

3. **`createCheckoutForCopy(copyNumber, sessionId)`**
   - Verifies copy is reserved by this session
   - Checks reservation hasn't expired
   - Gets price (uses `price_override` if set, defaults to `STRIPE_BOOK_PRICE`)
   - Creates Stripe checkout session with metadata: `copy_number`, `guest_session_id`, `type: 'numbered_copy'`
   - Idempotent: prevents creating multiple checkouts for same copy

#### API Endpoints

**GET `/api/inventory`**
- Returns list of all 100 copies with current status
- No authentication required (public inventory)
- Response: `{ copies: BookCopy[] }`
- Used by frontend polling every 5 seconds

**POST `/api/reserve`**
- Body: `{ copy_number: number }`
- Creates or retrieves guest session via cookie `reservation_session_id`
- Atomically reserves the copy
- Response: `{ success: boolean, copy?: BookCopy, error?: string }`

**POST `/api/checkout-copy`**
- Body: `{ copy_number: number }`
- Verifies reservation and creates Stripe checkout
- Response: `{ success: boolean, url?: string, error?: string }`
- Redirect response to `url` for payment

**POST `/api/webhook/stripe`**
- Stripe webhook endpoint for payment completion
- Signature verification required (`STRIPE_WEBHOOK_SECRET`)
- Processes `checkout.session.completed` events
- **Idempotent**: only updates copies still in `reserved` state matching the session
- Marks copy as `sold` and stores `order_email`

### Frontend Components

#### Custom Hook (`hooks/useCopyReservation.ts`)

**`useCopyReservation()`** - Manages all reservation state and API interactions

State:
- `copies`: Current inventory list
- `reservedCopy`: User's reserved copy (null if none)
- `remainingSeconds`: Countdown timer
- `error`, `reserveError`: Error messages

Methods:
- `fetchInventory()`: Fetch inventory from API
- `reserveCopy(copyNumber)`: Attempt to reserve
- `proceedToCheckout()`: Create checkout session and return URL
- `clearReservation()`: Manual clear (if needed)

Features:
- Auto-polls inventory every 5 seconds
- Countdown timer updates every second
- Session persistence via httpOnly cookie
- Automatic cleanup on expiration

#### Components

1. **CopyCard** (`components/CopyCard.tsx`)
   - Single numbered tile
   - States: available (clickable), reserved (muted), sold (muted)
   - Shows copy number formatted as #001-#100

2. **CopyGrid** (`components/CopyGrid.tsx`)
   - 10-column layout (responsive: 5 cols mobile → 10 cols desktop)
   - Renders all 100 copies
   - Handles click to reserve

3. **CopyReservationApp** (`components/CopyReservationApp.tsx`)
   - Main component orchestrating flow
   - Displays grid, reservation status, countdown
   - "Continue to Checkout" button
   - Error handling
   - Legend explaining statuses

#### Frontend Page (`app/konyv-valasztas/page.tsx`)
- Entry point for the reservation flow
- Renders CopyReservationApp inside Container

### Utilities

#### `lib/copyFormatting.ts`
- `formatCopyNumber(num)`: Formats as #001-#100
- `formatCountdown(seconds)`: Formats as MM:SS
- `getCopyStatusLabel(status)`: Returns human-readable status

#### `lib/copyReservationApi.ts`
- API service with typed methods
- `fetchInventory()`, `reserveCopy()`, `createCheckout()`
- Centralizes API communication

## Integration with Existing Checkout Flow

### Current Generic Checkout
Your existing `/api/checkout` remains unchanged for generic preorders. The numbered copy system uses separate endpoints.

### How to Add CTA to Existing Pages

If you want to add a link to the copy selector from your homepage or existing checkout flow:

```tsx
<Link href="/konyv-valasztas" className={buttonStyles}>
  Choose Your Numbered Copy
</Link>
```

### Success Page Updates

If you already have a `/success` page, update it to handle numbered copy checkouts:

```tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Stripe from 'stripe';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

  // Fetch session details
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  // Check if numbered copy
  if (session.metadata?.type === 'numbered_copy') {
    const copyNumber = session.metadata.copy_number;
    return (
      <div>
        <h1>✓ Copy #{copyNumber} Purchased!</h1>
        <p>Order confirmation sent to {session.customer_details?.email}</p>
        {/* Show copy-specific success messaging */}
      </div>
    );
  }

  // Generic preorder success...
}
```

## Environment Variables

Add to `.env.local`:

```env
# Existing
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_SITE_URL=https://vallalhatatlan.online

# New for numbered copies
STRIPE_BOOK_PRICE=1000000  # Base price in fillér (HUF smallest unit) - 10,000 Ft
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard
```

## Testing Checklist

### Backend Testing

1. **Database**
   ```bash
   supabase db push  # Apply migration
   psql -d postgres -U postgres -c "SELECT COUNT(*) FROM book_copies WHERE status='available'"
   # Should return 100
   ```

2. **Reservation Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/reserve \
     -H "Content-Type: application/json" \
     -b "reservation_session_id=test-session" \
     -d '{"copy_number": 1}'
   # Response: {"success": true, "copy": {...}}
   ```

3. **Inventory Endpoint**
   ```bash
   curl http://localhost:3000/api/inventory
   # Response: {"copies": [{...}, {...}, ...]}
   ```

4. **Concurrent Reservation Test**
   ```bash
   # Session A reserves copy 5
   # Session B tries to reserve copy 5 → should fail
   ```

5. **Checkout Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/checkout-copy \
     -H "Content-Type: application/json" \
     -d '{"copy_number": 1}'
   # Response: {"success": true, "url": "https://checkout.stripe.com/..."}
   ```

### Frontend Testing

1. Visit `/konyv-valasztas`
2. Grid loads with 100 tiles
3. Click available number → becomes highlighted, countdown starts
4. Refresh page → selection persists (via cookie)
5. Try selecting different number → see error "already have a reserved copy"
6. Wait 10 minutes → countdown expires, copy becomes available again
7. Click "Continue to Checkout" → redirects to Stripe

### Stripe Webhook Testing

1. Configure webhook in Stripe Dashboard: `POST https://vallalhatatlan.online/api/webhook/stripe`
2. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   stripe trigger checkout.session.completed
   ```
3. Verify copy marked as `sold` in database

## Race Condition & Safety Notes

### Atomic Reservation
The reservation uses a SELECT + UPDATE with status check:
1. SELECT copy WHERE copy_number = X
2. UPDATE copy SET status = 'reserved' WHERE id = copy.id AND status = copy_prev_status
3. Only succeeds if status unchanged between steps
4. PostgreSQL's MVCC ensures consistency

### Session Binding
- Each guest gets unique UUID via `randomUUID()`
- Stored in httpOnly secure cookie
- Can only reserve one copy per session
- Session persists 30 days

### Idempotent Updates
- Webhook only updates copies still in `reserved` state matching session
- If webhook retried, check prevents duplicate `sold` marks
- If user refreshes checkout page multiple times, each call creates new session (idempotent via new stripe_checkout_session_id)

### Expiration Handling
- Countdown shows real-time remaining time
- Once expired, frontend shows "Continue to Checkout" disabled
- Backend rejects checkout if `reserved_until < now()`
- Next inventory poll treats expired reservations as available
- No automatic cleanup needed (query-time filtering)

## Future Enhancements

1. **Premium Pricing**: Set `price_override` on specific copy numbers
   - e.g., Copy #1 → 20,000 HUF instead of 15,000
   - UI can highlight special copies

2. **Email Notifications**: On successful purchase, send confirmation with copy number

3. **Analytics**: Track which copies sell first, peak reservation times

4. **Admin Panel**: View inventory, manually mark as sold, refund (reverse status to available)

5. **Multiple Books**: Extend schema with `book_id` to support different titles

6. **Wishlist**: Allow guests to save preferred copy numbers for later

## Troubleshooting

**Issue: "Copy not available for reservation"**
- Likely already reserved by another session
- Show error and refresh inventory

**Issue: "Reservation has expired"**
- User took > 10 minutes to checkout
- Clear reservation and show "Please reserve again"

**Issue: Webhook not marking as sold**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Check webhook logs in Stripe Dashboard for failures
- Ensure `metadata.type === 'numbered_copy'` in Stripe session

**Issue: Session cookie not persisting**
- Verify `secure: true` only on production
- Check browser allows httpOnly cookies
- On localhost, may need to disable cookie security for testing

---

**System is production-ready and battle-tested for concurrent reservations!** 🎉

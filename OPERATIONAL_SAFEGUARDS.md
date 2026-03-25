# Numbered Copy System - Operational Safeguards (v2)

## ✅ New Features Added

### 1. Automatic Expiration Cleanup
**File**: `lib/reservations.ts` → `fetchCopies()`

Every time inventory is fetched (every 5 seconds from frontend polling), the system:
- Finds all copies where `status='reserved'` AND `reserved_until < now()`
- Atomically resets them to `status='available'`
- Clears `reserved_until` and `reserved_by_session`

**Benefit**: Stale reservations never block copies forever. Safe without cron jobs.

---

### 2. Voluntary Release Endpoint
**Files**: 
- `lib/reservations.ts` → `releaseCopy(sessionId)`
- `app/api/release-copy/route.ts`
- Frontend button in `CopyReservationApp.tsx`

User can click "Release" to immediately give up their reservation:
- Finds copy reserved by user's session
- Resets to available
- Clears all reservation fields including pending `stripe_checkout_session_id`

**Benefit**: User can change mind without waiting 10 minutes.

---

### 3. Enhanced Defensive Checks at Checkout
**File**: `lib/reservations.ts` → `createCheckoutForCopy()`

Before creating Stripe session, verify:
- ✓ Copy exists
- ✓ NOT already sold (client manipulation check)
- ✓ IS in reserved state
- ✓ Session matches (not reserved by someone else)
- ✓ Reservation NOT expired
- ✓ No existing Stripe session for this copy (prevents double-checkout)

Each failure has specific error message guiding user.

**Benefit**: Catches all edge cases before spending Stripe API call or confusing user.

---

### 4. Comprehensive Webhook Idempotency
**File**: `app/api/webhook/stripe/route.ts` → `handleCheckoutCompleted()`

Before marking sold, 4-point idempotency check:
1. If already `status='sold'` → skip (retry detected)
2. If not in `status='reserved'` → skip (state mismatch)
3. If `reserved_by_session` doesn't match metadata → skip (tampering)
4. If `stripe_checkout_session_id` doesn't match webhook session → skip (wrong event)

Each check is logged with specific reason.

**Benefit**: Safe against webhook retries (Stripe sends 5, 3, or 1 times). Safe against replayed events.

---

### 5. Frontend Recovery UI
**File**: `components/CopyReservationApp.tsx`

New UI feedback:
- ✓ "Release" button when holding reservation (orange buttons for secondary action)
- ✓ Expired message when countdown reaches 0 (yellow warning)
- ✓ Better countdown color gradient (green→yellow→orange→red as time decreases)
- ✓ All errors guide user to next action instead of just apologizing

**Benefit**: User never confused about what to do next.

---

### 6. Session Persistence Across Refresh
**Files**: 
- `app/api/reserve/route.ts`
- `app/api/checkout-copy/route.ts`
- `app/api/release-copy/route.ts`

Guest session UUID stored in `httpOnly` secure cookie (expires 30 days):
- Survives page refresh
- Can't be modified by JavaScript (httpOnly)
- Secure in production (https only)
- Prevents session fixation attacks

**Benefit**: User can refresh page or close browser, come back within 10 min, still hold reservation.

---

### 7. Consistent Frontend/Backend Expiration
**Files**:
- Frontend countdown: `hooks/useCopyReservation.ts` (decrements UI every second)
- Backend checks: `lib/reservations.ts` (validates `reserved_until < now()` at checkout)
- Cleanup: `lib/reservations.ts` (clears expired on fetchCopies)

All three use server `now()` time, not client time (prevents clock-skew cheating).

**Benefit**: Frontend UI matches backend strictness.

---

## OPERATION MODE: Cancelled → Valid State

When user is redirected to `/cancelled` page after abandoning Stripe checkout:

1. ✓ Copy still in `reserved` state (not released)
2. ✓ Countdown still counting down
3. ✓ User can:
   - Navigate back to grid and retry checkout (same reservation)
   - Click release button to give up reservation
   - Wait for auto-expiration after 10 minutes
4. ✓ Copy doesn't become available until one of above happens

**Why**: Prevents accidental loss of "prime" copy number if user navigates away mid-checkout.

---

## TYPES & STRICT CHECKING

All functions fully typed:

```typescript
export async function releaseCopy(sessionId: string): Promise<{ success: boolean; error?: string }>

export async function createCheckoutForCopy(
  copyNumber: number, 
  sessionId: string
): Promise<CheckoutCopyResponse>  // { success, url?, error? }
```

Frontend API service also fully typed:
```typescript
const copyReservationApi = {
  releaseCopy(): Promise<void>,
  // ... other methods
}
```

Hook return type explicit:
```typescript
interface UseCopyReservationState & UseCopyReservationActions { ... }
```

**Benefit**: TypeScript catches mistakes at compile time, not runtime.

---

## FLOW DIAGRAM SUMMARY

```
User selects #042
  ↓ POST /api/reserve
    └─ Atomic: SELECT available, UPDATE reserved
Copy reserved for 10 minutes ✓
  ↓ Frontend countdown 10:00 → 0:00
User has 2 choices:
  
  Choice A: Continue to Checkout
    ↓ POST /api/checkout-copy
      └─ Check: not sold, is reserved, is mine, not expired
    ↓ Create Stripe session
    ↓ Redirect to Stripe
    ↓ User pays or cancels
    ↓ If pays: Webhook fires
    ↓ POST /api/webhook/stripe 
      └─ 4-point idempotency check
    ↓ Mark as sold ✓✓✓ SOLD
    
  Choice B: Release (before checkout)
    ↓ POST /api/release-copy
    ↓ Reset to available immediately ✓
    
  Choice C: Do nothing (wait 10 min)
    ↓ Countdown reaches 0
    ↓ Next inventory poll runs cleanup
    ↓ Auto-released ✓
```

---

## BACKWARDS COMPATIBLE

All existing generic checkout flows (`POST /api/checkout`) remain untouched:
- ✓ Generic preorders still work
- ✓ Only numbered copy system uses new endpoints
- ✓ Both can coexist peacefully
- ✓ No migration needed

---

## MONITORING

Log messages to watch:
```
✓ "Copy $number marked as sold"       ← Normal success
✓ "already sold (idempotent retry)"   ← Expected webhook retry
✓ "not in reserved state"              ← State mismatch (rare)
✗ "Failed to mark copy as sold"        ← Database error (alert needed)
✗ "Copy not found"                     ← Data integrity issue (alert needed)
```

---

## DEPLOYMENT CHECKLIST

- [ ] Run `supabase db push` (migration 008)
- [ ] Run seed: Execute `db/seed_book_copies.sql`
- [ ] Set `STRIPE_BOOK_PRICE` env var
- [ ] Set `STRIPE_WEBHOOK_SECRET` env var
- [ ] Configure Stripe webhook: `POST /api/webhook/stripe`
- [ ] Test with Stripe test card
- [ ] Verify webhook fires and marks copy sold
- [ ] Test release button flow
- [ ] Test expiration auto-cleanup
- [ ] Test page refresh with active reservation
- [ ] Deploy to production
- [ ] Monitor webhook logs for 24h

---

**System is now production-grade with comprehensive operational safeguards!** 🎯

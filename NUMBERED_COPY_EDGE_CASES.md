# Numbered Copy Reservation System - Complete Flow & Edge Case Handling

## REQUEST FLOW: Page Load → Sold State

```
┌─────────────────────────────────────────────────────────────────┐
│  USER VISITS /konyv-valasztas                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ GET /api/inventory              │
         │ fetchCopies():                  │
         │ - Cleanup expired reservations  │
         │ - Return all 100 copies         │
         └─────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ Frontend Grid renders            │
         │ Colors: available/reserved/sold  │
         │ Polls every 5 seconds            │
         └─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  USER CLICKS A NUMBER (e.g., #042)                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ POST /api/reserve               │
         │ reserveCopy(42, sessionId):      │
         │ - Validate 1-100                │
         │ - Check not already reserved    │
         │ - Atomic: SELECT available      │
         │ - Then: UPDATE to reserved      │
         │ - Set reserved_until = now+10m  │
         └─────────────────────────────────┘
                            ↓ SUCCESS
         ┌─────────────────────────────────┐
         │ Frontend:                        │
         │ - Show #042 selected (yellow)    │
         │ - Start countdown 10:00          │
         │ - Enable "Continue to Checkout"  │
         │ - Disable other number clicks    │
         └─────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  OPTION A: USER CLICKS "Continue to Checkout"                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ POST /api/checkout-copy         │
         │ createCheckoutForCopy(42, ...):  │
         │ - Fetch copy by number          │
         │ - Verify status = 'reserved'    │
         │ - Verify session matches        │
         │ - Verify not expired            │
         │ - Verify not already sold       │
         │ - Create Stripe checkout        │
         │ - Store stripe_session_id       │
         └─────────────────────────────────┘
                            ↓ SUCCESS
         ┌─────────────────────────────────┐
         │ Frontend redirects to Stripe    │
         │ User enters payment info        │
         └─────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ User completes or cancels       │
         └─────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ IF COMPLETED:                   │
         │ - Copy still reserved (waiting) │
         │ - Stripe fires webhook          │
         │   (may take seconds)             │
         │                                 │
         │ IF CANCELLED:                   │
         │ - Copy stays reserved 10 min   │
         │ - User returns to grid         │
         │ - Can retry or release          │
         └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STRIPE WEBHOOK: checkout.session.completed                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ POST /api/webhook/stripe        │
         │ handleCheckoutCompleted():       │
         │ - Verify webhook signature      │
         │ - Extract metadata (copy #)     │
         │ - Fetch copy from DB            │
         │ - IDEMPOTENCY CHECKS:           │
         │   * If already sold: skip       │
         │   * If not reserved: skip       │
         │   * If session mismatch: skip   │
         │   * If expires mismatch: skip   │
         │ - Update status = 'sold'        │
         │ - Store order_email             │
         │ - SET stripe session cleared    │
         └─────────────────────────────────┘
                            ↓ SUCCESS
         ┌─────────────────────────────────┐
         │ COPY NOW PERMANENTLY SOLD       │
         │ Next fetchCopies() shows red    │
         │ No guest can ever reserve again │
         └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OPTION B: USER CLICKS "Release" BEFORE CHECKOUT               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ POST /api/release-copy          │
         │ releaseCopy(sessionId):          │
         │ - Find copy reserved by session │
         │ - Reset to available            │
         │ - Clear reserved_until          │
         │ - Clear reserved_by_session     │
         │ - Clear stripe_checkout_session │
         └─────────────────────────────────┘
                            ↓ SUCCESS
         ┌─────────────────────────────────┐
         │ Copy released and available     │
         │ Next poll shows available again │
         │ User can select another         │
         └─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  OPTION C: RESERVATION EXPIRES (>10 minutes, user does nothing) │
└─────────────────────────────────────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ Countdown reaches 0:00 on UI    │
         │ Backend does NOT auto-release   │
         │ Copy still "reserved" in DB     │
         │ But next GET /api/inventory     │
         │ will cleanup:                   │
         │ - Find all reserved with        │
         │   reserved_until < now()        │
         │ - UPDATE status = 'available'   │
         │ - CLEAR reserved_until/session  │
         └─────────────────────────────────┘
                            ↓
         ┌─────────────────────────────────┐
         │ Copy becomes available again    │
         │ User sees "Link expired"        │
         │ message and can reserve other  │
         │ copies or retry same copy       │
         └─────────────────────────────────┘

```

---

## DEFENSIVE HANDLING: All Edge Cases Covered

### Copy Number Validation
```
✓ At reserve time: 1-100 only (otherwise reject)
✓ At checkout time: re-validate 1-100 
✓ At webhook time: re-validate 1-100
```

### Expired Reservation Handling
```
✓ Frontend: Shows "Reservation expired" message when countdown = 0
✓ Backend: Cleans up on every fetchCopies() call
✓ At checkout time: Explicit check - reject if reserved_until < now()
✓ At webhook time: Warn if expired but still mark as sold (payment succeeded)
```

### Sold Copy Manipulation (Client Hack Attempt)
```
✓ At checkout: Check if already sold before creating session
✓ At webhook: Idempotency check skips if already sold
✓ Never allow status: sold → available transition
✓ Safe against direct URL manipulation or replayed events
```

### Duplicate Reserve Attempts (Same Session)
```
✓ Cannot hold >1 reservation per session (checked at reserve time)
✓ COUNT check: SELECT WHERE reserved_by_session = X AND status = 'reserved'
✓ If count > 0, reject with "already have a reserved copy" error
```

### Concurrent Reservation (Race Condition Victory)
```
✓ Atomic: SELECT WHERE status='available' 
✓ Then: UPDATE WHERE id=X AND status='available' (status check prevents race)
✓ If concurrent access: Only ONE succeeds (other gets "not available" error)
✓ Both users safely notified
```

### Stale Reservation Forever Blocking
```
✓ 10-minute TTL enforced in DB (reserved_until timestamp)
✓ Read-time cleanup in fetchCopies() always releases expired
✓ Explicit expiration check at checkout time prevents edge case
```

### Webhook Retries (Stripe Safety)
```
✓ Check 1: If already sold → skip (idempotent)
✓ Check 2: If not reserved → skip (state mismatch)
✓ Check 3: If session mismatch → skip (tampering attempt)
✓ Check 4: If Stripe session mismatch → skip (wrong event)
✓ Multiple webhook calls: First succeeds, rest skip
✓ Safe if Stripe retries 1, 3, or 10 times
```

### Cancelled Checkout (User Ambiguity)
```
✓ User cancelled payment → copy STAYS reserved 10 minutes
✓ Returned to grid with countdown still active
✓ Options:
  - Retry checkout (same copy, same reservation)
  - Release copy (POST /api/release-copy)
  - Wait for expiration (10 min total from first reserve)
✓ If user does nothing, auto-released after 10 min on next fetchCopies()
```

---

## FRONTEND BEHAVIOR: Countdown & Recovery

### Countdown States
```
10:00 - 05:01  Green text     "plenty of time"
05:00 - 01:00  Yellow text    "hurry up"
00:59 - 00:01  Orange text    "very urgent"
00:00          Red, disabled  "expired - select another"
```

### Polling (Every 5 seconds)
```
✓ Fetch fresh inventory from GET /api/inventory
✓ Backend auto-cleans expired reservations
✓ If copy you reserved expired → shown as "available" to others
✓ Frontend detects mismatch, shows "expired" message
✓ User can immediately select another copy
```

### User Session Persistence
```
✓ Guest session ID stored in httpOnly secure cookie
✓ Cookie lasts 30 days (much longer than 10-min reservation)
✓ Page refresh → same session ID retrieved
✓ Session restored: countdown continues, can still checkout
✓ Cookie secure: Can't be modified by JavaScript
```

---

## ERROR MESSAGES: User-Friendly Edge Case Handling

| Scenario | Error Message | Action |
|----------|---------------|--------|
| Copy already sold | "This copy has already been sold. Please select another copy." | Allow new selection |
| Copy expired | "Your reservation has expired. Please select and reserve a copy again." | Refresh inventory, allow new selection |
| Copy by someone else | "This copy is reserved by another user. Please select a different copy." | Show new grid state |
| Duplicate reservation | "You already have a reserved copy..." | Refuse new reservation |
| Checkout session exists | "A checkout session for this copy already exists..." | Suggest going to that checkout |
| Invalid copy number | "Invalid copy number. Must be between 1 and 100." | Prevent form submission |
| API failure | "Failed to [action]. Please try again." | Show retry button |

---

## DATABASE STATE TRANSITIONS

```
AVAILABLE
  ↓ [reserveCopy succeeds]
RESERVED (with reserved_until=+10min, reserved_by_session=uuid)
  ↓ [checkout created]
RESERVED (+ stripe_checkout_session_id=sid)
  ↓ [payment success webhook]
SOLD (+ order_email)

OR

AVAILABLE
  ↓ [reserveCopy succeeds]
RESERVED
  ↓ [user clicks release OR 10 min expires]
AVAILABLE (cleanup on fetchCopies)

OR

AVAILABLE
  ↓ [reserveCopy succeeds]
RESERVED
  ↓ [concurrent attack by another user]
← STAYS AVAILABLE (atomic update prevents)
```

**One-way transition: SOLD → never changes**

---

## TESTING CHECKLIST

### Happy Path
- [ ] Reserve copy → shows countdown
- [ ] Countdown decrements every second
- [ ] Click checkout → Stripe loads
- [ ] Complete payment on Stripe Test Card
- [ ] Webhook fires, copy becomes sold
- [ ] Refresh → copy shows as red/sold

### Edge Cases
- [ ] Reserve, click release → copy becomes available immediately
- [ ] Reserve → wait 10+ minutes → copy auto-releases on next poll
- [ ] Reserve → cancel checkout → can retry checkpoint
- [ ] Reserve → go to cancelled page → shows "reservation still active"
- [ ] Try to reserve already-sold copy → error message
- [ ] Try to reserve same copy twice (different sessions) → one succeeds, one fails
- [ ] Reserve, page refresh → countdown continues, can still checkout
- [ ] Webhook fires 3 times (test Stripe CLI) → idempotent, only 1 update
- [ ] Try checkout with expired reservation → error "reservation expired"

### Concurrent Load
- [ ] 2 browser windows, reserve same copy → 1 succeeds, 1 fails atomically
- [ ] 10 rapid reserve clicks → only 1 copy reserved per session
- [ ] Heavy polling (100ms not 5s) → cleanup still works correctly

---

## PRODUCTION MONITORING

Monitor these logs/metrics:
- Webhook failures (check Stripe Dashboard)
- "Copy already processed" logs (webhook retries, normal)
- "Copy not found" errors (shouldn't happen)
- Session/Stripe mismatch errors (tampering attempts?)
- Cleanup failures (database performance issue?)

---

## SUMMARY: Why This Is Safe

1. **Atomic reservations** prevent overbooking
2. **Idempotent webhooks** prevent duplicate charges/sales
3. **Time-based cleanup** prevents eternal blocking
4. **Multiple validation layers** prevent tampering
5. **Clear error messages** guide users to resolution
6. **Session persistence** survives page refresh
7. **Read-time cleanup** no cron job needed
8. **Defensive code** handles all edge cases gracefully

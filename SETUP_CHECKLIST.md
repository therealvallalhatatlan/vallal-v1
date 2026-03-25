# Numbered Copy System - Setup Checklist

## Pre-Deployment Steps

### 1. Database Migration
- [ ] Run `supabase db push` to create `book_copies` table
- [ ] Verify migration applied in Supabase Dashboard
- [ ] Seed data: Execute `db/seed_book_copies.sql` or run via Supabase SQL editor
- [ ] Verify: `SELECT COUNT(*) FROM book_copies` should return 100

### 2. Environment Variables
Add to `.env.local` (or production `.env`):
```env
STRIPE_BOOK_PRICE=1000000
STRIPE_WEBHOOK_SECRET=whsec_...
```
- [ ] Get `STRIPE_WEBHOOK_SECRET` from Stripe Dashboard → Webhooks
- [ ] Verify `STRIPE_SECRET_KEY` already exists
- [ ] Verify `NEXT_PUBLIC_SITE_URL` points to production domain

### 3. Stripe Webhook Configuration
- [ ] Go to Stripe Dashboard → Developers → Webhooks
- [ ] Add endpoint: `https://vallalhatatlan.online/api/webhook/stripe`
- [ ] Listen for: `checkout.session.completed`
- [ ] Copy signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test with `stripe` CLI: `stripe trigger checkout.session.completed`

### 4. Backend Testing (Local)
- [ ] Start dev server: `npm run dev`
- [ ] Test GET `/api/inventory` → returns 100 copies
- [ ] Test POST `/api/reserve` with valid copy_number → success
- [ ] Test POST `/api/reserve` with same copy twice → failure on second
- [ ] Test POST `/api/checkout-copy` → returns Stripe URL
- [ ] Verify database updates after each operation

### 5. Frontend Testing (Local)
- [ ] Navigate to `http://localhost:3000/konyv-valasztas`
- [ ] Grid loads with 100 tiles
- [ ] Click tile → becomes selected, countdown starts
- [ ] Refresh page → selection persists
- [ ] Click "Continue to Checkout" → Stripe checkout opens
- [ ] Grid updates when other copies are reserved (polling)

### 6. Stripe Sandbox Test (Local)
- [ ] Open Stripe checkout from `/konyv-valasztas`
- [ ] Use test card: `4242 4242 4242 4242`, future expiry, any CVC
- [ ] Complete payment
- [ ] Check database: copy should now be `status: 'sold'`, `order_email: set`
- [ ] Verify webhook was received (Stripe Dashboard → Webhooks → Events)

### 7. Integration with Existing Checkout
- [ ] If you have a homepage or existing checkout flow, add link to `/konyv-valasztas`
- [ ] Update `/success` page to handle numbered copy checkouts (optional)
- [ ] Ensure existing generic checkout still works (separate from numbered system)

### 8. Production Deployment
- [ ] Merge branch to main
- [ ] Deploy to production (Vercel/Railway/etc)
- [ ] Verify `.env` vars are set in production dashboard
- [ ] Run health check: `curl https://vallalhatatlan.online/api/inventory`
- [ ] Verify webhook is reaching production endpoint

### 9. Monitoring & Alerts
Optional but recommended:
- [ ] Set up error logging (Sentry/LogRocket)
- [ ] Monitor Stripe webhook failures (Dashboard → Webhooks → Events)
- [ ] Create database backup schedule
- [ ] Set up alert if `book_copies` table grows beyond 100 rows

## Rollback Plan

If something goes wrong:

1. **Keep generic checkout working**: Don't modify existing `/api/checkout`
2. **Disable numbered copy page**: Remove link or return 404 from `/konyv-valasztas`
3. **Reset inventory**: Run SQL:
   ```sql
   UPDATE book_copies SET 
     status = 'available',
     reserved_until = NULL,
     reserved_by_session = NULL,
     stripe_checkout_session_id = NULL
   WHERE status != 'sold';
   ```
4. **Retry webhook**: Manually in Stripe Dashboard if needed

## File Checklist (Created Files)

Backend:
- [ ] `db/migrations/008_create_book_copies.sql`
- [ ] `db/seed_book_copies.sql`
- [ ] `lib/reservations.ts` (updated)
- [ ] `lib/stripe.ts` (updated)
- [ ] `lib/copyReservationApi.ts`
- [ ] `lib/copyFormatting.ts`
- [ ] `app/api/inventory/route.ts`
- [ ] `app/api/reserve/route.ts`
- [ ] `app/api/checkout-copy/route.ts`
- [ ] `app/api/webhook/stripe/route.ts`
- [ ] `types/reservations.ts` (updated)

Frontend:
- [ ] `components/CopyCard.tsx`
- [ ] `components/CopyGrid.tsx`
- [ ] `components/CopyReservationApp.tsx`
- [ ] `app/konyv-valasztas/page.tsx`
- [ ] `hooks/useCopyReservation.ts`

Documentation:
- [ ] `NUMBERED_COPY_SYSTEM.md`
- [ ] `SETUP_CHECKLIST.md` (this file)

## Support URLs

- **Local dev**: http://localhost:3000/konyv-valasztas
- **Production**: https://vallalhatatlan.online/konyv-valasztas
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Supabase Dashboard**: https://app.supabase.com

---

Ready to deploy! Contact support if you hit any issues. 🚀
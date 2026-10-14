# Book registry rollout and operations

This feature is additive. It does not reuse or rewrite the legacy book_copies reservation table.

## What is included

- db/migrations/054_book_registry.sql: editions, copy register, hashed one-time entitlements, ownership audit events and transfer tokens, row-level security, atomic RPCs, and reserved historical serial ranges.
- /konyv-1-qr: shared entry page for a printed QR code, sign-in, claiming, location consent and ownership transfer.
- /api/book-registry/claim, /mine, /location, /transfer, /map: narrow endpoints; public map responses contain only public ID, edition/serial label and a coarse opt-in point.
- /api/admin/book-registry/entitlements: admin-only one-time claim-token issuance.
- A toggleable book layer on the existing /halozat Mapbox map.
- Paid-checkout integration for unambiguous metadata. The webhook uses the unique purchase source reference for idempotency and emails each token once.

## Before deploying

1. Review and apply db/migrations/054_book_registry.sql to the correct Supabase project through the project's normal migration procedure. This branch does not apply database migrations.
2. Confirm SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS, RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_MAPBOX_TOKEN in the deployment environment.
3. Configure Stripe Checkout Session metadata for new book purchases:
   - Volume I: book_registry_edition=book_1
   - Volume II: book_registry_edition=book_2
   The webhook also recognizes unambiguous legacy metadata values book_ii, book_2, book-2 and book-ii for Volume II.
4. Do not auto-map legacy numbered_copy purchases to printed serials until the physical book serials and historic ownership records have been reconciled. This is deliberate because the old sales table does not currently prove every historical owner/serial pair.
5. Run pnpm test:book-registry and pnpm build, then exercise the acceptance checklist below in a staging deployment before merging.

## Issue a verified historical claim code

After verifying a past buyer using the project's approved records, an administrator can call:

POST /api/admin/book-registry/entitlements
Authorization: Bearer <admin-access-token>
Content-Type: application/json

For example, to issue a Volume I historic entitlement for register serial 17:

{
  "editionCode": "book_1",
  "sourceType": "historical",
  "historicalSerial": 17,
  "sourceReference": "verified-history-case-123"
}

Volume II historical serials are 1–80; Volume I historical serials are 1–100. The endpoint returns the raw token and claim URL exactly once. Send the claim URL only to the verified owner over an appropriate channel. Do not put raw tokens into tickets, logs, public chat, or analytics.

To issue a future-purchase or distributor entitlement manually, use sourceType purchase or distributor and a non-sensitive sourceReference. For normal paid checkouts, the webhook should issue the entitlement automatically only when the edition can be identified unambiguously.

## Acceptance checklist

- A missing/invalid bearer token cannot claim, set a location, transfer, or view private copies.
- An invalid, expired, revoked or already-redeemed claim token cannot be redeemed.
- Each historical slot can be issued only once; legacy ranges remain reserved before claim.
- Concurrent new-copy claims do not receive duplicate edition serials.
- New serials begin at I-101 and II-081, because the seeded historical ranges are reserved.
- Raw claim/transfer tokens are never stored in the database; only SHA-256 digests are stored.
- The public map only shows opted-in, registered copies; public responses contain no account IDs, email addresses, order references or exact coordinates.
- A user cannot change a serial, edition or public ID, or update another user's location.
- The transfer link is single-use and expires after seven days. The previous location is cleared on acceptance.
- New book purchase webhook retries do not mint duplicate entitlements for the same Stripe session/unit.
- A READ_ONLY system mode blocks write requests for non-admin users.
- Existing book_copies reservations, checkout and webhook behavior remain unchanged.

## Operational note

If a registry-email send fails after an entitlement has been committed, the webhook logs an error but does not store the raw code for later recovery. An administrator should verify the order, revoke the unused entitlement through the approved database operations process, and issue a replacement token with a new source reference. Never query or expose raw customer data in a public support channel.

-- Vállalhatatlan user identity audit
-- READ ONLY. Run in Supabase SQL Editor.
-- Goal: identify canonical users, legacy profiles, orphaned orders,
-- email mismatches and book ownership that still depends on email.

-- 1) CANONICAL ACCOUNT MAP
SELECT
  au.id AS user_id,
  au.email AS auth_email,
  pu.email AS profile_email,
  pu.nickname,
  au.created_at AS auth_created_at,
  au.last_sign_in_at,
  COUNT(DISTINCT o.id) AS order_count,
  COALESCE(SUM(
    CASE
      WHEN o.status IN ('paid', 'fulfilled', 'ready_to_dispatch', 'dispatched')
      THEN o.amount / 100.0
      ELSE 0
    END
  ), 0) AS orders_spent_huf,
  COUNT(DISTINCT so.id) AS shop_order_count,
  COALESCE(SUM(
    CASE WHEN so.status = 'paid'
    THEN so.subtotal_amount / 100.0
    ELSE 0
    END
  ), 0) AS shop_spent_huf
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
LEFT JOIN public.orders o ON o.user_id = au.id
LEFT JOIN public.shop_orders so ON so.user_id = au.id
GROUP BY
  au.id, au.email, pu.email, pu.nickname,
  au.created_at, au.last_sign_in_at
ORDER BY (orders_spent_huf + shop_spent_huf) DESC, au.created_at;


-- 2) PROFILE ROWS WITHOUT A LIVE AUTH ACCOUNT
SELECT
  pu.id AS profile_user_id,
  pu.email AS profile_email,
  pu.nickname,
  pu.created_at
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL
ORDER BY pu.created_at;


-- 3) ORDERS WITH A USER ID THAT NO LONGER EXISTS IN AUTH
SELECT
  o.id AS order_id,
  o.user_id,
  o.customer_email,
  o.product_id,
  o.amount / 100.0 AS amount_huf,
  o.status,
  o.created_at,
  o.stripe_session_id,
  o.metadata
FROM public.orders o
LEFT JOIN auth.users au ON au.id = o.user_id
WHERE o.user_id IS NOT NULL
  AND au.id IS NULL
ORDER BY o.created_at DESC;


-- 4) ORDERS WITH EMAIL BUT NO CANONICAL USER ID
SELECT
  o.id AS order_id,
  o.customer_email,
  o.product_id,
  o.amount / 100.0 AS amount_huf,
  o.status,
  o.created_at,
  au.id AS candidate_user_id,
  au.email AS candidate_auth_email
FROM public.orders o
LEFT JOIN auth.users au
  ON lower(au.email) = lower(o.customer_email)
WHERE o.customer_email IS NOT NULL
  AND o.user_id IS NULL
ORDER BY o.created_at DESC;


-- 5) BOOK COPIES: EMAIL OWNERSHIP VS CURRENT AUTH USERS
SELECT
  bc.id AS copy_id,
  bc.copy_number,
  bc.status,
  bc.order_email,
  bc.stripe_checkout_session_id,
  au.id AS candidate_user_id,
  au.email AS candidate_auth_email
FROM public.book_copies bc
LEFT JOIN auth.users au
  ON lower(au.email) = lower(bc.order_email)
WHERE bc.order_email IS NOT NULL
ORDER BY bc.copy_number;


-- 6) BOOK COPIES ALREADY ATTACHED BY CANONICAL USER / ORDER
SELECT
  bc.id AS copy_id,
  bc.copy_number,
  bc.status,
  bc.user_id,
  au.email AS auth_email,
  bc.order_id,
  bc.order_email,
  bc.stripe_checkout_session_id
FROM public.book_copies bc
LEFT JOIN auth.users au ON au.id = bc.user_id
WHERE bc.user_id IS NOT NULL
   OR bc.order_id IS NOT NULL
ORDER BY bc.copy_number;


-- 7) LEGACY / AMBIGUOUS ORDERS
SELECT
  o.id AS order_id,
  o.user_id,
  o.customer_email,
  o.product_id,
  o.amount / 100.0 AS amount_huf,
  o.status,
  o.created_at,
  o.stripe_session_id,
  o.metadata
FROM public.orders o
WHERE o.product_id = 'unknown'
   OR o.user_id IS NULL
   OR o.customer_email IS NULL
ORDER BY o.created_at DESC;


-- 8) SPENDING BY CANONICAL USER
WITH book_spend AS (
  SELECT
    user_id,
    COALESCE(SUM(
      CASE
        WHEN status IN ('paid', 'fulfilled', 'ready_to_dispatch', 'dispatched')
        THEN amount / 100.0
        ELSE 0
      END
    ), 0) AS huf
  FROM public.orders
  WHERE user_id IS NOT NULL
  GROUP BY user_id
),
shop_spend AS (
  SELECT
    user_id,
    COALESCE(SUM(
      CASE WHEN status = 'paid'
      THEN subtotal_amount / 100.0
      ELSE 0
      END
    ), 0) AS huf
  FROM public.shop_orders
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
SELECT
  au.id AS user_id,
  au.email,
  ROUND(COALESCE(book_spend.huf, 0) + COALESCE(shop_spend.huf, 0), 2) AS total_spent_huf,
  ROUND(COALESCE(book_spend.huf, 0), 2) AS book_spent_huf,
  ROUND(COALESCE(shop_spend.huf, 0), 2) AS shop_spent_huf
FROM auth.users au
LEFT JOIN book_spend ON book_spend.user_id = au.id
LEFT JOIN shop_spend ON shop_spend.user_id = au.id
WHERE COALESCE(book_spend.huf, 0) + COALESCE(shop_spend.huf, 0) > 0
ORDER BY total_spent_huf DESC;


-- 9) EXISTING IDENTITY ALIASES
SELECT
  user_id,
  identity_type,
  identity_value,
  normalized_value,
  source,
  confidence,
  note,
  created_at
FROM public.user_identity_aliases
ORDER BY user_id, identity_type, normalized_value;

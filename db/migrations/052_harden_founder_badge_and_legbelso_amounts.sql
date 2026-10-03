-- Founder badge integrity and Leg Belső Kör payment floor.
--
-- Amounts in public.orders are stored in Stripe minor units (fillér).
-- A valid Leg Belső Kör payment is therefore at least 1,500,000.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_legbelso_paid_integrity_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_legbelso_paid_integrity_check
  CHECK (
    product_id <> 'legbelso-kor'
    OR status <> 'paid'
    OR (
      currency = 'huf'
      AND amount >= 1500000
      AND COALESCE(metadata->>'payment_mismatch', 'false') <> 'true'
    )
  );

CREATE OR REPLACE FUNCTION public.sync_legbelso_kor_founder_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_badge_id uuid;
  v_new_valid boolean;
  v_old_valid boolean;
begin
  select b.id into v_badge_id
  from public.badges b
  where b.code = 'founder'
  limit 1;

  if v_badge_id is null then
    return new;
  end if;

  v_new_valid :=
    new.product_id = 'legbelso-kor'
    and new.status = 'paid'
    and new.user_id is not null
    and new.currency = 'huf'
    and new.amount >= 1500000
    and coalesce(new.metadata->>'payment_mismatch', 'false') <> 'true';

  if v_new_valid then
    insert into public.user_badge_overrides (
      user_id, badge_id, reason, source, created_by
    )
    select
      new.user_id,
      v_badge_id,
      'Leg Belső Kör Alapítói Részvétel',
      'order:' || new.id::text,
      null
    where not exists (
      select 1
      from public.user_badge_overrides o
      where o.user_id = new.user_id
        and o.badge_id = v_badge_id
        and o.source = 'order:' || new.id::text
    );
  elsif tg_op = 'UPDATE' then
    v_old_valid :=
      old.product_id = 'legbelso-kor'
      and old.status = 'paid'
      and old.user_id is not null
      and old.currency = 'huf'
      and old.amount >= 1500000
      and coalesce(old.metadata->>'payment_mismatch', 'false') <> 'true';

    if v_old_valid then
      delete from public.user_badge_overrides o
      where o.user_id = old.user_id
        and o.badge_id = v_badge_id
        and o.source = 'order:' || old.id::text;
    end if;
  end if;

  return new;
end;
$function$;

delete from public.user_badge_overrides o
where o.source like 'order:%'
  and exists (
    select 1
    from public.orders ord
    where ('order:' || ord.id::text) = o.source
      and ord.product_id = 'legbelso-kor'
      and not (
        ord.status = 'paid'
        and ord.user_id is not null
        and ord.currency = 'huf'
        and ord.amount >= 1500000
        and coalesce(ord.metadata->>'payment_mismatch', 'false') <> 'true'
      )
  );

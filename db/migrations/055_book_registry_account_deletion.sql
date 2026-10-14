-- Privacy safeguard for the book register.
-- If a user account is deleted, retire its registered copies and erase map data.
-- Kept separate because 054_book_registry.sql has already been run manually in production.

CREATE OR REPLACE FUNCTION public.retire_book_registry_copies_on_user_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH retired AS (
    UPDATE public.book_registry_copies
    SET owner_user_id = NULL,
        status = 'retired',
        map_visible = FALSE,
        location_lat = NULL,
        location_lng = NULL,
        updated_at = now()
    WHERE owner_user_id = OLD.id
    RETURNING id
  )
  INSERT INTO public.book_copy_ownership_events (
    copy_id, event_type, actor_user_id, previous_owner_user_id, metadata
  )
  SELECT id, 'retired', OLD.id, OLD.id,
         jsonb_build_object('reason', 'owner_account_deleted')
  FROM retired;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_book_registry_copies_on_user_delete()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_book_registry_copies_on_user_delete()
  TO service_role;

DROP TRIGGER IF EXISTS trg_retire_book_registry_copies_on_user_delete ON auth.users;
CREATE TRIGGER trg_retire_book_registry_copies_on_user_delete
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.retire_book_registry_copies_on_user_delete();

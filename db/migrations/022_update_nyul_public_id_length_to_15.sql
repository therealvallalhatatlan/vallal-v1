-- Align nyul public_id DB constraint with frontend validation (4-15).

alter table nyul_identities
  drop constraint if exists nyul_public_id_length;

alter table nyul_identities
  add constraint nyul_public_id_length check (char_length(public_id) between 4 and 15);

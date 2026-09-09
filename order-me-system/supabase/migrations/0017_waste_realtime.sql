-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Waste Data
-- Migration: 0017_waste_realtime.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- WASTE REALTIME BROADCAST
-- =========================================================
--
-- SECURITY MODEL
--
-- waste_entries remains browser-denied.
--
-- This trigger does NOT broadcast Waste row data.
--
-- It sends only:
--
-- {
--   "scope": "waste",
--   "location_code": "FOR"
-- }
--
-- or:
--
-- {
--   "scope": "waste",
--   "location_code": "FUS"
-- }
--
-- The frontend uses this only as an invalidation signal.
--
-- Actual Waste data is reloaded through the trusted
-- server-side signed operational session.
--
-- =========================================================

create or replace function public.broadcast_waste_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_location_id uuid;
  target_location_code text;
begin

  -- =======================================================
  -- DETERMINE LOCATION
  -- =======================================================

  if tg_op = 'DELETE' then
    target_location_id := old.location_id;
  else
    target_location_id := new.location_id;
  end if;

  -- =======================================================
  -- RESOLVE LOCATION CODE
  -- =======================================================

  select
    l.code
  into
    target_location_code
  from public.locations l
  where l.id = target_location_id;

  -- =======================================================
  -- SAFETY
  -- =======================================================

  if target_location_code is null then
    return null;
  end if;

  -- =======================================================
  -- BROADCAST LIGHTWEIGHT INVALIDATION SIGNAL
  -- =======================================================
  --
  -- false = public Realtime Broadcast channel.
  --
  -- No Waste row values are included.
  --
  -- Topic examples:
  --
  -- order-me:waste:FOR
  -- order-me:waste:FUS
  --
  -- =======================================================

  perform realtime.send(
    jsonb_build_object(
      'scope',
      'waste',

      'location_code',
      target_location_code
    ),

    'changed',

    'order-me:waste:' ||
      target_location_code,

    false
  );

  return null;
end;
$$;

-- =========================================================
-- TRIGGER
-- =========================================================

drop trigger if exists
broadcast_waste_change
on public.waste_entries;

create trigger
broadcast_waste_change
after insert or update or delete
on public.waste_entries
for each row
execute function public.broadcast_waste_change();

commit;
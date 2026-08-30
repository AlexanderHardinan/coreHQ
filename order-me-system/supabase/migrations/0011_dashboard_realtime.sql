-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Dashboard Realtime Synchronization
-- Migration: 0011_dashboard_realtime.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================
--
-- PURPOSE
--
-- Emit one lightweight realtime invalidation signal whenever
-- Dashboard source data changes.
--
-- Dashboard source tables:
--
--   products
--   production_recipes
--   normal_orders
--   production_orders
--
-- IMPORTANT SECURITY DESIGN
--
-- No operational database row is broadcast.
--
-- No product name is broadcast.
-- No recipe information is broadcast.
-- No order information is broadcast.
-- No quantity is broadcast.
-- No database location UUID is broadcast.
--
-- The client receives only:
--
--   event:
--     dashboard_changed
--
--   payload:
--     {}
--
-- The browser then reloads the actual Dashboard values using
-- the trusted server-side Dashboard action.
--
-- Topic format:
--
--   order-me-dashboard:FOR
--   order-me-dashboard:FUS
--
-- =========================================================

begin;

-- =========================================================
-- DASHBOARD CHANGE BROADCAST FUNCTION
-- =========================================================

create or replace function public.broadcast_dashboard_change()
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
  -- RESOLVE LOCATION
  -- =======================================================
  --
  -- INSERT / UPDATE:
  --   use NEW.location_id
  --
  -- DELETE:
  --   use OLD.location_id
  --
  -- =======================================================

  if tg_op = 'DELETE' then
    target_location_id :=
      old.location_id;
  else
    target_location_id :=
      new.location_id;
  end if;

  -- =======================================================
  -- RESOLVE PUBLIC LOCATION CODE
  -- =======================================================
  --
  -- The realtime topic uses the location code rather than
  -- exposing the internal location UUID.
  --
  -- Example:
  --
  --   FOR
  --   FUS
  --
  -- =======================================================

  select
    upper(trim(location.code))
  into
    target_location_code
  from public.locations as location
  where location.id =
    target_location_id;

  -- =======================================================
  -- SAFETY
  -- =======================================================

  if
    target_location_code is null
    or target_location_code = ''
  then
    return null;
  end if;

  -- =======================================================
  -- REALTIME INVALIDATION
  -- =======================================================
  --
  -- Payload intentionally contains no operational data.
  --
  -- Event:
  --   dashboard_changed
  --
  -- Topic:
  --   order-me-dashboard:<LOCATION_CODE>
  --
  -- Fourth realtime.send() argument:
  --
  --   false = public Broadcast
  --
  -- This matches:
  --
  --   private: false
  --
  -- in dashboard-realtime.tsx.
  --
  -- =======================================================

  perform realtime.send(
    '{}'::jsonb,
    'dashboard_changed',
    'order-me-dashboard:' ||
      target_location_code,
    false
  );

  -- =======================================================
  -- AFTER TRIGGER
  -- =======================================================
  --
  -- Return value is ignored for AFTER row triggers.
  --
  -- =======================================================

  return null;
end;
$$;

-- =========================================================
-- PRODUCTS
-- =========================================================

drop trigger if exists
  broadcast_products_dashboard_change
on public.products;

create trigger
  broadcast_products_dashboard_change
after insert or update or delete
on public.products
for each row
execute function
  public.broadcast_dashboard_change();

-- =========================================================
-- PRODUCTION RECIPES
-- =========================================================

drop trigger if exists
  broadcast_production_recipes_dashboard_change
on public.production_recipes;

create trigger
  broadcast_production_recipes_dashboard_change
after insert or update or delete
on public.production_recipes
for each row
execute function
  public.broadcast_dashboard_change();

-- =========================================================
-- NORMAL ORDERS
-- =========================================================

drop trigger if exists
  broadcast_normal_orders_dashboard_change
on public.normal_orders;

create trigger
  broadcast_normal_orders_dashboard_change
after insert or update or delete
on public.normal_orders
for each row
execute function
  public.broadcast_dashboard_change();

-- =========================================================
-- PRODUCTION ORDERS
-- =========================================================

drop trigger if exists
  broadcast_production_orders_dashboard_change
on public.production_orders;

create trigger
  broadcast_production_orders_dashboard_change
after insert or update or delete
on public.production_orders
for each row
execute function
  public.broadcast_dashboard_change();

commit;
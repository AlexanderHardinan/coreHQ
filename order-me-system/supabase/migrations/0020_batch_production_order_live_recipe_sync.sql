-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 8 Refinement — Batch Production Order Live Recipe Sync
-- Migration: 0020_batch_production_order_live_recipe_sync.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================
--
-- PURPOSE
--
-- Existing Batch Production Orders previously preserved:
--
--   Production Recipe snapshots
--   Ingredient snapshots
--   Base ingredient quantities
--
-- even when the master Production Recipe was later edited.
--
-- New behavior:
--
-- When an existing Batch Production Order is edited/saved,
-- every already-selected Production Recipe is refreshed from
-- the CURRENT Production Recipe master before PostgreSQL
-- recalculates the Production Order.
--
-- This migration does NOT globally rewrite historical orders.
--
-- Existing orders refresh only when their selected recipe rows
-- are updated as part of the normal Production Order save flow.
--
-- =========================================================

begin;

-- =========================================================
-- PROTECT PRODUCTION ORDER RECIPE IDENTITY
-- =========================================================
--
-- Preserve immutable relationship fields:
--
--   location_id
--   order_id
--   recipe_id
--
-- Recipe snapshot fields may change only when their new values
-- exactly match the CURRENT Production Recipe master.
--
-- This allows trusted database synchronization while still
-- preventing fabricated/manual snapshot values.
-- =========================================================

create or replace function public.protect_production_order_recipe_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  master_name text;
  master_batch_qty numeric;
  master_yield_qty numeric;
  master_yield_uom text;
begin

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  if new.location_id
       is distinct from
       old.location_id then

    raise exception
      'Production order recipe location cannot be changed.';

  end if;

  -- -------------------------------------------------------
  -- ORDER
  -- -------------------------------------------------------

  if new.order_id
       is distinct from
       old.order_id then

    raise exception
      'Production order recipe cannot be moved to another order.';

  end if;

  -- -------------------------------------------------------
  -- RECIPE
  -- -------------------------------------------------------

  if new.recipe_id
       is distinct from
       old.recipe_id then

    raise exception
      'Selected recipe cannot be replaced directly. Remove it and add the new recipe instead.';

  end if;

  -- -------------------------------------------------------
  -- SNAPSHOT CHANGE VALIDATION
  -- -------------------------------------------------------
  --
  -- Snapshot changes are allowed only when the values match
  -- the current Production Recipe master exactly.
  -- -------------------------------------------------------

  if new.recipe_name_snapshot
       is distinct from
       old.recipe_name_snapshot

     or new.batch_qty_snapshot
       is distinct from
       old.batch_qty_snapshot

     or new.base_yield_qty_snapshot
       is distinct from
       old.base_yield_qty_snapshot

     or new.yield_uom_snapshot
       is distinct from
       old.yield_uom_snapshot then

    select
      r.name,
      r.batch_qty,
      r.yield_qty,
      r.yield_uom

    into
      master_name,
      master_batch_qty,
      master_yield_qty,
      master_yield_uom

    from public.production_recipes r

    where r.id =
      new.recipe_id

      and r.location_id =
        new.location_id;

    if not found then
      raise exception
        'Selected production recipe does not exist in this location.';
    end if;

    if new.recipe_name_snapshot
         is distinct from
         master_name

       or new.batch_qty_snapshot
         is distinct from
         master_batch_qty

       or new.base_yield_qty_snapshot
         is distinct from
         master_yield_qty

       or new.yield_uom_snapshot
         is distinct from
         master_yield_uom then

      raise exception
        'Production recipe snapshot fields must match the current Production Recipe master.';

    end if;

  end if;

  return new;

end;
$$;

-- =========================================================
-- SYNCHRONIZE SELECTED RECIPE FROM MASTER
-- =========================================================
--
-- Every UPDATE of an existing production_order_recipes row
-- refreshes:
--
--   Recipe Name
--   Batch Qty
--   Base Yield Qty
--   Yield UOM
--
-- Required Yield remains controlled by the Production Order.
--
-- Inactive master recipes are deliberately allowed here for
-- an already-existing Production Order selection.
--
-- The existing save_production_order() function separately
-- prevents a NEW inactive recipe from being added.
-- =========================================================

create or replace function public.sync_production_order_recipe_master()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  master_name text;
  master_batch_qty numeric;
  master_yield_qty numeric;
  master_yield_uom text;
begin

  select
    r.name,
    r.batch_qty,
    r.yield_qty,
    r.yield_uom

  into
    master_name,
    master_batch_qty,
    master_yield_qty,
    master_yield_uom

  from public.production_recipes r

  where r.id =
    new.recipe_id

    and r.location_id =
      new.location_id;

  if not found then
    raise exception
      'Selected production recipe does not exist in this location.';
  end if;

  new.recipe_name_snapshot :=
    master_name;

  new.batch_qty_snapshot :=
    master_batch_qty;

  new.base_yield_qty_snapshot :=
    master_yield_qty;

  new.yield_uom_snapshot :=
    master_yield_uom;

  return new;

end;
$$;

drop trigger if exists
sync_production_order_recipe_master
on public.production_order_recipes;

create trigger
sync_production_order_recipe_master
before update
on public.production_order_recipes
for each row
execute function
public.sync_production_order_recipe_master();

-- =========================================================
-- CONSOLIDATED PRODUCTION ORDER ITEMS
-- =========================================================
--
-- Preserve existing On Hand Qty.
--
-- Refresh:
--
--   SKU
--   Product Name
--   Category Name
--   UOM
--   Required Qty
--
-- requested_qty remains a PostgreSQL generated column:
--
--   MAX(required_qty - on_hand_qty, 0)
--
-- Existing matching Product rows keep their on_hand_qty.
--
-- New Product:
--   inserted with default on_hand_qty = 0
--   until save_production_order() writes the supplied value.
--
-- Removed Product:
--   deleted from the consolidated order requirement.
-- =========================================================

create or replace function public.refresh_production_order_items(
  target_order_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  -- -------------------------------------------------------
  -- INSERT NEW / UPDATE EXISTING CONSOLIDATED ITEMS
  -- -------------------------------------------------------

  insert into public.production_order_items (
    location_id,
    order_id,
    product_id,
    sku_snapshot,
    product_name_snapshot,
    category_name_snapshot,
    uom,
    required_qty
  )

  select
    min(
      pri.location_id::text
    )::uuid,

    pri.order_id,

    pri.product_id,

    max(
      pri.sku_snapshot
    ),

    max(
      pri.product_name_snapshot
    ),

    max(
      pri.category_name_snapshot
    ),

    max(
      pri.uom
    ),

    round(
      sum(
        pri.required_qty
      ),
      4
    )

  from public.production_order_recipe_items pri

  where pri.order_id =
    target_order_id

  group by
    pri.order_id,
    pri.product_id

  on conflict (
    order_id,
    product_id
  )

  do update
  set
    sku_snapshot =
      excluded.sku_snapshot,

    product_name_snapshot =
      excluded.product_name_snapshot,

    category_name_snapshot =
      excluded.category_name_snapshot,

    uom =
      excluded.uom,

    required_qty =
      excluded.required_qty,

    updated_at =
      now();

  -- -------------------------------------------------------
  -- REMOVE PRODUCTS NO LONGER REQUIRED
  -- -------------------------------------------------------

  delete from public.production_order_items poi

  where poi.order_id =
    target_order_id

    and not exists (
      select 1

      from public.production_order_recipe_items pri

      where pri.order_id =
        target_order_id

        and pri.product_id =
          poi.product_id
    );

end;
$$;

-- =========================================================
-- RECALCULATE EXISTING SELECTED RECIPES
-- =========================================================
--
-- OLD BEHAVIOR
--
-- Existing production_order_recipe_items were retained and:
--
--   required_qty =
--     historical base_qty_snapshot
--     ×
--     new yield_multiplier
--
-- NEW BEHAVIOR
--
-- Whenever existing selected Production Recipe rows are
-- updated during Production Order save:
--
--   1. Current Production Recipe ingredients are loaded.
--   2. Existing ingredient snapshots for the affected selected
--      recipes are removed.
--   3. Current master ingredients are inserted.
--   4. Product metadata comes from current Product master.
--   5. Required Qty is recalculated using current base qty.
--   6. Consolidated Production Order ingredients refresh once
--      per affected Production Order.
--
-- This is a STATEMENT-LEVEL trigger so editing an order with
-- many recipes does not repeatedly consolidate the complete
-- order once for every recipe row.
-- =========================================================

create or replace function public.recalculate_production_order_recipe_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipe_row record;
  affected_order_id uuid;
  inserted_count bigint;
begin

  -- =======================================================
  -- REBUILD EACH UPDATED SELECTED RECIPE
  -- =======================================================

  for recipe_row in
    select
      nr.id,
      nr.location_id,
      nr.order_id,
      nr.recipe_id,
      nr.yield_multiplier

    from new_rows nr
  loop

    -- -----------------------------------------------------
    -- REMOVE OLD INGREDIENT COMPOSITION
    -- -----------------------------------------------------

    delete from public.production_order_recipe_items pori

    where pori.production_order_recipe_id =
      recipe_row.id

      and pori.order_id =
        recipe_row.order_id

      and pori.location_id =
        recipe_row.location_id;

    -- -----------------------------------------------------
    -- LOAD CURRENT MASTER RECIPE INGREDIENTS
    -- -----------------------------------------------------

    insert into public.production_order_recipe_items (
      location_id,
      order_id,
      production_order_recipe_id,
      product_id,
      sku_snapshot,
      product_name_snapshot,
      category_name_snapshot,
      uom,
      base_qty_snapshot,
      required_qty
    )

    select
      recipe_row.location_id,

      recipe_row.order_id,

      recipe_row.id,

      ri.product_id,

      p.sku,

      p.name,

      c.name,

      p.uom,

      ri.qty,

      round(
        ri.qty *
        recipe_row.yield_multiplier,
        4
      )

    from public.production_recipe_items ri

    inner join public.products p
      on p.id =
        ri.product_id

     and p.location_id =
        ri.location_id

    inner join public.categories c
      on c.id =
        p.category_id

     and c.location_id =
        p.location_id

    where ri.recipe_id =
      recipe_row.recipe_id

      and ri.location_id =
        recipe_row.location_id;

    get diagnostics
      inserted_count =
        row_count;

    if inserted_count = 0 then
      raise exception
        'Production recipe must contain at least one ingredient.';
    end if;

  end loop;

  -- =======================================================
  -- CONSOLIDATE ONCE PER AFFECTED ORDER
  -- =======================================================

  for affected_order_id in
    select distinct
      nr.order_id

    from new_rows nr
  loop

    perform public.refresh_production_order_items(
      affected_order_id
    );

  end loop;

  return null;

end;
$$;

-- =========================================================
-- REPLACE HISTORICAL RECALCULATION TRIGGER
-- =========================================================
--
-- The original trigger was:
--
--   AFTER UPDATE OF required_yield_qty
--   FOR EACH ROW
--
-- and recalculated from historical base_qty_snapshot.
--
-- It is replaced with a statement-level trigger that rebuilds
-- the current recipe ingredient composition.
-- =========================================================

drop trigger if exists
recalculate_production_order_recipe_items
on public.production_order_recipes;

create trigger
recalculate_production_order_recipe_items
after update
on public.production_order_recipes

referencing
  new table as new_rows

for each statement

execute function
public.recalculate_production_order_recipe_items();

-- =========================================================
-- SECURITY HARDENING
-- =========================================================
--
-- Trigger/internal calculation functions must not be directly
-- callable by browser-facing Supabase roles.
-- =========================================================

revoke execute
on function public.sync_production_order_recipe_master()
from public, anon, authenticated;

revoke execute
on function public.protect_production_order_recipe_identity()
from public, anon, authenticated;

revoke execute
on function public.recalculate_production_order_recipe_items()
from public, anon, authenticated;

revoke execute
on function public.refresh_production_order_items(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------
-- refresh_production_order_items remains available to the
-- trusted service role for internal server-side maintenance.
-- ---------------------------------------------------------

grant execute
on function public.refresh_production_order_items(uuid)
to service_role;

commit;
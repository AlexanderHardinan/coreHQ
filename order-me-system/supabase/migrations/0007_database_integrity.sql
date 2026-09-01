-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0007_database_integrity.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- SEARCH EXTENSION
-- =========================================================
--
-- pg_trgm provides efficient partial-text / contains search
-- for operational datasets.
--
-- Examples:
--
-- "beef"
-- "teriyaki"
-- "FOR-000"
-- "Chef Alex"
--
-- This will support fast Product, Recipe and Order searches
-- as the database grows.
--

create schema if not exists extensions;

create extension if not exists pg_trgm
with schema extensions;

set local search_path =
  public,
  extensions,
  pg_catalog;

-- =========================================================
-- PROTECT LOCATION CODE
-- =========================================================
--
-- Location codes become permanent operational identifiers.
--
-- They are embedded into:
--
-- Product SKU
-- Normal Order Number
-- Production Order Number
--
-- Example:
--
-- FOR-000001
-- FOR-NO-2026-000001
-- FOR-PO-2026-000001
--
-- Changing FOR after production data already exists would
-- create inconsistent historical references.
--

create or replace function public.protect_location_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.code is distinct from old.code then
    raise exception
      'Location code cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_location_code
on public.locations;

create trigger protect_location_code
before update on public.locations
for each row
execute function public.protect_location_code();

-- =========================================================
-- PROTECT CATEGORY LOCATION
-- =========================================================
--
-- A Category belongs permanently to the location where it
-- was created.
--
-- Example:
--
-- Forza → Meat
--
-- cannot later become:
--
-- Fusion → Meat
--
-- Create a new category under Fusion instead.
--

create or replace function public.protect_category_location()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Category location cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_category_location
on public.categories;

create trigger protect_category_location
before update on public.categories
for each row
execute function public.protect_category_location();

-- =========================================================
-- VALIDATE PRODUCT CATEGORY
-- =========================================================
--
-- A new or reassigned Product may only use an active
-- Category belonging to the same Location.
--
-- The composite foreign key already guarantees matching
-- locations.
--
-- This trigger adds the operational active-state rule.
--

create or replace function public.validate_product_category_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_active boolean;
begin

  select c.is_active
  into category_active
  from public.categories c
  where c.id = new.category_id
    and c.location_id = new.location_id;

  if category_active is null then
    raise exception
      'Selected category does not exist in this location.';
  end if;

  if category_active is not true then
    raise exception
      'Inactive categories cannot be assigned to products.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_product_category_state
on public.products;

create trigger validate_product_category_state
before insert or update of
  category_id,
  location_id
on public.products
for each row
execute function public.validate_product_category_state();

-- =========================================================
-- PROTECT PRODUCT BASE UOM
-- =========================================================
--
-- Product UOM controls all recipe and order calculations.
--
-- Example:
--
-- Soy Sauce = ml
--
-- Once Soy Sauce is already referenced by recipes or orders,
-- changing it to gram would corrupt operational consistency.
--
-- UOM may still be changed while the product has never been
-- used anywhere.
--

create or replace function public.protect_product_uom_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.uom is not distinct from old.uom then
    return new;
  end if;

  if exists (
    select 1
    from public.production_recipe_items pri
    where pri.product_id = old.id
    limit 1
  )
  or exists (
    select 1
    from public.normal_order_items noi
    where noi.product_id = old.id
    limit 1
  )
  or exists (
    select 1
    from public.production_order_recipe_items pori
    where pori.product_id = old.id
    limit 1
  )
  or exists (
    select 1
    from public.production_order_items poi
    where poi.product_id = old.id
    limit 1
  )
  then
    raise exception
      'Product UOM cannot be changed because this product is already used by recipes or orders.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_product_uom_integrity
on public.products;

create trigger protect_product_uom_integrity
before update of uom
on public.products
for each row
execute function public.protect_product_uom_integrity();

-- =========================================================
-- FAST CATEGORY SEARCH
-- =========================================================

create index if not exists categories_name_trgm_idx
  on public.categories
  using gin (
    name gin_trgm_ops
  );

-- =========================================================
-- FAST PRODUCT SEARCH
-- =========================================================
--
-- Supports searches by:
--
-- Product Name
-- SKU
--

create index if not exists products_name_trgm_idx
  on public.products
  using gin (
    name gin_trgm_ops
  );

create index if not exists products_sku_trgm_idx
  on public.products
  using gin (
    sku gin_trgm_ops
  );

-- =========================================================
-- FAST RECIPE SEARCH
-- =========================================================

create index if not exists production_recipes_name_trgm_idx
  on public.production_recipes
  using gin (
    name gin_trgm_ops
  );

-- =========================================================
-- FAST NORMAL ORDER SEARCH
-- =========================================================

create index if not exists normal_orders_order_number_trgm_idx
  on public.normal_orders
  using gin (
    order_number gin_trgm_ops
  );

create index if not exists normal_orders_ordered_by_trgm_idx
  on public.normal_orders
  using gin (
    ordered_by gin_trgm_ops
  );

create index if not exists normal_order_items_product_name_trgm_idx
  on public.normal_order_items
  using gin (
    product_name_snapshot gin_trgm_ops
  );

create index if not exists normal_order_items_sku_trgm_idx
  on public.normal_order_items
  using gin (
    sku_snapshot gin_trgm_ops
  );

-- =========================================================
-- FAST PRODUCTION ORDER SEARCH
-- =========================================================

create index if not exists production_orders_order_number_trgm_idx
  on public.production_orders
  using gin (
    order_number gin_trgm_ops
  );

create index if not exists production_orders_ordered_by_trgm_idx
  on public.production_orders
  using gin (
    ordered_by gin_trgm_ops
  );

create index if not exists production_order_recipes_name_trgm_idx
  on public.production_order_recipes
  using gin (
    recipe_name_snapshot gin_trgm_ops
  );

create index if not exists production_order_items_product_name_trgm_idx
  on public.production_order_items
  using gin (
    product_name_snapshot gin_trgm_ops
  );

create index if not exists production_order_items_sku_trgm_idx
  on public.production_order_items
  using gin (
    sku_snapshot gin_trgm_ops
  );

-- =========================================================
-- ADDITIONAL OPERATIONAL COMPOSITE INDEXES
-- =========================================================
--
-- Optimized for common application queries:
--
-- Current Location
-- + Status
-- + Date
--

create index if not exists normal_orders_location_status_date_idx
  on public.normal_orders (
    location_id,
    status,
    order_date desc
  );

create index if not exists production_orders_location_status_date_idx
  on public.production_orders (
    location_id,
    status,
    order_date desc
  );

create index if not exists products_location_category_active_idx
  on public.products (
    location_id,
    category_id,
    is_active
  );

create index if not exists
production_recipes_location_active_name_idx
  on public.production_recipes (
    location_id,
    is_active,
    lower(name)
  );

-- =========================================================
-- INTERNAL COUNTER SECURITY
-- =========================================================
--
-- These are internal database-maintained tables.
--
-- Browser roles must never manipulate them directly.
--

revoke all
on table public.product_sku_counters
from anon, authenticated;

revoke all
on table public.normal_order_counters
from anon, authenticated;

revoke all
on table public.production_order_counters
from anon, authenticated;

-- =========================================================
-- SECURITY DEFINER FUNCTION PROTECTION
-- =========================================================
--
-- refresh_production_order_items() is an internal helper
-- function which performs privileged calculated writes.
--
-- It must not be directly executable from the browser/API.
--

revoke execute
on function public.refresh_production_order_items(uuid)
from public, anon, authenticated;

-- The service role may execute it internally if required by
-- future server-side maintenance operations.

grant execute
on function public.refresh_production_order_items(uuid)
to service_role;

-- =========================================================
-- TRIGGER FUNCTION EXECUTION HARDENING
-- =========================================================
--
-- These functions exist for database triggers only.
--
-- Remove direct API execution permissions as defense in
-- depth.
--

revoke execute
on function public.generate_product_sku()
from public, anon, authenticated;

revoke execute
on function public.generate_normal_order_number()
from public, anon, authenticated;

revoke execute
on function public.generate_production_order_number()
from public, anon, authenticated;

revoke execute
on function public.initialize_production_order_recipe_items()
from public, anon, authenticated;

revoke execute
on function public.recalculate_production_order_recipe_items()
from public, anon, authenticated;

revoke execute
on function public.refresh_after_production_order_recipe_delete()
from public, anon, authenticated;

revoke execute
on function public.validate_product_category_state()
from public, anon, authenticated;

revoke execute
on function public.protect_product_uom_integrity()
from public, anon, authenticated;

-- =========================================================
-- REALTIME ARCHITECTURE NOTE
-- =========================================================
--
-- DO NOT add every table to supabase_realtime here.
--
-- Order Me System is a commercial operational platform.
--
-- Supabase currently recommends Realtime Broadcast for
-- scalable/security-sensitive applications.
--
-- Broadcast triggers and channel authorization will be
-- created after:
--
-- 1. Secure Order Me login
-- 2. Application session
-- 3. RLS architecture
--
-- This prevents unsecured realtime subscriptions from being
-- introduced before authentication is finalized.
--

commit;
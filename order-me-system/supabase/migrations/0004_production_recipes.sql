-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0004_production_recipes.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- SUPPORTING COMPOSITE PRODUCT KEY
-- =========================================================
--
-- Required so recipe ingredients can enforce:
--
-- Recipe Location = Product Location
--
-- Example:
--
-- Forza Recipe
--     ↓
-- Forza Product
--
-- A Fusion product cannot accidentally be assigned to
-- a Forza production recipe.
--

create unique index if not exists products_id_location_unique
  on public.products (id, location_id);

-- =========================================================
-- PRODUCTION RECIPES
-- =========================================================

create table if not exists public.production_recipes (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,

  name text not null,

  -- Number / size of batches represented by the base recipe.
  batch_qty numeric(18, 4) not null,

  -- Finished base yield of the recipe.
  yield_qty numeric(18, 4) not null,

  -- Base yield unit.
  yield_uom text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint production_recipes_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- NAME
  -- -------------------------------------------------------

  constraint production_recipes_name_not_blank
    check (
      char_length(trim(name)) > 0
    ),

  constraint production_recipes_name_length
    check (
      char_length(trim(name)) <= 200
    ),

  -- -------------------------------------------------------
  -- BATCH
  -- -------------------------------------------------------

  constraint production_recipes_batch_qty_positive
    check (
      batch_qty > 0
    ),

  constraint production_recipes_batch_qty_finite
    check (
      batch_qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- YIELD
  -- -------------------------------------------------------

  constraint production_recipes_yield_qty_positive
    check (
      yield_qty > 0
    ),

  constraint production_recipes_yield_qty_finite
    check (
      yield_qty <= 99999999999999.9999
    ),

  constraint production_recipes_yield_uom_allowed
    check (
      yield_uom in (
        'ml',
        'pc',
        'gram'
      )
    )
);

-- =========================================================
-- RECIPE NAME UNIQUE PER LOCATION
-- =========================================================
--
-- Prevent:
--
-- Forza → Teriyaki Sauce
-- Forza → teriyaki sauce
--
-- while allowing:
--
-- Forza  → Teriyaki Sauce
-- Fusion → Teriyaki Sauce
--

create unique index if not exists
production_recipes_location_name_unique_ci
  on public.production_recipes (
    location_id,
    lower(trim(name))
  );

-- =========================================================
-- COMPOSITE RECIPE KEY
-- =========================================================
--
-- Required for database-level location enforcement between
-- production_recipes and production_recipe_items.
--

create unique index if not exists
production_recipes_id_location_unique
  on public.production_recipes (
    id,
    location_id
  );

-- =========================================================
-- RECIPE INDEXES
-- =========================================================

create index if not exists production_recipes_location_id_idx
  on public.production_recipes (location_id);

create index if not exists production_recipes_location_active_idx
  on public.production_recipes (
    location_id,
    is_active
  );

create index if not exists production_recipes_location_name_idx
  on public.production_recipes (
    location_id,
    lower(name)
  );

create index if not exists production_recipes_updated_at_idx
  on public.production_recipes (
    updated_at desc
  );

-- =========================================================
-- PRODUCTION RECIPE ITEMS
-- =========================================================

create table if not exists public.production_recipe_items (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  recipe_id uuid not null,
  product_id uuid not null,

  qty numeric(18, 4) not null,
  uom text not null,

  -- Used to retain ingredient display order.
  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint production_recipe_items_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- RECIPE + LOCATION
  -- -------------------------------------------------------

  constraint production_recipe_items_recipe_location_fkey
    foreign key (
      recipe_id,
      location_id
    )
    references public.production_recipes (
      id,
      location_id
    )
    on update cascade
    on delete cascade,

  -- -------------------------------------------------------
  -- PRODUCT + LOCATION
  -- -------------------------------------------------------
  --
  -- Product deletion is RESTRICTED while the product is
  -- being used in a production recipe.
  --

  constraint production_recipe_items_product_location_fkey
    foreign key (
      product_id,
      location_id
    )
    references public.products (
      id,
      location_id
    )
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- QUANTITY
  -- -------------------------------------------------------

  constraint production_recipe_items_qty_positive
    check (
      qty > 0
    ),

  constraint production_recipe_items_qty_finite
    check (
      qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- UOM
  -- -------------------------------------------------------

  constraint production_recipe_items_uom_allowed
    check (
      uom in (
        'ml',
        'pc',
        'gram'
      )
    ),

  -- -------------------------------------------------------
  -- SORT ORDER
  -- -------------------------------------------------------

  constraint production_recipe_items_sort_order_valid
    check (
      sort_order >= 0
    ),

  -- -------------------------------------------------------
  -- DUPLICATE INGREDIENT PROTECTION
  -- -------------------------------------------------------
  --
  -- The same product should only appear once inside a
  -- single recipe.
  --

  constraint production_recipe_items_recipe_product_unique
    unique (
      recipe_id,
      product_id
    )
);

-- =========================================================
-- RECIPE ITEM INDEXES
-- =========================================================

create index if not exists
production_recipe_items_recipe_id_idx
  on public.production_recipe_items (
    recipe_id
  );

create index if not exists
production_recipe_items_product_id_idx
  on public.production_recipe_items (
    product_id
  );

create index if not exists
production_recipe_items_location_id_idx
  on public.production_recipe_items (
    location_id
  );

create index if not exists
production_recipe_items_recipe_sort_idx
  on public.production_recipe_items (
    recipe_id,
    sort_order
  );

-- =========================================================
-- VALIDATE INGREDIENT PRODUCT UOM
-- =========================================================
--
-- A recipe ingredient must use the same operational base
-- UOM as the selected product.
--
-- Example:
--
-- Product:
-- Soy Sauce → ml
--
-- Recipe Item:
-- Soy Sauce → ml       VALID
-- Soy Sauce → gram     REJECTED
--
-- This prevents unit inconsistencies from entering recipe
-- calculations.
--

create or replace function public.validate_recipe_item_product()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  product_uom text;
  product_active boolean;
begin

  select
    p.uom,
    p.is_active
  into
    product_uom,
    product_active
  from public.products p
  where p.id = new.product_id
    and p.location_id = new.location_id;

  if product_uom is null then
    raise exception
      'Selected ingredient product does not exist in this location.';
  end if;

  if product_active is not true then
    raise exception
      'Inactive products cannot be added as new recipe ingredients.';
  end if;

  if new.uom <> product_uom then
    raise exception
      'Ingredient UOM must match the product UOM. Expected: %.',
      product_uom;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_production_recipe_item_product
on public.production_recipe_items;

create trigger validate_production_recipe_item_product
before insert or update of
  product_id,
  location_id,
  uom
on public.production_recipe_items
for each row
execute function public.validate_recipe_item_product();

-- =========================================================
-- PROTECT RECIPE LOCATION
-- =========================================================
--
-- A recipe cannot be moved from Forza to Fusion after
-- creation.
--
-- Create a new recipe in the correct location instead.
--

create or replace function public.protect_production_recipe_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Production recipe location cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_production_recipe_identity
on public.production_recipes;

create trigger protect_production_recipe_identity
before update on public.production_recipes
for each row
execute function public.protect_production_recipe_identity();

-- =========================================================
-- PROTECT RECIPE ITEM LOCATION / RECIPE IDENTITY
-- =========================================================

create or replace function public.protect_production_recipe_item_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Recipe ingredient location cannot be changed.';
  end if;

  if new.recipe_id is distinct from old.recipe_id then
    raise exception
      'Recipe ingredient cannot be moved to another recipe.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_production_recipe_item_identity
on public.production_recipe_items;

create trigger protect_production_recipe_item_identity
before update on public.production_recipe_items
for each row
execute function public.protect_production_recipe_item_identity();

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists set_production_recipes_updated_at
on public.production_recipes;

create trigger set_production_recipes_updated_at
before update on public.production_recipes
for each row
execute function public.set_updated_at();


drop trigger if exists set_production_recipe_items_updated_at
on public.production_recipe_items;

create trigger set_production_recipe_items_updated_at
before update on public.production_recipe_items
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.production_recipes
enable row level security;

alter table public.production_recipe_items
enable row level security;

-- Browser-facing policies will be created after the secure
-- application session architecture has been finalized.
--
-- Until then, the publishable key does not receive direct
-- access to these tables.

commit;
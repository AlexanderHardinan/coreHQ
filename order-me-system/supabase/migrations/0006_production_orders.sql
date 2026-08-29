-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0006_production_orders.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- PRODUCTION ORDER NUMBER COUNTERS
-- =========================================================
--
-- Independent counter per:
--
-- Location
-- + Year
--
-- Examples:
--
-- FOR-PO-2026-000001
-- FOR-PO-2026-000002
--
-- FUS-PO-2026-000001
-- FUS-PO-2026-000002
--

create table if not exists public.production_order_counters (
  location_id uuid not null,
  order_year integer not null,

  last_value bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint production_order_counters_pkey
    primary key (
      location_id,
      order_year
    ),

  constraint production_order_counters_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint production_order_counters_year_valid
    check (
      order_year between 2000 and 9999
    ),

  constraint production_order_counters_last_value_valid
    check (
      last_value >= 0
    )
);

-- =========================================================
-- COUNTER UPDATED_AT
-- =========================================================

drop trigger if exists set_production_order_counters_updated_at
on public.production_order_counters;

create trigger set_production_order_counters_updated_at
before update on public.production_order_counters
for each row
execute function public.set_updated_at();

-- =========================================================
-- PRODUCTION ORDERS
-- =========================================================

create table if not exists public.production_orders (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,

  order_number text not null,

  order_date date not null default current_date,

  ordered_by text not null,

  status text not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint production_orders_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- ORDER NUMBER
  -- -------------------------------------------------------

  constraint production_orders_order_number_unique
    unique (order_number),

  constraint production_orders_order_number_not_blank
    check (
      char_length(trim(order_number)) > 0
    ),

  constraint production_orders_order_number_format
    check (
      order_number ~
      '^[A-Z0-9_-]{2,10}-PO-[0-9]{4}-[0-9]{6,}$'
    ),

  -- -------------------------------------------------------
  -- ORDERED BY
  -- -------------------------------------------------------

  constraint production_orders_ordered_by_not_blank
    check (
      char_length(trim(ordered_by)) > 0
    ),

  constraint production_orders_ordered_by_length
    check (
      char_length(trim(ordered_by)) <= 200
    ),

  -- -------------------------------------------------------
  -- STATUS
  -- -------------------------------------------------------

  constraint production_orders_status_allowed
    check (
      status in (
        'draft',
        'submitted',
        'completed',
        'cancelled'
      )
    )
);

-- =========================================================
-- COMPOSITE ORDER KEY
-- =========================================================

create unique index if not exists
production_orders_id_location_unique
  on public.production_orders (
    id,
    location_id
  );

-- =========================================================
-- PRODUCTION ORDER INDEXES
-- =========================================================

create index if not exists production_orders_location_id_idx
  on public.production_orders (
    location_id
  );

create index if not exists production_orders_location_date_idx
  on public.production_orders (
    location_id,
    order_date desc
  );

create index if not exists production_orders_location_status_idx
  on public.production_orders (
    location_id,
    status
  );

create index if not exists production_orders_order_date_idx
  on public.production_orders (
    order_date desc
  );

create index if not exists production_orders_ordered_by_idx
  on public.production_orders (
    lower(ordered_by)
  );

create index if not exists production_orders_created_at_idx
  on public.production_orders (
    created_at desc
  );

-- =========================================================
-- AUTOMATIC PRODUCTION ORDER NUMBER
-- =========================================================

create or replace function public.generate_production_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  location_code text;
  selected_year integer;
  next_number bigint;
begin

  if new.order_number is not null
     and char_length(trim(new.order_number)) > 0 then

    raise exception
      'Production order number is system-generated and cannot be entered manually.';

  end if;

  if new.order_date is null then
    new.order_date := current_date;
  end if;

  selected_year :=
    extract(year from new.order_date)::integer;

  select l.code
  into location_code
  from public.locations l
  where l.id = new.location_id
    and l.is_active = true;

  if location_code is null then
    raise exception
      'A valid active location is required before generating a production order number.';
  end if;

  insert into public.production_order_counters (
    location_id,
    order_year,
    last_value
  )
  values (
    new.location_id,
    selected_year,
    1
  )

  on conflict (
    location_id,
    order_year
  )
  do update
  set
    last_value =
      public.production_order_counters.last_value + 1

  returning last_value
  into next_number;

  new.order_number :=
    location_code
    || '-PO-'
    || selected_year::text
    || '-'
    || lpad(next_number::text, 6, '0');

  return new;
end;
$$;

drop trigger if exists generate_production_order_number
on public.production_orders;

create trigger generate_production_order_number
before insert on public.production_orders
for each row
execute function public.generate_production_order_number();

-- =========================================================
-- PROTECT PRODUCTION ORDER IDENTITY
-- =========================================================

create or replace function public.protect_production_order_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Production order location cannot be changed after creation.';
  end if;

  if new.order_number is distinct from old.order_number then
    raise exception
      'Production order number cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_production_order_identity
on public.production_orders;

create trigger protect_production_order_identity
before update on public.production_orders
for each row
execute function public.protect_production_order_identity();

-- =========================================================
-- PRODUCTION ORDER RECIPES
-- =========================================================
--
-- One production order may contain multiple recipes.
--
-- Historical recipe values are snapshotted so a later edit
-- to the master recipe does not change an existing order.
--

create table if not exists public.production_order_recipes (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  order_id uuid not null,
  recipe_id uuid not null,

  recipe_name_snapshot text not null,

  batch_qty_snapshot numeric(18, 4) not null,

  base_yield_qty_snapshot numeric(18, 4) not null,
  yield_uom_snapshot text not null,

  required_yield_qty numeric(18, 4) not null,

  -- -------------------------------------------------------
  -- YIELD MULTIPLIER
  -- -------------------------------------------------------
  --
  -- Required Yield / Base Yield
  --
  -- Generated by PostgreSQL so it cannot become inconsistent.
  --

  yield_multiplier numeric(28, 10)
    generated always as (
      round(
        required_yield_qty
        / base_yield_qty_snapshot,
        10
      )
    ) stored,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint production_order_recipes_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- ORDER + LOCATION
  -- -------------------------------------------------------

  constraint production_order_recipes_order_location_fkey
    foreign key (
      order_id,
      location_id
    )
    references public.production_orders (
      id,
      location_id
    )
    on update cascade
    on delete cascade,

  -- -------------------------------------------------------
  -- MASTER RECIPE + LOCATION
  -- -------------------------------------------------------

  constraint production_order_recipes_recipe_location_fkey
    foreign key (
      recipe_id,
      location_id
    )
    references public.production_recipes (
      id,
      location_id
    )
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- SNAPSHOT VALIDATION
  -- -------------------------------------------------------

  constraint production_order_recipes_name_not_blank
    check (
      char_length(trim(recipe_name_snapshot)) > 0
    ),

  constraint production_order_recipes_batch_qty_positive
    check (
      batch_qty_snapshot > 0
    ),

  constraint production_order_recipes_base_yield_positive
    check (
      base_yield_qty_snapshot > 0
    ),

  constraint production_order_recipes_required_yield_positive
    check (
      required_yield_qty > 0
    ),

  constraint production_order_recipes_yield_uom_allowed
    check (
      yield_uom_snapshot in (
        'ml',
        'pc',
        'gram'
      )
    ),

  constraint production_order_recipes_sort_order_valid
    check (
      sort_order >= 0
    ),

  -- One master recipe appears once per production order.
  constraint production_order_recipes_order_recipe_unique
    unique (
      order_id,
      recipe_id
    )
);

-- =========================================================
-- COMPOSITE PRODUCTION ORDER RECIPE KEY
-- =========================================================

create unique index if not exists
production_order_recipes_id_order_location_unique
  on public.production_order_recipes (
    id,
    order_id,
    location_id
  );

-- =========================================================
-- PRODUCTION ORDER RECIPE INDEXES
-- =========================================================

create index if not exists
production_order_recipes_order_id_idx
  on public.production_order_recipes (
    order_id
  );

create index if not exists
production_order_recipes_recipe_id_idx
  on public.production_order_recipes (
    recipe_id
  );

create index if not exists
production_order_recipes_location_id_idx
  on public.production_order_recipes (
    location_id
  );

create index if not exists
production_order_recipes_order_sort_idx
  on public.production_order_recipes (
    order_id,
    sort_order
  );

-- =========================================================
-- POPULATE RECIPE SNAPSHOT
-- =========================================================

create or replace function public.populate_production_order_recipe()
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
  master_active boolean;
begin

  select
    r.name,
    r.batch_qty,
    r.yield_qty,
    r.yield_uom,
    r.is_active
  into
    master_name,
    master_batch_qty,
    master_yield_qty,
    master_yield_uom,
    master_active
  from public.production_recipes r
  where r.id = new.recipe_id
    and r.location_id = new.location_id;

  if master_name is null then
    raise exception
      'Selected production recipe does not exist in this location.';
  end if;

  if master_active is not true then
    raise exception
      'Inactive production recipes cannot be added to a new production order.';
  end if;

  new.recipe_name_snapshot := master_name;
  new.batch_qty_snapshot := master_batch_qty;
  new.base_yield_qty_snapshot := master_yield_qty;
  new.yield_uom_snapshot := master_yield_uom;

  return new;
end;
$$;

drop trigger if exists populate_production_order_recipe
on public.production_order_recipes;

create trigger populate_production_order_recipe
before insert on public.production_order_recipes
for each row
execute function public.populate_production_order_recipe();

-- =========================================================
-- PROTECT PRODUCTION ORDER RECIPE IDENTITY
-- =========================================================

create or replace function public.protect_production_order_recipe_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Production order recipe location cannot be changed.';
  end if;

  if new.order_id is distinct from old.order_id then
    raise exception
      'Production order recipe cannot be moved to another order.';
  end if;

  if new.recipe_id is distinct from old.recipe_id then
    raise exception
      'Selected recipe cannot be replaced directly. Remove it and add the new recipe instead.';
  end if;

  if new.recipe_name_snapshot is distinct from old.recipe_name_snapshot
     or new.batch_qty_snapshot is distinct from old.batch_qty_snapshot
     or new.base_yield_qty_snapshot is distinct from old.base_yield_qty_snapshot
     or new.yield_uom_snapshot is distinct from old.yield_uom_snapshot then

    raise exception
      'Production recipe snapshot fields cannot be edited manually.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_production_order_recipe_identity
on public.production_order_recipes;

create trigger protect_production_order_recipe_identity
before update on public.production_order_recipes
for each row
execute function public.protect_production_order_recipe_identity();

-- =========================================================
-- PRODUCTION ORDER RECIPE ITEMS
-- =========================================================
--
-- Internal historical ingredient snapshot.
--
-- This is intentionally relational instead of storing recipe
-- ingredients as uncontrolled JSON.
--
-- Each row records the ingredient quantity used for one
-- selected recipe inside one production order.
--

create table if not exists public.production_order_recipe_items (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  order_id uuid not null,
  production_order_recipe_id uuid not null,
  product_id uuid not null,

  sku_snapshot text not null,
  product_name_snapshot text not null,
  category_name_snapshot text not null,

  uom text not null,

  -- Ingredient quantity from the original base recipe.
  base_qty_snapshot numeric(18, 4) not null,

  -- Scaled requirement for this recipe/order.
  required_qty numeric(18, 4) not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint production_order_recipe_items_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint production_order_recipe_items_parent_fkey
    foreign key (
      production_order_recipe_id,
      order_id,
      location_id
    )
    references public.production_order_recipes (
      id,
      order_id,
      location_id
    )
    on update cascade
    on delete cascade,

  constraint production_order_recipe_items_product_location_fkey
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

  constraint production_order_recipe_items_sku_not_blank
    check (
      char_length(trim(sku_snapshot)) > 0
    ),

  constraint production_order_recipe_items_product_name_not_blank
    check (
      char_length(trim(product_name_snapshot)) > 0
    ),

  constraint production_order_recipe_items_category_name_not_blank
    check (
      char_length(trim(category_name_snapshot)) > 0
    ),

  constraint production_order_recipe_items_uom_allowed
    check (
      uom in (
        'ml',
        'pc',
        'gram'
      )
    ),

  constraint production_order_recipe_items_base_qty_positive
    check (
      base_qty_snapshot > 0
    ),

  constraint production_order_recipe_items_required_qty_positive
    check (
      required_qty > 0
    ),

  constraint production_order_recipe_items_parent_product_unique
    unique (
      production_order_recipe_id,
      product_id
    )
);

-- =========================================================
-- RECIPE ITEM INDEXES
-- =========================================================

create index if not exists
production_order_recipe_items_parent_idx
  on public.production_order_recipe_items (
    production_order_recipe_id
  );

create index if not exists
production_order_recipe_items_order_idx
  on public.production_order_recipe_items (
    order_id
  );

create index if not exists
production_order_recipe_items_product_idx
  on public.production_order_recipe_items (
    product_id
  );

create index if not exists
production_order_recipe_items_order_product_idx
  on public.production_order_recipe_items (
    order_id,
    product_id
  );

-- =========================================================
-- CONSOLIDATED PRODUCTION ORDER ITEMS
-- =========================================================
--
-- One row per ingredient/product for the entire production
-- order.
--
-- If:
--
-- Recipe A → Garlic 200 gram
-- Recipe B → Garlic 350 gram
--
-- this table stores:
--
-- Garlic → Required Qty 550 gram
--

create table if not exists public.production_order_items (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  order_id uuid not null,
  product_id uuid not null,

  sku_snapshot text not null,
  product_name_snapshot text not null,
  category_name_snapshot text not null,

  uom text not null,

  required_qty numeric(18, 4) not null,

  on_hand_qty numeric(18, 4) not null default 0,

  -- -------------------------------------------------------
  -- ORDER REQUEST QTY
  -- -------------------------------------------------------
  --
  -- MAX(Required Qty - On Hand Qty, 0)
  --

  requested_qty numeric(18, 4)
    generated always as (
      greatest(
        required_qty - on_hand_qty,
        0::numeric
      )
    ) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint production_order_items_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint production_order_items_order_location_fkey
    foreign key (
      order_id,
      location_id
    )
    references public.production_orders (
      id,
      location_id
    )
    on update cascade
    on delete cascade,

  constraint production_order_items_product_location_fkey
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

  constraint production_order_items_sku_not_blank
    check (
      char_length(trim(sku_snapshot)) > 0
    ),

  constraint production_order_items_product_name_not_blank
    check (
      char_length(trim(product_name_snapshot)) > 0
    ),

  constraint production_order_items_category_name_not_blank
    check (
      char_length(trim(category_name_snapshot)) > 0
    ),

  constraint production_order_items_uom_allowed
    check (
      uom in (
        'ml',
        'pc',
        'gram'
      )
    ),

  constraint production_order_items_required_qty_positive
    check (
      required_qty > 0
      and
      required_qty <= 99999999999999.9999
    ),

  constraint production_order_items_on_hand_qty_valid
    check (
      on_hand_qty >= 0
      and
      on_hand_qty <= 99999999999999.9999
    ),

  constraint production_order_items_order_product_unique
    unique (
      order_id,
      product_id
    )
);

-- =========================================================
-- CONSOLIDATED ITEM INDEXES
-- =========================================================

create index if not exists production_order_items_order_id_idx
  on public.production_order_items (
    order_id
  );

create index if not exists production_order_items_product_id_idx
  on public.production_order_items (
    product_id
  );

create index if not exists production_order_items_location_id_idx
  on public.production_order_items (
    location_id
  );

create index if not exists production_order_items_order_product_idx
  on public.production_order_items (
    order_id,
    product_id
  );

create index if not exists production_order_items_product_name_idx
  on public.production_order_items (
    lower(product_name_snapshot)
  );

-- =========================================================
-- REFRESH CONSOLIDATED INGREDIENT SUMMARY
-- =========================================================
--
-- Consolidates identical products across all selected recipes.
--
-- Existing on_hand_qty is intentionally preserved.
--

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
    min(pri.location_id::text)::uuid,
    pri.order_id,
    pri.product_id,
    max(pri.sku_snapshot),
    max(pri.product_name_snapshot),
    max(pri.category_name_snapshot),
    max(pri.uom),
    round(
      sum(pri.required_qty),
      4
    )
  from public.production_order_recipe_items pri
  where pri.order_id = target_order_id
  group by
    pri.order_id,
    pri.product_id

  on conflict (
    order_id,
    product_id
  )
  do update
  set
    required_qty = excluded.required_qty,
    updated_at = now();

  -- -------------------------------------------------------
  -- REMOVE ITEMS NO LONGER REQUIRED
  -- -------------------------------------------------------

  delete from public.production_order_items poi
  where poi.order_id = target_order_id
    and not exists (
      select 1
      from public.production_order_recipe_items pri
      where pri.order_id = target_order_id
        and pri.product_id = poi.product_id
    );

end;
$$;

-- =========================================================
-- INITIALIZE RECIPE INGREDIENT SNAPSHOTS
-- =========================================================
--
-- Runs when a recipe is first added to a production order.
--
-- Formula:
--
-- Required Ingredient Qty
-- =
-- Base Ingredient Qty
-- ×
-- Yield Multiplier
--

create or replace function public.initialize_production_order_recipe_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

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
    new.location_id,
    new.order_id,
    new.id,
    ri.product_id,
    p.sku,
    p.name,
    c.name,
    ri.uom,
    ri.qty,
    round(
      ri.qty * new.yield_multiplier,
      4
    )
  from public.production_recipe_items ri
  inner join public.products p
    on p.id = ri.product_id
   and p.location_id = ri.location_id
  inner join public.categories c
    on c.id = p.category_id
   and c.location_id = p.location_id
  where ri.recipe_id = new.recipe_id
    and ri.location_id = new.location_id;

  if not found then
    raise exception
      'Production recipe must contain at least one ingredient.';
  end if;

  perform public.refresh_production_order_items(
    new.order_id
  );

  return new;
end;
$$;

drop trigger if exists initialize_production_order_recipe_items
on public.production_order_recipes;

create trigger initialize_production_order_recipe_items
after insert on public.production_order_recipes
for each row
execute function public.initialize_production_order_recipe_items();

-- =========================================================
-- RECALCULATE WHEN REQUIRED YIELD CHANGES
-- =========================================================
--
-- Uses historical base_qty_snapshot values.
--
-- It does NOT reload the master recipe ingredients.
--
-- Therefore an existing order remains historically stable
-- even if the master production recipe is edited later.
--

create or replace function public.recalculate_production_order_recipe_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  update public.production_order_recipe_items
  set
    required_qty = round(
      base_qty_snapshot * new.yield_multiplier,
      4
    ),
    updated_at = now()
  where production_order_recipe_id = new.id;

  perform public.refresh_production_order_items(
    new.order_id
  );

  return new;
end;
$$;

drop trigger if exists recalculate_production_order_recipe_items
on public.production_order_recipes;

create trigger recalculate_production_order_recipe_items
after update of required_yield_qty
on public.production_order_recipes
for each row
when (
  old.required_yield_qty
  is distinct from
  new.required_yield_qty
)
execute function public.recalculate_production_order_recipe_items();

-- =========================================================
-- REFRESH AFTER REMOVING A RECIPE
-- =========================================================

create or replace function public.refresh_after_production_order_recipe_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  perform public.refresh_production_order_items(
    old.order_id
  );

  return old;
end;
$$;

drop trigger if exists refresh_after_production_order_recipe_delete
on public.production_order_recipes;

create trigger refresh_after_production_order_recipe_delete
after delete on public.production_order_recipes
for each row
execute function public.refresh_after_production_order_recipe_delete();

-- =========================================================
-- PROTECT SYSTEM-CALCULATED CONSOLIDATED VALUES
-- =========================================================
--
-- Users may change on_hand_qty.
--
-- required_qty and snapshot identity must remain controlled
-- by the production recipe calculation engine.
--

create or replace function public.protect_production_order_item_calculation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Production order item location cannot be changed.';
  end if;

  if new.order_id is distinct from old.order_id then
    raise exception
      'Production order item cannot be moved to another order.';
  end if;

  if new.product_id is distinct from old.product_id then
    raise exception
      'Production order item product cannot be changed.';
  end if;

  if new.sku_snapshot is distinct from old.sku_snapshot
     or new.product_name_snapshot is distinct from old.product_name_snapshot
     or new.category_name_snapshot is distinct from old.category_name_snapshot
     or new.uom is distinct from old.uom then

    raise exception
      'Production order ingredient identity cannot be edited manually.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_production_order_item_calculation
on public.production_order_items;

create trigger protect_production_order_item_calculation
before update on public.production_order_items
for each row
execute function public.protect_production_order_item_calculation();

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists set_production_orders_updated_at
on public.production_orders;

create trigger set_production_orders_updated_at
before update on public.production_orders
for each row
execute function public.set_updated_at();


drop trigger if exists set_production_order_recipes_updated_at
on public.production_order_recipes;

create trigger set_production_order_recipes_updated_at
before update on public.production_order_recipes
for each row
execute function public.set_updated_at();


drop trigger if exists set_production_order_recipe_items_updated_at
on public.production_order_recipe_items;

create trigger set_production_order_recipe_items_updated_at
before update on public.production_order_recipe_items
for each row
execute function public.set_updated_at();


drop trigger if exists set_production_order_items_updated_at
on public.production_order_items;

create trigger set_production_order_items_updated_at
before update on public.production_order_items
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.production_order_counters
enable row level security;

alter table public.production_orders
enable row level security;

alter table public.production_order_recipes
enable row level security;

alter table public.production_order_recipe_items
enable row level security;

alter table public.production_order_items
enable row level security;

-- No browser-facing policies are created yet.
--
-- These tables remain unavailable through the publishable
-- key until the secure Order Me application session and
-- final RLS architecture are completed.

commit;
-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0003_products.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- CATEGORY / LOCATION COMPOSITE INTEGRITY
-- =========================================================
--
-- Required so a product cannot belong to Forza while using
-- a category that belongs to Fusion, or vice versa.
--

create unique index if not exists categories_id_location_unique
  on public.categories (id, location_id);

-- =========================================================
-- PRODUCT SKU COUNTERS
-- =========================================================
--
-- Maintains an independent SKU counter for each location.
--
-- Example:
-- FOR-000001
-- FOR-000002
--
-- FUS-000001
-- FUS-000002
--

create table if not exists public.product_sku_counters (
  location_id uuid primary key,

  last_value bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint product_sku_counters_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint product_sku_counters_last_value_valid
    check (last_value >= 0)
);

-- =========================================================
-- PRODUCT SKU COUNTER UPDATED_AT TRIGGER
-- =========================================================

drop trigger if exists set_product_sku_counters_updated_at
on public.product_sku_counters;

create trigger set_product_sku_counters_updated_at
before update on public.product_sku_counters
for each row
execute function public.set_updated_at();

-- =========================================================
-- PRODUCTS
-- =========================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  category_id uuid not null,

  sku text not null,
  name text not null,

  amount_qty numeric(18, 4) not null,
  uom text not null,

  packaging_size_amount numeric(18, 4) not null,
  packaging_uom text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint products_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- CATEGORY + LOCATION
  -- -------------------------------------------------------
  --
  -- Enforces that the selected category belongs to the same
  -- operational location as the product.
  --

  constraint products_category_location_fkey
    foreign key (category_id, location_id)
    references public.categories(id, location_id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- SKU
  -- -------------------------------------------------------

  constraint products_sku_unique
    unique (sku),

  constraint products_sku_not_blank
    check (char_length(trim(sku)) > 0),

  constraint products_sku_format
    check (
      sku ~ '^[A-Z0-9_-]{2,10}-[0-9]{6,}$'
    ),

  -- -------------------------------------------------------
  -- PRODUCT NAME
  -- -------------------------------------------------------

  constraint products_name_not_blank
    check (char_length(trim(name)) > 0),

  constraint products_name_length
    check (
      char_length(trim(name)) <= 200
    ),

  -- -------------------------------------------------------
  -- PRODUCT QUANTITY
  -- -------------------------------------------------------

  constraint products_amount_qty_positive
    check (amount_qty > 0),

  constraint products_amount_qty_finite
    check (
      amount_qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- PRODUCT UOM
  -- -------------------------------------------------------

  constraint products_uom_allowed
    check (
      uom in (
        'ml',
        'pc',
        'gram'
      )
    ),

  -- -------------------------------------------------------
  -- PACKAGING
  -- -------------------------------------------------------

  constraint products_packaging_size_positive
    check (packaging_size_amount > 0),

  constraint products_packaging_size_finite
    check (
      packaging_size_amount <= 99999999999999.9999
    ),

  constraint products_packaging_uom_allowed
    check (
      packaging_uom in (
        'bottle',
        'box',
        'pack',
        'can'
      )
    )
);

-- =========================================================
-- PRODUCT INDEXES
-- =========================================================

create index if not exists products_location_id_idx
  on public.products (location_id);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_location_category_idx
  on public.products (
    location_id,
    category_id
  );

create index if not exists products_location_active_idx
  on public.products (
    location_id,
    is_active
  );

create index if not exists products_location_name_idx
  on public.products (
    location_id,
    lower(name)
  );

create index if not exists products_updated_at_idx
  on public.products (
    updated_at desc
  );

-- =========================================================
-- AUTOMATIC SKU GENERATOR
-- =========================================================

create or replace function public.generate_product_sku()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  location_code text;
  next_number bigint;
begin

  -- SKU must always be generated by the system.
  if new.sku is not null
     and char_length(trim(new.sku)) > 0 then

    raise exception
      'Product SKU is system-generated and cannot be entered manually.';

  end if;

  -- Retrieve the location code.
  select l.code
  into location_code
  from public.locations l
  where l.id = new.location_id
    and l.is_active = true;

  if location_code is null then
    raise exception
      'A valid active location is required before generating a product SKU.';
  end if;

  -- Atomically create/increment the location counter.
  --
  -- This prevents duplicate SKUs when multiple users create
  -- products at the same time.

  insert into public.product_sku_counters (
    location_id,
    last_value
  )
  values (
    new.location_id,
    1
  )

  on conflict (location_id)
  do update
  set
    last_value =
      public.product_sku_counters.last_value + 1,
    updated_at = now()

  returning last_value
  into next_number;

  -- Generate:
  --
  -- FOR-000001
  -- FUS-000001

  new.sku :=
    location_code
    || '-'
    || lpad(next_number::text, 6, '0');

  return new;
end;
$$;

-- =========================================================
-- AUTOMATIC SKU TRIGGER
-- =========================================================

drop trigger if exists generate_products_sku
on public.products;

create trigger generate_products_sku
before insert on public.products
for each row
execute function public.generate_product_sku();

-- =========================================================
-- PROTECT SKU + LOCATION IDENTITY
-- =========================================================
--
-- Once a product has been created:
--
-- - its system-generated SKU cannot be manually edited
-- - its operational location cannot silently be changed
--
-- This preserves historical and relational integrity.
--

create or replace function public.protect_product_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.sku is distinct from old.sku then
    raise exception
      'Product SKU cannot be changed after creation.';
  end if;

  if new.location_id is distinct from old.location_id then
    raise exception
      'Product location cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_products_identity
on public.products;

create trigger protect_products_identity
before update on public.products
for each row
execute function public.protect_product_identity();

-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists set_products_updated_at
on public.products;

create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.products enable row level security;

alter table public.product_sku_counters
enable row level security;

-- No browser-facing RLS policies are created yet.
--
-- Access remains closed until the Order Me authentication
-- and application-session security architecture is completed.
--
-- product_sku_counters is an internal operational table and
-- should never require direct browser-side manipulation.

commit;
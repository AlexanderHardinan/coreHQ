-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0005_normal_orders.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- NORMAL ORDER NUMBER COUNTERS
-- =========================================================
--
-- Maintains an independent sequence for each location/year.
--
-- Examples:
--
-- FOR-NO-2026-000001
-- FOR-NO-2026-000002
--
-- FUS-NO-2026-000001
-- FUS-NO-2026-000002
--
-- The counter update is atomic so concurrent users cannot
-- generate the same order number.
--

create table if not exists public.normal_order_counters (
  location_id uuid not null,
  order_year integer not null,

  last_value bigint not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint normal_order_counters_pkey
    primary key (
      location_id,
      order_year
    ),

  constraint normal_order_counters_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint normal_order_counters_year_valid
    check (
      order_year between 2000 and 9999
    ),

  constraint normal_order_counters_last_value_valid
    check (
      last_value >= 0
    )
);

-- =========================================================
-- COUNTER UPDATED_AT
-- =========================================================

drop trigger if exists set_normal_order_counters_updated_at
on public.normal_order_counters;

create trigger set_normal_order_counters_updated_at
before update on public.normal_order_counters
for each row
execute function public.set_updated_at();

-- =========================================================
-- NORMAL ORDERS
-- =========================================================

create table if not exists public.normal_orders (
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

  constraint normal_orders_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- ORDER NUMBER
  -- -------------------------------------------------------

  constraint normal_orders_order_number_unique
    unique (order_number),

  constraint normal_orders_order_number_not_blank
    check (
      char_length(trim(order_number)) > 0
    ),

  constraint normal_orders_order_number_format
    check (
      order_number ~
      '^[A-Z0-9_-]{2,10}-NO-[0-9]{4}-[0-9]{6,}$'
    ),

  -- -------------------------------------------------------
  -- ORDERED BY
  -- -------------------------------------------------------

  constraint normal_orders_ordered_by_not_blank
    check (
      char_length(trim(ordered_by)) > 0
    ),

  constraint normal_orders_ordered_by_length
    check (
      char_length(trim(ordered_by)) <= 200
    ),

  -- -------------------------------------------------------
  -- STATUS
  -- -------------------------------------------------------

  constraint normal_orders_status_allowed
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
-- COMPOSITE ORDER IDENTITY
-- =========================================================
--
-- Allows child rows to enforce:
--
-- Order Location = Item Location
--

create unique index if not exists normal_orders_id_location_unique
  on public.normal_orders (
    id,
    location_id
  );

-- =========================================================
-- NORMAL ORDER INDEXES
-- =========================================================

create index if not exists normal_orders_location_id_idx
  on public.normal_orders (
    location_id
  );

create index if not exists normal_orders_location_date_idx
  on public.normal_orders (
    location_id,
    order_date desc
  );

create index if not exists normal_orders_location_status_idx
  on public.normal_orders (
    location_id,
    status
  );

create index if not exists normal_orders_order_date_idx
  on public.normal_orders (
    order_date desc
  );

create index if not exists normal_orders_ordered_by_idx
  on public.normal_orders (
    lower(ordered_by)
  );

create index if not exists normal_orders_created_at_idx
  on public.normal_orders (
    created_at desc
  );

-- =========================================================
-- AUTOMATIC NORMAL ORDER NUMBER
-- =========================================================

create or replace function public.generate_normal_order_number()
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

  -- Order numbers are always system-generated.
  if new.order_number is not null
     and char_length(trim(new.order_number)) > 0 then

    raise exception
      'Normal order number is system-generated and cannot be entered manually.';

  end if;

  -- Ensure an order date is available.
  if new.order_date is null then
    new.order_date := current_date;
  end if;

  selected_year :=
    extract(year from new.order_date)::integer;

  -- Retrieve active location code.
  select l.code
  into location_code
  from public.locations l
  where l.id = new.location_id
    and l.is_active = true;

  if location_code is null then
    raise exception
      'A valid active location is required before generating an order number.';
  end if;

  -- Atomically create or increment the location/year counter.
  insert into public.normal_order_counters (
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
      public.normal_order_counters.last_value + 1

  returning last_value
  into next_number;

  new.order_number :=
    location_code
    || '-NO-'
    || selected_year::text
    || '-'
    || lpad(next_number::text, 6, '0');

  return new;
end;
$$;

-- =========================================================
-- ORDER NUMBER TRIGGER
-- =========================================================

drop trigger if exists generate_normal_order_number
on public.normal_orders;

create trigger generate_normal_order_number
before insert on public.normal_orders
for each row
execute function public.generate_normal_order_number();

-- =========================================================
-- PROTECT NORMAL ORDER IDENTITY
-- =========================================================
--
-- An existing order cannot silently move between Forza and
-- Fusion, and its generated order number cannot be changed.
--
-- order_date remains editable as required by the system.
-- Changing the date does not regenerate the historical order
-- reference.
--

create or replace function public.protect_normal_order_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Normal order location cannot be changed after creation.';
  end if;

  if new.order_number is distinct from old.order_number then
    raise exception
      'Normal order number cannot be changed after creation.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_normal_order_identity
on public.normal_orders;

create trigger protect_normal_order_identity
before update on public.normal_orders
for each row
execute function public.protect_normal_order_identity();

-- =========================================================
-- NORMAL ORDER ITEMS
-- =========================================================

create table if not exists public.normal_order_items (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,
  order_id uuid not null,
  product_id uuid not null,

  -- Physical quantity counted by the human operator.
  on_hand_qty numeric(18, 4) not null default 0,

  -- Quantity requested for ordering.
  requested_qty numeric(18, 4) not null default 0,

  -- Product operational UOM.
  uom text not null,

  -- -------------------------------------------------------
  -- HISTORICAL SNAPSHOTS
  -- -------------------------------------------------------
  --
  -- These values preserve what appeared on the order when
  -- it was created even if master product/category data is
  -- renamed later.
  --

  sku_snapshot text not null,
  product_name_snapshot text not null,
  category_name_snapshot text not null,

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint normal_order_items_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- ORDER + LOCATION
  -- -------------------------------------------------------

  constraint normal_order_items_order_location_fkey
    foreign key (
      order_id,
      location_id
    )
    references public.normal_orders (
      id,
      location_id
    )
    on update cascade
    on delete cascade,

  -- -------------------------------------------------------
  -- PRODUCT + LOCATION
  -- -------------------------------------------------------
  --
  -- Product deletion is restricted while historical order
  -- items still reference that product.
  --

  constraint normal_order_items_product_location_fkey
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
  -- ON HAND
  -- -------------------------------------------------------

  constraint normal_order_items_on_hand_qty_valid
    check (
      on_hand_qty >= 0
      and
      on_hand_qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- REQUESTED
  -- -------------------------------------------------------

  constraint normal_order_items_requested_qty_valid
    check (
      requested_qty >= 0
      and
      requested_qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- UOM
  -- -------------------------------------------------------

  constraint normal_order_items_uom_allowed
    check (
      uom in (
        'ml',
        'pc',
        'gram'
      )
    ),

  -- -------------------------------------------------------
  -- SNAPSHOTS
  -- -------------------------------------------------------

  constraint normal_order_items_sku_snapshot_not_blank
    check (
      char_length(trim(sku_snapshot)) > 0
    ),

  constraint normal_order_items_product_snapshot_not_blank
    check (
      char_length(trim(product_name_snapshot)) > 0
    ),

  constraint normal_order_items_category_snapshot_not_blank
    check (
      char_length(trim(category_name_snapshot)) > 0
    ),

  -- -------------------------------------------------------
  -- SORT ORDER
  -- -------------------------------------------------------

  constraint normal_order_items_sort_order_valid
    check (
      sort_order >= 0
    ),

  -- -------------------------------------------------------
  -- DUPLICATE PRODUCT PROTECTION
  -- -------------------------------------------------------
  --
  -- One product should only appear once within a normal
  -- order.
  --

  constraint normal_order_items_order_product_unique
    unique (
      order_id,
      product_id
    )
);

-- =========================================================
-- NORMAL ORDER ITEM INDEXES
-- =========================================================

create index if not exists normal_order_items_order_id_idx
  on public.normal_order_items (
    order_id
  );

create index if not exists normal_order_items_product_id_idx
  on public.normal_order_items (
    product_id
  );

create index if not exists normal_order_items_location_id_idx
  on public.normal_order_items (
    location_id
  );

create index if not exists normal_order_items_order_sort_idx
  on public.normal_order_items (
    order_id,
    sort_order
  );

create index if not exists normal_order_items_product_name_idx
  on public.normal_order_items (
    lower(product_name_snapshot)
  );

-- =========================================================
-- POPULATE + VALIDATE PRODUCT SNAPSHOTS
-- =========================================================
--
-- When an item is first added, the system retrieves:
--
-- SKU
-- Product Name
-- Category Name
-- UOM
--
-- directly from the Product database.
--
-- The application must not invent these historical values.
--

create or replace function public.populate_normal_order_item_product()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  product_sku text;
  product_name text;
  product_uom text;
  product_active boolean;
  category_name text;
begin

  select
    p.sku,
    p.name,
    p.uom,
    p.is_active,
    c.name
  into
    product_sku,
    product_name,
    product_uom,
    product_active,
    category_name
  from public.products p
  inner join public.categories c
    on c.id = p.category_id
   and c.location_id = p.location_id
  where p.id = new.product_id
    and p.location_id = new.location_id;

  if product_sku is null then
    raise exception
      'Selected product does not exist in this location.';
  end if;

  if product_active is not true then
    raise exception
      'Inactive products cannot be added to a new normal order.';
  end if;

  -- If the application supplies a UOM, it must match.
  if new.uom is not null
     and new.uom <> product_uom then

    raise exception
      'Order item UOM must match the product UOM. Expected: %.',
      product_uom;

  end if;

  -- System-controlled product information.
  new.uom := product_uom;
  new.sku_snapshot := product_sku;
  new.product_name_snapshot := product_name;
  new.category_name_snapshot := category_name;

  return new;
end;
$$;

-- Populate snapshots during insert.
--
-- Also refresh snapshots if the product itself is changed
-- while an order is being edited.

drop trigger if exists populate_normal_order_item_product
on public.normal_order_items;

create trigger populate_normal_order_item_product
before insert or update of
  product_id,
  location_id,
  uom
on public.normal_order_items
for each row
execute function public.populate_normal_order_item_product();

-- =========================================================
-- PROTECT ORDER ITEM IDENTITY
-- =========================================================
--
-- An item can be edited and its product can be changed while
-- editing an order.
--
-- However, the row cannot silently move to another order or
-- another location.
--

create or replace function public.protect_normal_order_item_identity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin

  if new.location_id is distinct from old.location_id then
    raise exception
      'Normal order item location cannot be changed.';
  end if;

  if new.order_id is distinct from old.order_id then
    raise exception
      'Normal order item cannot be moved to another order.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_normal_order_item_identity
on public.normal_order_items;

create trigger protect_normal_order_item_identity
before update on public.normal_order_items
for each row
execute function public.protect_normal_order_item_identity();

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================

drop trigger if exists set_normal_orders_updated_at
on public.normal_orders;

create trigger set_normal_orders_updated_at
before update on public.normal_orders
for each row
execute function public.set_updated_at();


drop trigger if exists set_normal_order_items_updated_at
on public.normal_order_items;

create trigger set_normal_order_items_updated_at
before update on public.normal_order_items
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.normal_order_counters
enable row level security;

alter table public.normal_orders
enable row level security;

alter table public.normal_order_items
enable row level security;

-- No browser-facing policies are created yet.
--
-- Access remains blocked through the publishable key until
-- the Order Me secure session and RLS architecture is
-- completed.

commit;
-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Normal Orders — Packaging Snapshots
-- Migration: 0021_normal_order_packaging_snapshots.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- ADD PRODUCT / PACKAGING SNAPSHOT COLUMNS
-- =========================================================
--
-- These values describe the Product packaging information
-- that belongs to each Normal Order item.
--
-- Example:
--
-- Product:
-- Coca-Cola
--
-- amount_qty                  = 330
-- uom                         = ml
-- packaging_size_amount       = 24
-- packaging_uom               = box
--
-- Saved order snapshot:
--
-- Product Size:
-- 330 ml
--
-- Packaging:
-- 24 / box
--
-- Ordering Guide:
-- 1 box = 24 × 330 ml
--
-- =========================================================

alter table public.normal_order_items
add column if not exists amount_qty_snapshot
numeric(18, 4);

alter table public.normal_order_items
add column if not exists packaging_size_amount_snapshot
numeric(18, 4);

alter table public.normal_order_items
add column if not exists packaging_uom_snapshot
text;

-- =========================================================
-- BACKFILL EXISTING NORMAL ORDER ITEMS
-- =========================================================
--
-- Existing orders were created before packaging snapshots
-- existed.
--
-- The best available source for those historical rows is
-- their currently linked Product master record.
--
-- New Normal Orders will snapshot the values automatically
-- at insert time through the database trigger below.
--
-- =========================================================

update public.normal_order_items noi
set
  amount_qty_snapshot =
    p.amount_qty,

  packaging_size_amount_snapshot =
    p.packaging_size_amount,

  packaging_uom_snapshot =
    p.packaging_uom
from public.products p
where p.id =
    noi.product_id
  and p.location_id =
    noi.location_id
  and (
    noi.amount_qty_snapshot
      is null
    or
    noi.packaging_size_amount_snapshot
      is null
    or
    noi.packaging_uom_snapshot
      is null
  );

-- =========================================================
-- VERIFY BACKFILL
-- =========================================================

do $$
begin

  if exists (
    select 1
    from public.normal_order_items
    where amount_qty_snapshot
      is null
       or packaging_size_amount_snapshot
      is null
       or packaging_uom_snapshot
      is null
  ) then

    raise exception
      'Unable to backfill Normal Order packaging snapshots for one or more existing order items.';

  end if;

end;
$$;

-- =========================================================
-- SNAPSHOT CONSTRAINTS
-- =========================================================

alter table public.normal_order_items
alter column amount_qty_snapshot
set not null;

alter table public.normal_order_items
alter column packaging_size_amount_snapshot
set not null;

alter table public.normal_order_items
alter column packaging_uom_snapshot
set not null;

-- =========================================================
-- PRODUCT SIZE VALIDATION
-- =========================================================

alter table public.normal_order_items
drop constraint if exists
normal_order_items_amount_qty_snapshot_valid;

alter table public.normal_order_items
add constraint
normal_order_items_amount_qty_snapshot_valid
check (
  amount_qty_snapshot >
    0
  and
  amount_qty_snapshot <=
    99999999999999.9999
);

-- =========================================================
-- PACKAGING SIZE VALIDATION
-- =========================================================

alter table public.normal_order_items
drop constraint if exists
normal_order_items_packaging_size_snapshot_valid;

alter table public.normal_order_items
add constraint
normal_order_items_packaging_size_snapshot_valid
check (
  packaging_size_amount_snapshot >
    0
  and
  packaging_size_amount_snapshot <=
    99999999999999.9999
);

-- =========================================================
-- PACKAGING UOM VALIDATION
-- =========================================================

alter table public.normal_order_items
drop constraint if exists
normal_order_items_packaging_uom_snapshot_allowed;

alter table public.normal_order_items
add constraint
normal_order_items_packaging_uom_snapshot_allowed
check (
  packaging_uom_snapshot in (
    'bottle',
    'box',
    'pack',
    'can',
    'kilo',
    'liter',
    'tray'
  )
);

-- =========================================================
-- POPULATE + VALIDATE PRODUCT SNAPSHOTS
-- =========================================================
--
-- Extend the existing Normal Order Product snapshot trigger.
--
-- The browser supplies only:
--
-- Product ID
-- On Hand Qty
-- Order Request Qty
--
-- PostgreSQL remains authoritative for:
--
-- SKU
-- Product Name
-- Category
-- Product Size
-- Product UOM
-- Packaging Size
-- Packaging UOM
--
-- =========================================================

create or replace function
public.populate_normal_order_item_product()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare

  product_sku text;

  product_name text;

  product_amount_qty
    numeric(18, 4);

  product_uom text;

  product_packaging_size_amount
    numeric(18, 4);

  product_packaging_uom text;

  product_active boolean;

  category_name text;

begin

  select
    p.sku,
    p.name,
    p.amount_qty,
    p.uom,
    p.packaging_size_amount,
    p.packaging_uom,
    p.is_active,
    c.name

  into
    product_sku,
    product_name,
    product_amount_qty,
    product_uom,
    product_packaging_size_amount,
    product_packaging_uom,
    product_active,
    category_name

  from public.products p

  inner join public.categories c
    on c.id =
      p.category_id

   and c.location_id =
      p.location_id

  where p.id =
      new.product_id

    and p.location_id =
      new.location_id;

  -- =======================================================
  -- PRODUCT EXISTS
  -- =======================================================

  if product_sku is null then

    raise exception
      'Selected product does not exist in this location.';

  end if;

  -- =======================================================
  -- ACTIVE PRODUCT
  -- =======================================================

  if product_active
    is not true then

    raise exception
      'Inactive products cannot be added to a new normal order.';

  end if;

  -- =======================================================
  -- PRODUCT SIZE
  -- =======================================================

  if product_amount_qty
    is null
    or product_amount_qty <=
      0 then

    raise exception
      'Selected product has an invalid Amount QTY.';

  end if;

  -- =======================================================
  -- PRODUCT UOM
  -- =======================================================

  if product_uom
    not in (
      'ml',
      'pc',
      'gram'
    ) then

    raise exception
      'Selected product has an invalid Product UOM.';

  end if;

  -- If the application supplied UOM, it must match Product.
  if new.uom is not null
     and new.uom <>
       product_uom then

    raise exception
      'Order item UOM must match the product UOM. Expected: %.',
      product_uom;

  end if;

  -- =======================================================
  -- PACKAGING SIZE
  -- =======================================================

  if product_packaging_size_amount
    is null
    or
    product_packaging_size_amount <=
      0 then

    raise exception
      'Selected product has an invalid Packaging Size Amount.';

  end if;

  -- =======================================================
  -- PACKAGING UOM
  -- =======================================================

  if product_packaging_uom
    not in (
      'bottle',
      'box',
      'pack',
      'can',
      'kilo',
      'liter',
      'tray'
    ) then

    raise exception
      'Selected product has an invalid Packaging UOM.';

  end if;

  -- =======================================================
  -- SYSTEM-CONTROLLED SNAPSHOTS
  -- =======================================================

  new.uom :=
    product_uom;

  new.sku_snapshot :=
    product_sku;

  new.product_name_snapshot :=
    product_name;

  new.category_name_snapshot :=
    category_name;

  new.amount_qty_snapshot :=
    product_amount_qty;

  new.packaging_size_amount_snapshot :=
    product_packaging_size_amount;

  new.packaging_uom_snapshot :=
    product_packaging_uom;

  return new;

end;
$$;

-- =========================================================
-- RECREATE SNAPSHOT TRIGGER
-- =========================================================
--
-- New item:
--     Product details are snapshotted automatically.
--
-- Product changed while editing:
--     New selected Product details are snapshotted.
--
-- =========================================================

drop trigger if exists
populate_normal_order_item_product
on public.normal_order_items;

create trigger
populate_normal_order_item_product
before insert or update of
  product_id,
  location_id,
  uom
on public.normal_order_items
for each row
execute function
public.populate_normal_order_item_product();

-- =========================================================
-- COLUMN DOCUMENTATION
-- =========================================================

comment on column
public.normal_order_items.amount_qty_snapshot
is
'Product Amount QTY captured for the Normal Order item.';

comment on column
public.normal_order_items.packaging_size_amount_snapshot
is
'Product Packaging Size Amount captured for the Normal Order item.';

comment on column
public.normal_order_items.packaging_uom_snapshot
is
'Product Packaging UOM captured for the Normal Order item.';

commit;
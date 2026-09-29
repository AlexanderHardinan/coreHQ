-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Product Master Live Synchronization
-- Migration: 0019_product_master_sync.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- REMOVE LEGACY PRODUCT UOM LOCK
-- =========================================================
--
-- Previous behavior:
--
-- Product UOM could not be changed after the Product was
-- referenced by Recipes or Orders.
--
-- New behavior:
--
-- Product remains the master source of truth.
--
-- When Product metadata changes, connected operational
-- records synchronize automatically.
-- =========================================================

drop trigger if exists
protect_product_uom_integrity
on public.products;

-- =========================================================
-- RECIPE ITEM PRODUCT VALIDATION
-- =========================================================
--
-- Preserve:
--
-- Product must belong to the same location.
-- New ingredients must use an active Product.
-- Ingredient UOM must match Product master UOM.
--
-- Change:
--
-- Existing recipe items may receive a synchronized UOM even
-- if the Product was later made inactive.
-- =========================================================

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

  where p.id =
    new.product_id

    and p.location_id =
      new.location_id;

  if product_uom is null then
    raise exception
      'Selected ingredient product does not exist in this location.';
  end if;

  -- -------------------------------------------------------
  -- ACTIVE PRODUCT VALIDATION
  -- -------------------------------------------------------
  --
  -- Active status is required when:
  --
  -- INSERT
  -- Product is replaced
  -- Location is replaced
  --
  -- Existing rows may still receive master-data
  -- synchronization if the Product was later deactivated.
  -- -------------------------------------------------------

  if (
    tg_op = 'INSERT'

    or new.product_id
      is distinct from
      old.product_id

    or new.location_id
      is distinct from
      old.location_id
  )
  and product_active is not true then

    raise exception
      'Inactive products cannot be added as new recipe ingredients.';

  end if;

  if new.uom <>
     product_uom then

    raise exception
      'Ingredient UOM must match the product UOM. Expected: %.',
      product_uom;

  end if;

  return new;

end;
$$;

-- =========================================================
-- NORMAL ORDER PRODUCT POPULATION
-- =========================================================
--
-- Product master remains authoritative for:
--
-- UOM
-- SKU
-- Product Name
-- Category Name
--
-- Existing items may be synchronized even if the Product
-- was later deactivated.
-- =========================================================

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
    on c.id =
      p.category_id

   and c.location_id =
      p.location_id

  where p.id =
    new.product_id

    and p.location_id =
      new.location_id;

  if product_sku is null then
    raise exception
      'Selected product does not exist in this location.';
  end if;

  -- -------------------------------------------------------
  -- ACTIVE PRODUCT VALIDATION
  -- -------------------------------------------------------
  --
  -- Only newly assigned Products must currently be active.
  --
  -- Existing operational rows remain synchronizable.
  -- -------------------------------------------------------

  if (
    tg_op = 'INSERT'

    or new.product_id
      is distinct from
      old.product_id

    or new.location_id
      is distinct from
      old.location_id
  )
  and product_active is not true then

    raise exception
      'Inactive products cannot be added to a new normal order.';

  end if;

  if new.uom is not null
     and new.uom <>
       product_uom then

    raise exception
      'Order item UOM must match the product UOM. Expected: %.',
      product_uom;

  end if;

  -- -------------------------------------------------------
  -- AUTHORITATIVE PRODUCT MASTER VALUES
  -- -------------------------------------------------------

  new.uom :=
    product_uom;

  new.sku_snapshot :=
    product_sku;

  new.product_name_snapshot :=
    product_name;

  new.category_name_snapshot :=
    category_name;

  return new;

end;
$$;

-- =========================================================
-- WASTE PRODUCT MASTER SYNCHRONIZATION
-- =========================================================
--
-- Waste previously preserved Product snapshots permanently.
--
-- Product master is now authoritative.
--
-- Existing Waste quantities, dates and reasons remain
-- untouched.
-- =========================================================

create or replace function public.prepare_waste_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_sku text;
  resolved_product_name text;
  resolved_category_name text;
  resolved_uom text;
  resolved_product_active boolean;
begin

  -- =======================================================
  -- LOCATION IMMUTABILITY
  -- =======================================================

  if tg_op = 'UPDATE'
     and new.location_id
       is distinct from
       old.location_id then

    raise exception
      'Waste entry location cannot be changed after creation.';

  end if;

  -- =======================================================
  -- LOAD CURRENT PRODUCT MASTER
  -- =======================================================

  select
    p.sku,
    p.name,
    c.name,
    p.uom,
    p.is_active

  into
    resolved_sku,
    resolved_product_name,
    resolved_category_name,
    resolved_uom,
    resolved_product_active

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

  if resolved_sku is null then
    raise exception
      'Selected Waste product does not exist in the current location.';
  end if;

  -- =======================================================
  -- ACTIVE PRODUCT VALIDATION
  -- =======================================================
  --
  -- Product must be active when:
  --
  -- Creating a Waste entry
  -- Changing the selected Product
  --
  -- Existing historical Waste rows may still synchronize
  -- master data if the Product later becomes inactive.
  -- =======================================================

  if (
    tg_op = 'INSERT'

    or (
      tg_op = 'UPDATE'
      and new.product_id
        is distinct from
        old.product_id
    )
  )
  and resolved_product_active is not true then

    raise exception
      'Inactive products cannot be added to Waste Data.';

  end if;

  if resolved_uom not in (
    'ml',
    'pc',
    'gram'
  ) then

    raise exception
      'Selected Waste product has an invalid operational UOM.';

  end if;

  -- =======================================================
  -- AUTHORITATIVE PRODUCT MASTER VALUES
  -- =======================================================

  new.sku_snapshot :=
    resolved_sku;

  new.product_name_snapshot :=
    resolved_product_name;

  new.category_name_snapshot :=
    resolved_category_name;

  new.uom_snapshot :=
    resolved_uom;

  return new;

end;
$$;

-- =========================================================
-- PRODUCTION ORDER CONSOLIDATED ITEM PROTECTION
-- =========================================================
--
-- Preserve identity protection while allowing synchronized
-- Product master metadata.
--
-- Location, Order and Product IDs remain immutable.
--
-- Product identity fields may only be changed to values that
-- exactly match the current Product master.
-- =========================================================

create or replace function public.protect_production_order_item_calculation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  master_sku text;
  master_product_name text;
  master_category_name text;
  master_uom text;
begin

  if new.location_id
       is distinct from
       old.location_id then

    raise exception
      'Production order item location cannot be changed.';

  end if;

  if new.order_id
       is distinct from
       old.order_id then

    raise exception
      'Production order item cannot be moved to another order.';

  end if;

  if new.product_id
       is distinct from
       old.product_id then

    raise exception
      'Production order item product cannot be changed.';

  end if;

  -- =======================================================
  -- PRODUCT MASTER IDENTITY VALIDATION
  -- =======================================================

  if new.sku_snapshot
       is distinct from
       old.sku_snapshot

     or new.product_name_snapshot
       is distinct from
       old.product_name_snapshot

     or new.category_name_snapshot
       is distinct from
       old.category_name_snapshot

     or new.uom
       is distinct from
       old.uom then

    select
      p.sku,
      p.name,
      c.name,
      p.uom

    into
      master_sku,
      master_product_name,
      master_category_name,
      master_uom

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

    if master_sku is null then
      raise exception
        'Production order Product master record was not found.';
    end if;

    if new.sku_snapshot
         is distinct from
         master_sku

       or new.product_name_snapshot
         is distinct from
         master_product_name

       or new.category_name_snapshot
         is distinct from
         master_category_name

       or new.uom
         is distinct from
         master_uom then

      raise exception
        'Production order ingredient identity must match the current Product master.';

    end if;

  end if;

  return new;

end;
$$;

-- =========================================================
-- PRODUCT MASTER → OPERATIONAL RECORDS
-- =========================================================
--
-- Central synchronization function.
--
-- Triggered whenever Product:
--
-- SKU
-- Name
-- Category
-- UOM
--
-- changes.
--
-- Quantities are NEVER mathematically converted.
-- =========================================================

create or replace function public.sync_product_master_to_operational_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_category_name text;
begin

  -- =======================================================
  -- NOTHING RELEVANT CHANGED
  -- =======================================================

  if old.sku
       is not distinct from
       new.sku

     and old.name
       is not distinct from
       new.name

     and old.category_id
       is not distinct from
       new.category_id

     and old.uom
       is not distinct from
       new.uom then

    return new;

  end if;

  -- =======================================================
  -- CATEGORY NAME
  -- =======================================================

  select
    c.name

  into
    resolved_category_name

  from public.categories c

  where c.id =
    new.category_id

    and c.location_id =
      new.location_id;

  if resolved_category_name is null then
    raise exception
      'Unable to synchronize Product because its Category could not be resolved.';
  end if;

  -- =======================================================
  -- PRODUCTION RECIPE ITEMS
  -- =======================================================
  --
  -- Product relationship and ingredient quantity remain
  -- unchanged.
  --
  -- Only UOM follows Product master.
  -- =======================================================

  update public.production_recipe_items pri
  set
    uom =
      new.uom

  where pri.product_id =
    new.id

    and pri.location_id =
      new.location_id

    and pri.uom
      is distinct from
      new.uom;

  -- =======================================================
  -- NORMAL ORDER ITEMS
  -- =======================================================

  update public.normal_order_items noi
  set
    uom =
      new.uom,

    sku_snapshot =
      new.sku,

    product_name_snapshot =
      new.name,

    category_name_snapshot =
      resolved_category_name

  where noi.product_id =
    new.id

    and noi.location_id =
      new.location_id

    and (
      noi.uom
        is distinct from
        new.uom

      or noi.sku_snapshot
        is distinct from
        new.sku

      or noi.product_name_snapshot
        is distinct from
        new.name

      or noi.category_name_snapshot
        is distinct from
        resolved_category_name
    );

  -- =======================================================
  -- PRODUCTION ORDER RECIPE ITEMS
  -- =======================================================

  update public.production_order_recipe_items pori
  set
    uom =
      new.uom,

    sku_snapshot =
      new.sku,

    product_name_snapshot =
      new.name,

    category_name_snapshot =
      resolved_category_name

  where pori.product_id =
    new.id

    and pori.location_id =
      new.location_id

    and (
      pori.uom
        is distinct from
        new.uom

      or pori.sku_snapshot
        is distinct from
        new.sku

      or pori.product_name_snapshot
        is distinct from
        new.name

      or pori.category_name_snapshot
        is distinct from
        resolved_category_name
    );

  -- =======================================================
  -- CONSOLIDATED PRODUCTION ORDER ITEMS
  -- =======================================================

  update public.production_order_items poi
  set
    uom =
      new.uom,

    sku_snapshot =
      new.sku,

    product_name_snapshot =
      new.name,

    category_name_snapshot =
      resolved_category_name

  where poi.product_id =
    new.id

    and poi.location_id =
      new.location_id

    and (
      poi.uom
        is distinct from
        new.uom

      or poi.sku_snapshot
        is distinct from
        new.sku

      or poi.product_name_snapshot
        is distinct from
        new.name

      or poi.category_name_snapshot
        is distinct from
        resolved_category_name
    );

  -- =======================================================
  -- WASTE ENTRIES
  -- =======================================================

  update public.waste_entries we
  set
    uom_snapshot =
      new.uom,

    sku_snapshot =
      new.sku,

    product_name_snapshot =
      new.name,

    category_name_snapshot =
      resolved_category_name

  where we.product_id =
    new.id

    and we.location_id =
      new.location_id

    and (
      we.uom_snapshot
        is distinct from
        new.uom

      or we.sku_snapshot
        is distinct from
        new.sku

      or we.product_name_snapshot
        is distinct from
        new.name

      or we.category_name_snapshot
        is distinct from
        resolved_category_name
    );

  return new;

end;
$$;

-- =========================================================
-- PRODUCT MASTER SYNC TRIGGER
-- =========================================================

drop trigger if exists
sync_product_master_to_operational_records
on public.products;

create trigger
sync_product_master_to_operational_records
after update of
  sku,
  name,
  category_id,
  uom
on public.products
for each row
when (
  old.sku
    is distinct from
    new.sku

  or old.name
    is distinct from
    new.name

  or old.category_id
    is distinct from
    new.category_id

  or old.uom
    is distinct from
    new.uom
)
execute function
public.sync_product_master_to_operational_records();

-- =========================================================
-- EXISTING DATA BACKFILL
-- =========================================================
--
-- Synchronize Product master data into records that already
-- exist before this migration.
--
-- Operational quantities remain untouched.
-- =========================================================

-- =========================================================
-- PRODUCTION RECIPE ITEMS
-- =========================================================

update public.production_recipe_items pri
set
  uom =
    p.uom

from public.products p

where p.id =
  pri.product_id

  and p.location_id =
    pri.location_id

  and pri.uom
    is distinct from
    p.uom;

-- =========================================================
-- NORMAL ORDER ITEMS
-- =========================================================

update public.normal_order_items noi
set
  uom =
    p.uom,

  sku_snapshot =
    p.sku,

  product_name_snapshot =
    p.name,

  category_name_snapshot =
    c.name

from public.products p

inner join public.categories c
  on c.id =
    p.category_id

 and c.location_id =
    p.location_id

where p.id =
  noi.product_id

  and p.location_id =
    noi.location_id

  and (
    noi.uom
      is distinct from
      p.uom

    or noi.sku_snapshot
      is distinct from
      p.sku

    or noi.product_name_snapshot
      is distinct from
      p.name

    or noi.category_name_snapshot
      is distinct from
      c.name
  );

-- =========================================================
-- PRODUCTION ORDER RECIPE ITEMS
-- =========================================================

update public.production_order_recipe_items pori
set
  uom =
    p.uom,

  sku_snapshot =
    p.sku,

  product_name_snapshot =
    p.name,

  category_name_snapshot =
    c.name

from public.products p

inner join public.categories c
  on c.id =
    p.category_id

 and c.location_id =
    p.location_id

where p.id =
  pori.product_id

  and p.location_id =
    pori.location_id

  and (
    pori.uom
      is distinct from
      p.uom

    or pori.sku_snapshot
      is distinct from
      p.sku

    or pori.product_name_snapshot
      is distinct from
      p.name

    or pori.category_name_snapshot
      is distinct from
      c.name
  );

-- =========================================================
-- CONSOLIDATED PRODUCTION ORDER ITEMS
-- =========================================================

update public.production_order_items poi
set
  uom =
    p.uom,

  sku_snapshot =
    p.sku,

  product_name_snapshot =
    p.name,

  category_name_snapshot =
    c.name

from public.products p

inner join public.categories c
  on c.id =
    p.category_id

 and c.location_id =
    p.location_id

where p.id =
  poi.product_id

  and p.location_id =
    poi.location_id

  and (
    poi.uom
      is distinct from
      p.uom

    or poi.sku_snapshot
      is distinct from
      p.sku

    or poi.product_name_snapshot
      is distinct from
      p.name

    or poi.category_name_snapshot
      is distinct from
      c.name
  );

-- =========================================================
-- WASTE ENTRIES
-- =========================================================

update public.waste_entries we
set
  uom_snapshot =
    p.uom,

  sku_snapshot =
    p.sku,

  product_name_snapshot =
    p.name,

  category_name_snapshot =
    c.name

from public.products p

inner join public.categories c
  on c.id =
    p.category_id

 and c.location_id =
    p.location_id

where p.id =
  we.product_id

  and p.location_id =
    we.location_id

  and (
    we.uom_snapshot
      is distinct from
      p.uom

    or we.sku_snapshot
      is distinct from
      p.sku

    or we.product_name_snapshot
      is distinct from
      p.name

    or we.category_name_snapshot
      is distinct from
      c.name
  );

-- =========================================================
-- FUNCTION SECURITY
-- =========================================================

revoke execute
on function public.sync_product_master_to_operational_records()
from public;

revoke execute
on function public.sync_product_master_to_operational_records()
from anon;

revoke execute
on function public.sync_product_master_to_operational_records()
from authenticated;

grant execute
on function public.sync_product_master_to_operational_records()
to service_role;

commit;
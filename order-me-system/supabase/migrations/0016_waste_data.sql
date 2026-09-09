-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Waste Data Module
-- Migration: 0016_waste_data.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- WASTE ENTRIES
-- =========================================================
--
-- One row represents one recorded waste event.
--
-- Product identity is relational:
--
-- waste_entries.product_id
--        ↓
-- products.id
--
-- Product display information is snapshotted so historical
-- Waste reports remain stable if Product or Category names
-- are changed later.
--
-- UOM is never manually trusted from the application.
-- It is copied automatically from the selected Product.
-- =========================================================

create table if not exists public.waste_entries (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,

  waste_date date not null default current_date,

  product_id uuid not null,

  qty numeric(18, 4) not null,

  -- -------------------------------------------------------
  -- HISTORICAL PRODUCT SNAPSHOTS
  -- -------------------------------------------------------

  sku_snapshot text not null,

  product_name_snapshot text not null,

  category_name_snapshot text not null,

  uom_snapshot text not null,

  -- -------------------------------------------------------
  -- WASTE REASON
  -- -------------------------------------------------------
  --
  -- UI labels:
  --
  -- spoiled         → Spoiled
  -- expired         → Expired
  -- bad_quality     → Bad quality
  -- guest_complaint → Guest Complaint
  -- -------------------------------------------------------

  reason text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- -------------------------------------------------------
  -- LOCATION
  -- -------------------------------------------------------

  constraint waste_entries_location_id_fkey
    foreign key (
      location_id
    )
    references public.locations (
      id
    )
    on update cascade
    on delete restrict,

  -- -------------------------------------------------------
  -- PRODUCT + LOCATION
  -- -------------------------------------------------------
  --
  -- A Fusion Product can never be stored inside a Forza
  -- Waste entry and vice versa.
  -- -------------------------------------------------------

  constraint waste_entries_product_location_fkey
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
  -- DATE
  -- -------------------------------------------------------

  constraint waste_entries_date_valid
    check (
      waste_date >= date '2000-01-01'
      and
      waste_date <= date '9999-12-31'
    ),

  -- -------------------------------------------------------
  -- QUANTITY
  -- -------------------------------------------------------
  --
  -- A Waste record must represent an actual quantity.
  --
  -- Zero-value Waste rows are not operational records.
  -- -------------------------------------------------------

  constraint waste_entries_qty_positive
    check (
      qty > 0
    ),

  constraint waste_entries_qty_finite
    check (
      qty <= 99999999999999.9999
    ),

  -- -------------------------------------------------------
  -- UOM
  -- -------------------------------------------------------

  constraint waste_entries_uom_allowed
    check (
      uom_snapshot in (
        'ml',
        'pc',
        'gram'
      )
    ),

  -- -------------------------------------------------------
  -- REASON
  -- -------------------------------------------------------

  constraint waste_entries_reason_allowed
    check (
      reason in (
        'spoiled',
        'expired',
        'bad_quality',
        'guest_complaint'
      )
    ),

  -- -------------------------------------------------------
  -- SNAPSHOT SAFETY
  -- -------------------------------------------------------

  constraint waste_entries_sku_snapshot_not_blank
    check (
      char_length(
        trim(
          sku_snapshot
        )
      ) > 0
    ),

  constraint waste_entries_product_name_snapshot_not_blank
    check (
      char_length(
        trim(
          product_name_snapshot
        )
      ) > 0
    ),

  constraint waste_entries_category_name_snapshot_not_blank
    check (
      char_length(
        trim(
          category_name_snapshot
        )
      ) > 0
    )
);

-- =========================================================
-- INDEXES
-- =========================================================
--
-- Optimized for:
--
-- Location
-- Date range
-- Product
-- Reason
-- Reporting
-- PDF export
-- Chart aggregation
-- =========================================================

create index if not exists
waste_entries_location_id_idx
  on public.waste_entries (
    location_id
  );

create index if not exists
waste_entries_location_date_idx
  on public.waste_entries (
    location_id,
    waste_date desc
  );

create index if not exists
waste_entries_location_product_date_idx
  on public.waste_entries (
    location_id,
    product_id,
    waste_date desc
  );

create index if not exists
waste_entries_location_reason_date_idx
  on public.waste_entries (
    location_id,
    reason,
    waste_date desc
  );

create index if not exists
waste_entries_product_id_idx
  on public.waste_entries (
    product_id
  );

create index if not exists
waste_entries_product_name_idx
  on public.waste_entries (
    lower(
      product_name_snapshot
    )
  );

create index if not exists
waste_entries_sku_idx
  on public.waste_entries (
    lower(
      sku_snapshot
    )
  );

create index if not exists
waste_entries_created_at_idx
  on public.waste_entries (
    created_at desc
  );

-- =========================================================
-- PREPARE / PROTECT WASTE ENTRY
-- =========================================================
--
-- INSERT:
--
-- The Product database controls:
--
-- SKU
-- Product Name
-- Category Name
-- UOM
--
-- UPDATE:
--
-- If Product is changed:
--   → snapshots are regenerated from Product master.
--
-- If Product is unchanged:
--   → historical snapshots cannot be changed manually.
--
-- Location can never be moved after creation.
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
     and new.location_id is distinct from old.location_id then

    raise exception
      'Waste entry location cannot be changed after creation.';

  end if;

  -- =======================================================
  -- LOAD PRODUCT SNAPSHOT
  -- =======================================================
  --
  -- Run when:
  --
  -- INSERT
  -- OR Product is changed during Edit.
  -- =======================================================

  if tg_op = 'INSERT'
     or new.product_id is distinct from old.product_id then

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

    if resolved_product_active is not true then
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

    -- -----------------------------------------------------
    -- AUTHORITATIVE SNAPSHOTS
    -- -----------------------------------------------------

    new.sku_snapshot :=
      resolved_sku;

    new.product_name_snapshot :=
      resolved_product_name;

    new.category_name_snapshot :=
      resolved_category_name;

    new.uom_snapshot :=
      resolved_uom;

  else

    -- =====================================================
    -- HISTORICAL SNAPSHOT PROTECTION
    -- =====================================================
    --
    -- When editing Date / Qty / Reason, Product snapshots
    -- remain exactly as originally recorded.
    -- =====================================================

    if new.sku_snapshot
         is distinct from
         old.sku_snapshot

       or new.product_name_snapshot
         is distinct from
         old.product_name_snapshot

       or new.category_name_snapshot
         is distinct from
         old.category_name_snapshot

       or new.uom_snapshot
         is distinct from
         old.uom_snapshot then

      raise exception
        'Waste Product snapshot information cannot be edited manually.';

    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists
prepare_waste_entry
on public.waste_entries;

create trigger
prepare_waste_entry
before insert or update
on public.waste_entries
for each row
execute function public.prepare_waste_entry();

-- =========================================================
-- UPDATED_AT
-- =========================================================

drop trigger if exists
set_waste_entries_updated_at
on public.waste_entries;

create trigger
set_waste_entries_updated_at
before update
on public.waste_entries
for each row
execute function public.set_updated_at();

-- =========================================================
-- SAVE WASTE ENTRY
-- =========================================================
--
-- Atomic Create + Edit function.
--
-- p_waste_id:
--
-- NULL = Create
-- UUID = Update
--
-- Product snapshot values are intentionally NOT accepted as
-- function parameters.
--
-- They are always generated by prepare_waste_entry().
-- =========================================================

create or replace function public.save_waste_entry(
  p_location_id uuid,
  p_waste_id uuid,
  p_waste_date date,
  p_product_id uuid,
  p_qty numeric,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_waste_id uuid;
  resolved_date date;
  normalized_reason text;
begin

  -- =======================================================
  -- LOCATION
  -- =======================================================

  if p_location_id is null then
    raise exception
      'A valid operational location is required.';
  end if;

  if not exists (
    select 1
    from public.locations l
    where l.id =
      p_location_id
      and l.is_active =
        true
  ) then

    raise exception
      'The selected operational location is not available.';

  end if;

  -- =======================================================
  -- DATE
  -- =======================================================

  resolved_date :=
    coalesce(
      p_waste_date,
      current_date
    );

  if resolved_date <
       date '2000-01-01'

     or resolved_date >
       date '9999-12-31' then

    raise exception
      'Waste date must be between year 2000 and 9999.';

  end if;

  -- =======================================================
  -- PRODUCT
  -- =======================================================

  if p_product_id is null then
    raise exception
      'Select a valid Product.';
  end if;

  -- Product + Location + Active status is validated again by
  -- prepare_waste_entry() when inserting or changing Product.

  -- =======================================================
  -- QUANTITY
  -- =======================================================

  if p_qty is null
     or p_qty <= 0 then

    raise exception
      'Waste Qty must be greater than zero.';

  end if;

  if p_qty >
    99999999999999.9999 then

    raise exception
      'Waste Qty is outside the allowed range.';

  end if;

  -- =======================================================
  -- REASON
  -- =======================================================

  normalized_reason :=
    lower(
      trim(
        coalesce(
          p_reason,
          ''
        )
      )
    );

  normalized_reason :=
    regexp_replace(
      normalized_reason,
      '\s+',
      '_',
      'g'
    );

  if normalized_reason not in (
    'spoiled',
    'expired',
    'bad_quality',
    'guest_complaint'
  ) then

    raise exception
      'Select a valid Waste reason.';

  end if;

  -- =======================================================
  -- CREATE
  -- =======================================================

  if p_waste_id is null then

    insert into public.waste_entries (
      location_id,
      waste_date,
      product_id,
      qty,
      reason
    )
    values (
      p_location_id,
      resolved_date,
      p_product_id,
      round(
        p_qty,
        4
      ),
      normalized_reason
    )
    returning id
    into saved_waste_id;

  -- =======================================================
  -- UPDATE
  -- =======================================================

  else

    update public.waste_entries
    set
      waste_date =
        resolved_date,

      product_id =
        p_product_id,

      qty =
        round(
          p_qty,
          4
        ),

      reason =
        normalized_reason

    where id =
      p_waste_id

      and location_id =
        p_location_id

    returning id
    into saved_waste_id;

    if saved_waste_id is null then
      raise exception
        'Waste entry was not found for the current location.';
    end if;

  end if;

  return saved_waste_id;
end;
$$;

-- =========================================================
-- DELETE WASTE ENTRY
-- =========================================================

create or replace function public.delete_waste_entry(
  p_location_id uuid,
  p_waste_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_waste_id uuid;
begin

  if p_location_id is null then
    raise exception
      'A valid operational location is required.';
  end if;

  if p_waste_id is null then
    raise exception
      'A valid Waste entry is required.';
  end if;

  delete from public.waste_entries
  where id =
    p_waste_id

    and location_id =
      p_location_id

  returning id
  into deleted_waste_id;

  if deleted_waste_id is null then
    raise exception
      'Waste entry was not found for the current location.';
  end if;

  return deleted_waste_id;
end;
$$;

-- =========================================================
-- WASTE PERFORMANCE DATA
-- =========================================================
--
-- Server-side daily aggregation for the Waste Performance
-- line chart.
--
-- Important:
--
-- ml, gram and pc must NOT be mathematically added together.
--
-- Therefore results remain separated by UOM.
--
-- Example:
--
-- 2026-09-09 | ml   | 1200 | 3 entries
-- 2026-09-09 | gram |  500 | 2 entries
-- 2026-09-09 | pc   |    4 | 1 entry
--
-- The frontend can render one animated line per UOM.
-- =========================================================

create or replace function public.get_waste_performance(
  p_location_id uuid,
  p_date_from date,
  p_date_to date
)
returns table (
  waste_date date,
  uom text,
  total_qty numeric,
  entry_count bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_date_from date;
  resolved_date_to date;
begin

  -- =======================================================
  -- LOCATION
  -- =======================================================

  if p_location_id is null then
    raise exception
      'A valid operational location is required.';
  end if;

  if not exists (
    select 1
    from public.locations l
    where l.id =
      p_location_id
      and l.is_active =
        true
  ) then

    raise exception
      'The selected operational location is not available.';

  end if;

  -- =======================================================
  -- DATE RANGE
  -- =======================================================

  resolved_date_to :=
    coalesce(
      p_date_to,
      current_date
    );

  resolved_date_from :=
    coalesce(
      p_date_from,
      resolved_date_to -
        29
    );

  if resolved_date_from >
     resolved_date_to then

    raise exception
      'Waste Date From cannot be later than Date To.';

  end if;

  -- =======================================================
  -- AGGREGATE
  -- =======================================================

  return query

  select
    we.waste_date,

    we.uom_snapshot
      as uom,

    round(
      sum(
        we.qty
      ),
      4
    )
      as total_qty,

    count(*)::bigint
      as entry_count

  from public.waste_entries we

  where we.location_id =
    p_location_id

    and we.waste_date >=
      resolved_date_from

    and we.waste_date <=
      resolved_date_to

  group by
    we.waste_date,
    we.uom_snapshot

  order by
    we.waste_date asc,
    we.uom_snapshot asc;

end;
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
--
-- Order Me uses:
--
-- Signed operational session
--        ↓
-- Trusted server-side location
--        ↓
-- Admin/service-role database client
--
-- No browser-facing Waste policies are created.
-- =========================================================

alter table public.waste_entries
enable row level security;

-- =========================================================
-- DIRECT TABLE ACCESS
-- =========================================================

revoke all
on table public.waste_entries
from anon;

revoke all
on table public.waste_entries
from authenticated;

grant all
on table public.waste_entries
to service_role;

-- =========================================================
-- FUNCTION SECURITY
-- =========================================================

revoke all
on function public.save_waste_entry(
  uuid,
  uuid,
  date,
  uuid,
  numeric,
  text
)
from public;

revoke all
on function public.save_waste_entry(
  uuid,
  uuid,
  date,
  uuid,
  numeric,
  text
)
from anon;

revoke all
on function public.save_waste_entry(
  uuid,
  uuid,
  date,
  uuid,
  numeric,
  text
)
from authenticated;

grant execute
on function public.save_waste_entry(
  uuid,
  uuid,
  date,
  uuid,
  numeric,
  text
)
to service_role;


revoke all
on function public.delete_waste_entry(
  uuid,
  uuid
)
from public;

revoke all
on function public.delete_waste_entry(
  uuid,
  uuid
)
from anon;

revoke all
on function public.delete_waste_entry(
  uuid,
  uuid
)
from authenticated;

grant execute
on function public.delete_waste_entry(
  uuid,
  uuid
)
to service_role;


revoke all
on function public.get_waste_performance(
  uuid,
  date,
  date
)
from public;

revoke all
on function public.get_waste_performance(
  uuid,
  date,
  date
)
from anon;

revoke all
on function public.get_waste_performance(
  uuid,
  date,
  date
)
from authenticated;

grant execute
on function public.get_waste_performance(
  uuid,
  date,
  date
)
to service_role;

commit;
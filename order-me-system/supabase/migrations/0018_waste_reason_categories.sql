-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Waste Data Module
-- Migration: 0018_waste_reason_categories.sql
--
-- Standardized Waste Reason Categories
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- WASTE REASON DATABASE CONSTRAINT
-- =========================================================
--
-- ACTIVE STANDARDIZED REASONS
--
-- spoilage
-- expired
-- preparation_waste
-- excessive_trimming
-- overproduction
-- cooking_error
-- wrong_order
-- damage
-- plate_waste
-- staff_meal
--
-- LEGACY REASONS
--
-- spoiled
-- bad_quality
-- guest_complaint
--
-- Legacy values remain permitted at the table constraint
-- level so existing historical Waste records remain valid.
--
-- New and edited records are restricted to the active
-- standardized reasons by save_waste_entry().
-- =========================================================

alter table public.waste_entries
drop constraint if exists
waste_entries_reason_allowed;

alter table public.waste_entries
add constraint waste_entries_reason_allowed
check (
  reason in (
    -- -----------------------------------------------------
    -- ACTIVE STANDARDIZED REASONS
    -- -----------------------------------------------------

    'spoilage',
    'expired',
    'preparation_waste',
    'excessive_trimming',
    'overproduction',
    'cooking_error',
    'wrong_order',
    'damage',
    'plate_waste',
    'staff_meal',

    -- -----------------------------------------------------
    -- LEGACY HISTORICAL REASONS
    -- -----------------------------------------------------

    'spoiled',
    'bad_quality',
    'guest_complaint'
  )
);

-- =========================================================
-- SAVE WASTE ENTRY
-- =========================================================
--
-- Replace only the Waste Reason validation inside the
-- existing commercial-grade save function.
--
-- All existing behavior remains unchanged:
--
-- Trusted location validation
-- Date validation
-- Product validation
-- Quantity validation
-- Product snapshot generation
-- Location-scoped update protection
-- Atomic create/edit
--
-- Only the accepted reason list changes.
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

  -- Product + Location + Active status continues to be
  -- validated by prepare_waste_entry() when inserting or
  -- when changing Product during Edit.

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
  --
  -- Application writes are restricted to the standardized
  -- active Waste reason categories.
  --
  -- Historical legacy values remain readable in the table,
  -- but cannot be assigned to new or edited records.
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
    'spoilage',
    'expired',
    'preparation_waste',
    'excessive_trimming',
    'overproduction',
    'cooking_error',
    'wrong_order',
    'damage',
    'plate_waste',
    'staff_meal'
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
-- FUNCTION SECURITY
-- =========================================================
--
-- Preserve the same server-only execution model established
-- by 0016_waste_data.sql.
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

commit;
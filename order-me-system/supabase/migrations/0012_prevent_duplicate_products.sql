-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Prevent Duplicate Products
-- Migration: 0012_prevent_duplicate_products.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================
--
-- PURPOSE
--
-- Prevent duplicate Product names inside the same location.
--
-- Examples:
--
-- FORZA
--
--   Tomato
--   tomato
--   TOMATO
--   " Tomato "
--
-- These represent the same Product and must not coexist.
--
-- FUSION may still independently contain:
--
--   Tomato
--
-- because Product uniqueness is location scoped.
--
-- =========================================================

begin;

-- =========================================================
-- PRE-MIGRATION DUPLICATE SAFETY CHECK
-- =========================================================
--
-- IMPORTANT:
--
-- Existing duplicate records are NOT:
--
--   deleted
--   renamed
--   merged
--   modified
--
-- If duplicates already exist, the migration stops and
-- reports the duplicate so the data can be reviewed safely
-- before creating the unique index.
--
-- =========================================================

do $$
declare
  duplicate_record record;
begin
  select
    duplicate_rows.location_id,
    location.code as location_code,
    location.name as location_name,
    duplicate_rows.normalized_name,
    duplicate_rows.duplicate_count
  into
    duplicate_record
  from (
    select
      product.location_id,
      lower(
        btrim(
          product.name
        )
      ) as normalized_name,
      count(*) as duplicate_count
    from public.products as product
    group by
      product.location_id,
      lower(
        btrim(
          product.name
        )
      )
    having
      count(*) > 1
  ) as duplicate_rows
  left join public.locations as location
    on location.id =
      duplicate_rows.location_id
  order by
    duplicate_rows.duplicate_count desc,
    duplicate_rows.normalized_name asc
  limit 1;

  if found then
    raise exception
      using
        message =
          'Duplicate Product names already exist. Unique Product protection cannot be enabled yet.',
        detail =
          format(
            'Location: %s (%s), Product: "%s", Duplicate count: %s.',
            coalesce(
              duplicate_record.location_name,
              'Unknown Location'
            ),
            coalesce(
              duplicate_record.location_code,
              'UNKNOWN'
            ),
            duplicate_record.normalized_name,
            duplicate_record.duplicate_count
          ),
        hint =
          'Review and resolve the existing duplicate Product records, then run the migration again.';
  end if;
end
$$;

-- =========================================================
-- LOCATION-SCOPED PRODUCT NAME UNIQUENESS
-- =========================================================
--
-- Product uniqueness rule:
--
--   location_id
--       +
--   lower(trim(name))
--
-- Examples:
--
-- FORZA
--
--   Tomato
--   tomato
--
--   REJECTED
--
-- FORZA
--   Tomato
--
-- FUSION
--   Tomato
--
--   ALLOWED
--
-- Product names created through the application are already
-- normalized before insert/update:
--
--   leading whitespace removed
--   trailing whitespace removed
--   repeated internal whitespace collapsed
--
-- The database index provides the final concurrency-safe
-- protection.
--
-- =========================================================

create unique index if not exists
  products_location_name_unique_ci
on public.products (
  location_id,
  lower(
    btrim(
      name
    )
  )
);

commit;
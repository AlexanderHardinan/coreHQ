begin;

-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- PRODUCT PACKAGING UOM EXTENSION
-- =========================================================
--
-- Existing allowed values:
--   bottle
--   box
--   pack
--   can
--
-- New allowed values:
--   kilo
--   liter
--
-- Final allowed values:
--   bottle
--   box
--   pack
--   can
--   kilo
--   liter
--
-- This migration does not modify:
--   product UOM
--   SKU generation
--   categories
--   quantities
--   location isolation
--   product identity
--   existing product records
-- =========================================================

-- =========================================================
-- REMOVE EXISTING PACKAGING_UOM CHECK CONSTRAINT
-- =========================================================
--
-- We deliberately locate the existing CHECK constraint by
-- its definition instead of assuming its historical name.
-- This keeps the migration safe if PostgreSQL generated the
-- original constraint name automatically.
-- =========================================================

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      c.conname
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where
      n.nspname = 'public'
      and t.relname = 'products'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%packaging_uom%'
  loop
    execute format(
      'alter table public.products drop constraint %I',
      constraint_record.conname
    );
  end loop;
end
$$;

-- =========================================================
-- ADD UPDATED PACKAGING UOM CONSTRAINT
-- =========================================================

alter table public.products
  add constraint products_packaging_uom_check
  check (
    packaging_uom in (
      'bottle',
      'box',
      'pack',
      'can',
      'kilo',
      'liter'
    )
  );

commit;
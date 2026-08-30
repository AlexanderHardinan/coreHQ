begin;

-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- PRODUCT PACKAGING UOM EXTENSION
-- ADD: tray
-- =========================================================
--
-- Existing allowed values:
--   bottle
--   box
--   pack
--   can
--   kilo
--   liter
--
-- New allowed value:
--   tray
--
-- Final allowed values:
--   bottle
--   box
--   pack
--   can
--   kilo
--   liter
--   tray
--
-- This migration does not modify:
--   Product base UOM
--   SKU generation
--   Product names
--   Categories
--   Quantities
--   Location isolation
--   Existing product records
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

alter table public.products
  add constraint products_packaging_uom_check
  check (
    packaging_uom in (
      'bottle',
      'box',
      'pack',
      'can',
      'kilo',
      'liter',
      'tray'
    )
  );

commit;
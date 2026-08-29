-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 4 — Production Recipes
-- Migration: 0008_recipe_transactions.sql
--
-- Atomic production recipe create / update
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- SAVE PRODUCTION RECIPE
-- =========================================================
--
-- Creates or updates:
--
--   production_recipes
--        +
--   production_recipe_items
--
-- inside one PostgreSQL transaction.
--
-- If ANY validation or ingredient insert fails, the entire
-- operation is rolled back automatically.
--
-- p_recipe_id:
--
--   NULL     = create recipe
--   UUID     = update existing recipe
--
-- p_items JSONB example:
--
-- [
--   {
--     "product_id": "uuid",
--     "qty": "2000",
--     "uom": "ml"
--   },
--   {
--     "product_id": "uuid",
--     "qty": "800",
--     "uom": "gram"
--   }
-- ]
--
-- sort_order is generated automatically from array order.
-- =========================================================

create or replace function public.save_production_recipe(
  p_location_id uuid,
  p_recipe_id uuid,
  p_name text,
  p_batch_qty numeric,
  p_yield_qty numeric,
  p_yield_uom text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_recipe_id uuid;
  normalized_name text;
begin

  -- =======================================================
  -- LOCATION VALIDATION
  -- =======================================================

  if p_location_id is null then
    raise exception
      'A valid operational location is required.';
  end if;

  if not exists (
    select 1
    from public.locations l
    where l.id = p_location_id
      and l.is_active = true
  ) then
    raise exception
      'The selected operational location is not available.';
  end if;

  -- =======================================================
  -- RECIPE NAME
  -- =======================================================

  normalized_name :=
    regexp_replace(
      trim(coalesce(p_name, '')),
      '\s+',
      ' ',
      'g'
    );

  if normalized_name = '' then
    raise exception
      'Recipe name is required.';
  end if;

  if char_length(normalized_name) > 200 then
    raise exception
      'Recipe name must not exceed 200 characters.';
  end if;

  -- =======================================================
  -- BATCH QTY
  -- =======================================================

  if p_batch_qty is null
     or p_batch_qty <= 0
     or p_batch_qty > 99999999999999.9999 then

    raise exception
      'Batch QTY must be greater than zero and within the allowed range.';

  end if;

  -- =======================================================
  -- YIELD QTY
  -- =======================================================

  if p_yield_qty is null
     or p_yield_qty <= 0
     or p_yield_qty > 99999999999999.9999 then

    raise exception
      'Yield QTY must be greater than zero and within the allowed range.';

  end if;

  -- =======================================================
  -- YIELD UOM
  -- =======================================================

  if p_yield_uom is null
     or p_yield_uom not in (
       'ml',
       'pc',
       'gram'
     ) then

    raise exception
      'Yield UOM must be ml, pc, or gram.';

  end if;

  -- =======================================================
  -- INGREDIENT ARRAY
  -- =======================================================

  if p_items is null
     or jsonb_typeof(p_items) <> 'array' then

    raise exception
      'Recipe ingredients must be provided as an array.';

  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception
      'A production recipe must contain at least one ingredient.';
  end if;

  -- =======================================================
  -- INGREDIENT STRUCTURE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where jsonb_typeof(ingredient.value) <> 'object'
  ) then

    raise exception
      'Every recipe ingredient must contain valid product, quantity, and UOM information.';

  end if;

  -- =======================================================
  -- REQUIRED INGREDIENT FIELDS
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where nullif(
      trim(
        ingredient.value ->> 'product_id'
      ),
      ''
    ) is null
    or nullif(
      trim(
        ingredient.value ->> 'qty'
      ),
      ''
    ) is null
    or nullif(
      trim(
        ingredient.value ->> 'uom'
      ),
      ''
    ) is null
  ) then

    raise exception
      'Every recipe ingredient requires Product, Qty, and UOM.';

  end if;

  -- =======================================================
  -- VALIDATE INGREDIENT UUID FORMAT
  -- =======================================================
  --
  -- Validate text before casting to UUID so malformed browser
  -- input cannot produce an uncontrolled UUID cast error.
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where (
      ingredient.value ->> 'product_id'
    ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then

    raise exception
      'One or more recipe ingredients contain an invalid product identifier.';

  end if;

  -- =======================================================
  -- VALIDATE INGREDIENT QUANTITY FORMAT
  -- =======================================================
  --
  -- numeric(18,4)
  --
  -- Supports:
  --
  -- 0.5
  -- 1
  -- 1.25
  -- 250
  -- 1250.7500
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where (
      ingredient.value ->> 'qty'
    ) !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'Ingredient quantities must be valid positive numbers with up to 4 decimal places.';

  end if;

  -- =======================================================
  -- VALIDATE INGREDIENT QUANTITY RANGE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where (
      ingredient.value ->> 'qty'
    )::numeric <= 0
    or (
      ingredient.value ->> 'qty'
    )::numeric > 99999999999999.9999
  ) then

    raise exception
      'Ingredient quantities must be greater than zero and within the allowed range.';

  end if;

  -- =======================================================
  -- VALIDATE INGREDIENT UOM
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    where (
      ingredient.value ->> 'uom'
    ) not in (
      'ml',
      'pc',
      'gram'
    )
  ) then

    raise exception
      'Ingredient UOM must be ml, pc, or gram.';

  end if;

  -- =======================================================
  -- DUPLICATE PRODUCT PROTECTION
  -- =======================================================

  if exists (
    select
      (
        ingredient.value ->> 'product_id'
      )::uuid
    from jsonb_array_elements(p_items) as ingredient(value)
    group by
      (
        ingredient.value ->> 'product_id'
      )::uuid
    having count(*) > 1
  ) then

    raise exception
      'The same product cannot appear more than once in a production recipe.';

  end if;

  -- =======================================================
  -- PRODUCT LOCATION + ACTIVE + UOM VALIDATION
  -- =======================================================
  --
  -- Application validation will also perform these checks,
  -- but the transaction independently validates the master
  -- data before saving.
  --
  -- Database triggers remain the final protection layer.
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    left join public.products p
      on p.id = (
        ingredient.value ->> 'product_id'
      )::uuid
     and p.location_id = p_location_id
    where p.id is null
  ) then

    raise exception
      'One or more ingredient products do not belong to the current location.';

  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    join public.products p
      on p.id = (
        ingredient.value ->> 'product_id'
      )::uuid
     and p.location_id = p_location_id
    where p.is_active is not true
  ) then

    raise exception
      'Inactive products cannot be used as recipe ingredients.';

  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as ingredient(value)
    join public.products p
      on p.id = (
        ingredient.value ->> 'product_id'
      )::uuid
     and p.location_id = p_location_id
    where p.uom <>
      (
        ingredient.value ->> 'uom'
      )
  ) then

    raise exception
      'Ingredient UOM must match the selected product UOM.';

  end if;

  -- =======================================================
  -- CREATE MODE
  -- =======================================================

  if p_recipe_id is null then

    insert into public.production_recipes (
      location_id,
      name,
      batch_qty,
      yield_qty,
      yield_uom,
      is_active
    )
    values (
      p_location_id,
      normalized_name,
      p_batch_qty,
      p_yield_qty,
      p_yield_uom,
      true
    )
    returning id
    into saved_recipe_id;

  -- =======================================================
  -- UPDATE MODE
  -- =======================================================

  else

    update public.production_recipes
    set
      name = normalized_name,
      batch_qty = p_batch_qty,
      yield_qty = p_yield_qty,
      yield_uom = p_yield_uom
    where id = p_recipe_id
      and location_id = p_location_id
    returning id
    into saved_recipe_id;

    if saved_recipe_id is null then
      raise exception
        'Production recipe was not found for the current location.';
    end if;

    -- =====================================================
    -- REPLACE INGREDIENT SET
    -- =====================================================
    --
    -- This DELETE is inside the same PostgreSQL transaction.
    --
    -- If any new ingredient fails to insert, PostgreSQL
    -- restores the original ingredient set automatically.
    -- =====================================================

    delete from public.production_recipe_items
    where recipe_id = saved_recipe_id
      and location_id = p_location_id;

  end if;

  -- =======================================================
  -- INSERT INGREDIENTS
  -- =======================================================
  --
  -- JSON array order becomes sort_order:
  --
  -- first row  = 0
  -- second row = 1
  -- third row  = 2
  -- =======================================================

  insert into public.production_recipe_items (
    location_id,
    recipe_id,
    product_id,
    qty,
    uom,
    sort_order
  )
  select
    p_location_id,

    saved_recipe_id,

    (
      ingredient.value ->> 'product_id'
    )::uuid,

    (
      ingredient.value ->> 'qty'
    )::numeric,

    ingredient.value ->> 'uom',

    (
      ingredient.ordinality - 1
    )::integer

  from jsonb_array_elements(
    p_items
  )
  with ordinality
  as ingredient(
    value,
    ordinality
  )

  order by
    ingredient.ordinality;

  -- =======================================================
  -- RETURN SAVED RECIPE UUID
  -- =======================================================

  return saved_recipe_id;

end;
$$;

-- =========================================================
-- FUNCTION PERMISSIONS
-- =========================================================
--
-- This function is NEVER exposed to browser-facing anon or
-- authenticated Supabase clients.
--
-- Order Me calls it only through the protected server-side
-- secret/service-role client after validating the custom
-- application session and operational location.
-- =========================================================

revoke all
on function public.save_production_recipe(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  jsonb
)
from public;

revoke all
on function public.save_production_recipe(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  jsonb
)
from anon;

revoke all
on function public.save_production_recipe(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  jsonb
)
from authenticated;

grant execute
on function public.save_production_recipe(
  uuid,
  uuid,
  text,
  numeric,
  numeric,
  text,
  jsonb
)
to service_role;

commit;
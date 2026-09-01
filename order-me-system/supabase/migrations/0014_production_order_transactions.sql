-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 8 — Batch Production Orders
-- Migration: 0014_production_order_transactions.sql
--
-- Atomic Production Order create / update
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- SAVE PRODUCTION ORDER
-- =========================================================
--
-- Creates or updates:
--
--   production_orders
--        +
--   production_order_recipes
--        +
--   production_order_recipe_items
--        +
--   production_order_items
--
-- inside ONE PostgreSQL transaction.
--
-- Existing triggers/functions from:
--
--   0006_production_orders.sql
--
-- remain authoritative for:
--
--   Order Number
--   Recipe Snapshots
--   Yield Multiplier
--   Ingredient Snapshot
--   Required Ingredient Qty
--   Ingredient Consolidation
--   Requested Qty
--
-- The application supplies only:
--
--   Order Date
--   Ordered By
--   Status
--   Recipe IDs
--   Required Yield
--   On Hand Qty
--
-- Nothing else is trusted from the browser.
--
-- p_order_id:
--
--   NULL = create new production order
--   UUID = update existing production order
--
-- p_recipes JSON format:
--
-- [
--   {
--     "recipe_id": "uuid",
--     "required_yield_qty": "10000"
--   },
--   {
--     "recipe_id": "uuid",
--     "required_yield_qty": "5000.5"
--   }
-- ]
--
-- p_on_hand_items JSON format:
--
-- [
--   {
--     "product_id": "uuid",
--     "on_hand_qty": "1500"
--   },
--   {
--     "product_id": "uuid",
--     "on_hand_qty": "0"
--   }
-- ]
--
-- IMPORTANT:
--
-- The browser/application does NOT supply:
--
--   order_number
--   recipe_name_snapshot
--   batch_qty_snapshot
--   base_yield_qty_snapshot
--   yield_uom_snapshot
--   yield_multiplier
--   ingredient SKU
--   ingredient name
--   category name
--   ingredient UOM
--   base_qty_snapshot
--   required_qty
--   requested_qty
--
-- Those remain completely database controlled.
-- =========================================================

create or replace function public.save_production_order(
  p_location_id uuid,
  p_order_id uuid,
  p_order_date date,
  p_ordered_by text,
  p_status text,
  p_recipes jsonb,
  p_on_hand_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_order_id uuid;
  normalized_ordered_by text;
  normalized_status text;
  resolved_order_date date;
  selected_year integer;
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
    where l.id = p_location_id
      and l.is_active = true
  ) then
    raise exception
      'The selected operational location is not available.';
  end if;

  -- =======================================================
  -- ORDER DATE
  -- =======================================================

  resolved_order_date :=
    coalesce(
      p_order_date,
      current_date
    );

  selected_year :=
    extract(
      year from resolved_order_date
    )::integer;

  if selected_year < 2000
     or selected_year > 9999 then

    raise exception
      'Order date must be between year 2000 and 9999.';

  end if;

  -- =======================================================
  -- ORDERED BY
  -- =======================================================

  normalized_ordered_by :=
    regexp_replace(
      trim(
        coalesce(
          p_ordered_by,
          ''
        )
      ),
      '\s+',
      ' ',
      'g'
    );

  if normalized_ordered_by = '' then
    raise exception
      'Ordered By is required.';
  end if;

  if char_length(
    normalized_ordered_by
  ) > 200 then

    raise exception
      'Ordered By must not exceed 200 characters.';

  end if;

  -- =======================================================
  -- STATUS
  -- =======================================================

  normalized_status :=
    lower(
      trim(
        coalesce(
          p_status,
          'draft'
        )
      )
    );

  if normalized_status not in (
    'draft',
    'submitted',
    'completed',
    'cancelled'
  ) then

    raise exception
      'Production order status must be draft, submitted, completed, or cancelled.';

  end if;

  -- =======================================================
  -- EXISTING ORDER VALIDATION
  -- =======================================================

  if p_order_id is not null
     and not exists (
       select 1
       from public.production_orders po
       where po.id = p_order_id
         and po.location_id = p_location_id
     ) then

    raise exception
      'Production order was not found for the current location.';

  end if;

  -- =======================================================
  -- RECIPE ARRAY
  -- =======================================================

  if p_recipes is null
     or jsonb_typeof(
       p_recipes
     ) <> 'array' then

    raise exception
      'Production order recipes must be provided as an array.';

  end if;

  if jsonb_array_length(
    p_recipes
  ) = 0 then

    raise exception
      'A production order must contain at least one recipe.';

  end if;

  -- =======================================================
  -- RECIPE OBJECT STRUCTURE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)
    where jsonb_typeof(
      recipe.value
    ) <> 'object'
  ) then

    raise exception
      'Every production order recipe must contain valid recipe and yield information.';

  end if;

  -- =======================================================
  -- REQUIRED RECIPE FIELDS
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)
    where
      nullif(
        trim(
          recipe.value ->> 'recipe_id'
        ),
        ''
      ) is null

      or

      nullif(
        trim(
          recipe.value ->> 'required_yield_qty'
        ),
        ''
      ) is null
  ) then

    raise exception
      'Every production order recipe requires Recipe and Required Yield.';

  end if;

  -- =======================================================
  -- RECIPE UUID FORMAT
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)
    where (
      recipe.value ->> 'recipe_id'
    ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then

    raise exception
      'One or more production recipes contain an invalid recipe identifier.';

  end if;

  -- =======================================================
  -- REQUIRED YIELD FORMAT
  -- =======================================================
  --
  -- production_order_recipes.required_yield_qty:
  --
  -- numeric(18,4)
  --
  -- Must be greater than zero.
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)
    where (
      recipe.value ->> 'required_yield_qty'
    ) !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'Required Yield must be a valid positive number with up to 4 decimal places.';

  end if;

  -- =======================================================
  -- REQUIRED YIELD RANGE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)
    where (
      recipe.value ->> 'required_yield_qty'
    )::numeric <= 0

    or

    (
      recipe.value ->> 'required_yield_qty'
    )::numeric >
      99999999999999.9999
  ) then

    raise exception
      'Required Yield is outside the allowed range.';

  end if;

  -- =======================================================
  -- DUPLICATE RECIPE PROTECTION
  -- =======================================================

  if exists (
    select
      (
        recipe.value ->> 'recipe_id'
      )::uuid

    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)

    group by
      (
        recipe.value ->> 'recipe_id'
      )::uuid

    having count(*) > 1
  ) then

    raise exception
      'The same production recipe cannot appear more than once in a production order.';

  end if;

  -- =======================================================
  -- RECIPE LOCATION VALIDATION
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)

    left join public.production_recipes r
      on r.id = (
        recipe.value ->> 'recipe_id'
      )::uuid

     and r.location_id =
       p_location_id

    where r.id is null
  ) then

    raise exception
      'One or more selected production recipes do not belong to the current location.';

  end if;

  -- =======================================================
  -- RECIPE ACTIVE VALIDATION
  -- =======================================================
  --
  -- New recipes added to an order must be active.
  --
  -- An existing historical order may still retain a recipe
  -- that was active when originally selected but has since
  -- been deactivated in the master recipe database.
  --
  -- This preserves historical order editability.
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_recipes
    ) as recipe(value)

    inner join public.production_recipes r
      on r.id = (
        recipe.value ->> 'recipe_id'
      )::uuid

     and r.location_id =
       p_location_id

    where r.is_active is not true

      and (
        p_order_id is null

        or

        not exists (
          select 1

          from public.production_order_recipes por

          where por.order_id =
            p_order_id

            and por.location_id =
              p_location_id

            and por.recipe_id =
              r.id
        )
      )
  ) then

    raise exception
      'Inactive production recipes cannot be added to a production order.';

  end if;

  -- =======================================================
  -- ON HAND ARRAY
  -- =======================================================

  if p_on_hand_items is null
     or jsonb_typeof(
       p_on_hand_items
     ) <> 'array' then

    raise exception
      'Production order ingredient On Hand quantities must be provided as an array.';

  end if;

  if jsonb_array_length(
    p_on_hand_items
  ) = 0 then

    raise exception
      'On Hand Qty is required for every production order ingredient.';

  end if;

  -- =======================================================
  -- ON HAND OBJECT STRUCTURE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)
    where jsonb_typeof(
      item.value
    ) <> 'object'
  ) then

    raise exception
      'Every production order ingredient must contain valid product and On Hand quantity information.';

  end if;

  -- =======================================================
  -- REQUIRED ON HAND FIELDS
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)
    where
      nullif(
        trim(
          item.value ->> 'product_id'
        ),
        ''
      ) is null

      or

      nullif(
        trim(
          item.value ->> 'on_hand_qty'
        ),
        ''
      ) is null
  ) then

    raise exception
      'Every production order ingredient requires Product and On Hand Qty.';

  end if;

  -- =======================================================
  -- PRODUCT UUID FORMAT
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)
    where (
      item.value ->> 'product_id'
    ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then

    raise exception
      'One or more production order ingredients contain an invalid product identifier.';

  end if;

  -- =======================================================
  -- ON HAND QTY FORMAT
  -- =======================================================
  --
  -- production_order_items.on_hand_qty:
  --
  -- numeric(18,4)
  --
  -- Zero is allowed.
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)
    where (
      item.value ->> 'on_hand_qty'
    ) !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'On Hand Qty must be a valid non-negative number with up to 4 decimal places.';

  end if;

  -- =======================================================
  -- ON HAND RANGE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)
    where (
      item.value ->> 'on_hand_qty'
    )::numeric < 0

    or

    (
      item.value ->> 'on_hand_qty'
    )::numeric >
      99999999999999.9999
  ) then

    raise exception
      'On Hand Qty is outside the allowed range.';

  end if;

  -- =======================================================
  -- DUPLICATE ON HAND PRODUCT PROTECTION
  -- =======================================================

  if exists (
    select
      (
        item.value ->> 'product_id'
      )::uuid

    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)

    group by
      (
        item.value ->> 'product_id'
      )::uuid

    having count(*) > 1
  ) then

    raise exception
      'The same consolidated ingredient cannot appear more than once in the On Hand list.';

  end if;

  -- =======================================================
  -- CREATE ORDER
  -- =======================================================
  --
  -- order_number is deliberately omitted.
  --
  -- Existing trigger:
  --
  --   generate_production_order_number
  --
  -- generates:
  --
  --   FOR-PO-2026-000001
  --   FUS-PO-2026-000001
  -- =======================================================

  if p_order_id is null then

    insert into public.production_orders (
      location_id,
      order_date,
      ordered_by,
      status
    )
    values (
      p_location_id,
      resolved_order_date,
      normalized_ordered_by,
      normalized_status
    )
    returning id
    into saved_order_id;

  -- =======================================================
  -- UPDATE ORDER
  -- =======================================================

  else

    update public.production_orders
    set
      order_date =
        resolved_order_date,

      ordered_by =
        normalized_ordered_by,

      status =
        normalized_status

    where id =
      p_order_id

      and location_id =
        p_location_id

    returning id
    into saved_order_id;

    if saved_order_id is null then
      raise exception
        'Production order was not found for the current location.';
    end if;

  end if;

  -- =======================================================
  -- UPDATE EXISTING SELECTED RECIPES
  -- =======================================================
  --
  -- Existing snapshot fields are intentionally preserved.
  --
  -- Only:
  --
  --   required_yield_qty
  --   sort_order
  --
  -- may change.
  --
  -- Updating required_yield_qty activates the existing:
  --
  --   recalculate_production_order_recipe_items
  --
  -- trigger.
  -- =======================================================

  update public.production_order_recipes por
  set
    required_yield_qty =
      (
        recipe.value ->> 'required_yield_qty'
      )::numeric,

    sort_order =
      (
        recipe.ordinality - 1
      )::integer

  from jsonb_array_elements(
    p_recipes
  )
  with ordinality
  as recipe(
    value,
    ordinality
  )

  where por.order_id =
    saved_order_id

    and por.location_id =
      p_location_id

    and por.recipe_id =
      (
        recipe.value ->> 'recipe_id'
      )::uuid;

  -- =======================================================
  -- REMOVE RECIPES NO LONGER SELECTED
  -- =======================================================
  --
  -- Existing cascade and refresh triggers remove their
  -- historical ingredient rows and refresh the consolidated
  -- production order ingredient summary.
  -- =======================================================

  delete from public.production_order_recipes por

  where por.order_id =
    saved_order_id

    and por.location_id =
      p_location_id

    and not exists (
      select 1

      from jsonb_array_elements(
        p_recipes
      ) as recipe(value)

      where (
        recipe.value ->> 'recipe_id'
      )::uuid =
        por.recipe_id
    );

  -- =======================================================
  -- INSERT NEWLY SELECTED RECIPES
  -- =======================================================
  --
  -- We intentionally provide only:
  --
  --   location_id
  --   order_id
  --   recipe_id
  --   required_yield_qty
  --   sort_order
  --
  -- Existing BEFORE / AFTER INSERT triggers populate:
  --
  --   recipe snapshots
  --   yield multiplier
  --   ingredient snapshots
  --   scaled required quantities
  --   consolidated production order items
  -- =======================================================

  insert into public.production_order_recipes (
    location_id,
    order_id,
    recipe_id,
    required_yield_qty,
    sort_order
  )
  select
    p_location_id,

    saved_order_id,

    (
      recipe.value ->> 'recipe_id'
    )::uuid,

    (
      recipe.value ->> 'required_yield_qty'
    )::numeric,

    (
      recipe.ordinality - 1
    )::integer

  from jsonb_array_elements(
    p_recipes
  )
  with ordinality
  as recipe(
    value,
    ordinality
  )

  where not exists (
    select 1

    from public.production_order_recipes por

    where por.order_id =
      saved_order_id

      and por.location_id =
        p_location_id

      and por.recipe_id =
        (
          recipe.value ->> 'recipe_id'
        )::uuid
  )

  order by
    recipe.ordinality;

  -- =======================================================
  -- FINAL CONSOLIDATED INGREDIENT REFRESH
  -- =======================================================
  --
  -- Triggers already refresh during recipe changes.
  --
  -- This explicit final refresh guarantees the consolidated
  -- table represents the complete final recipe set before
  -- On Hand quantities are validated and written.
  -- =======================================================

  perform public.refresh_production_order_items(
    saved_order_id
  );

  -- =======================================================
  -- ON HAND PRODUCT VALIDATION
  -- =======================================================
  --
  -- Every Product ID supplied by the application must now
  -- exist in the database-generated consolidated ingredient
  -- set for this specific order and location.
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_on_hand_items
    ) as item(value)

    left join public.production_order_items poi
      on poi.order_id =
        saved_order_id

     and poi.location_id =
       p_location_id

     and poi.product_id =
       (
         item.value ->> 'product_id'
       )::uuid

    where poi.id is null
  ) then

    raise exception
      'One or more On Hand ingredients do not belong to the calculated production order.';

  end if;

  -- =======================================================
  -- COMPLETE ON HAND SET VALIDATION
  -- =======================================================
  --
  -- The application must provide an On Hand quantity,
  -- including zero, for EVERY consolidated ingredient.
  --
  -- This prevents an old quantity from surviving unnoticed
  -- when an existing order is edited.
  -- =======================================================

  if exists (
    select 1

    from public.production_order_items poi

    where poi.order_id =
      saved_order_id

      and poi.location_id =
        p_location_id

      and not exists (
        select 1

        from jsonb_array_elements(
          p_on_hand_items
        ) as item(value)

        where (
          item.value ->> 'product_id'
        )::uuid =
          poi.product_id
      )
  ) then

    raise exception
      'On Hand Qty is required for every calculated production order ingredient.';

  end if;

  -- =======================================================
  -- UPDATE ON HAND QTY
  -- =======================================================
  --
  -- This is the ONLY user-entered value written directly
  -- into production_order_items.
  --
  -- requested_qty remains generated by PostgreSQL:
  --
  --   MAX(required_qty - on_hand_qty, 0)
  -- =======================================================

  update public.production_order_items poi
  set
    on_hand_qty =
      (
        item.value ->> 'on_hand_qty'
      )::numeric

  from jsonb_array_elements(
    p_on_hand_items
  ) as item(value)

  where poi.order_id =
    saved_order_id

    and poi.location_id =
      p_location_id

    and poi.product_id =
      (
        item.value ->> 'product_id'
      )::uuid;

  -- =======================================================
  -- FINAL SAFETY CHECK
  -- =======================================================

  if not exists (
    select 1

    from public.production_order_recipes por

    where por.order_id =
      saved_order_id

      and por.location_id =
        p_location_id
  ) then

    raise exception
      'A production order must contain at least one production recipe.';

  end if;

  if not exists (
    select 1

    from public.production_order_items poi

    where poi.order_id =
      saved_order_id

      and poi.location_id =
        p_location_id
  ) then

    raise exception
      'A production order must contain at least one calculated ingredient.';

  end if;

  -- =======================================================
  -- RETURN ORDER UUID
  -- =======================================================

  return saved_order_id;

end;
$$;

-- =========================================================
-- PERMISSIONS
-- =========================================================
--
-- Browser-facing Supabase clients cannot execute this RPC.
--
-- Order Me calls this function only through:
--
-- secure server action
--        ↓
-- verified application session
--        ↓
-- signed operational location
--        ↓
-- server-side Supabase secret/service role client
-- =========================================================

revoke all
on function public.save_production_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb,
  jsonb
)
from public;

revoke all
on function public.save_production_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb,
  jsonb
)
from anon;

revoke all
on function public.save_production_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb,
  jsonb
)
from authenticated;

grant execute
on function public.save_production_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb,
  jsonb
)
to service_role;

commit;
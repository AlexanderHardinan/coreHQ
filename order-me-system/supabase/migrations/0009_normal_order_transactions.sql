-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 5 — Normal Orders
-- Migration: 0009_normal_order_transactions.sql
--
-- Atomic Normal Order create / update
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- SAVE NORMAL ORDER
-- =========================================================
--
-- Creates or updates:
--
--   normal_orders
--        +
--   normal_order_items
--
-- inside ONE PostgreSQL transaction.
--
-- If any validation, order update, or item insert fails,
-- PostgreSQL rolls back the entire operation.
--
-- p_order_id:
--
--   NULL = create new order
--   UUID = update existing order
--
-- Item JSON format:
--
-- [
--   {
--     "product_id": "uuid",
--     "on_hand_qty": "10",
--     "requested_qty": "20"
--   },
--   {
--     "product_id": "uuid",
--     "on_hand_qty": "0",
--     "requested_qty": "5.5"
--   }
-- ]
--
-- IMPORTANT:
--
-- SKU
-- Product Name
-- Category Name
-- Product UOM
--
-- are NOT trusted from the browser.
--
-- Existing database trigger:
--
--   populate_normal_order_item_product
--
-- retrieves those values from the Product database.
-- =========================================================

create or replace function public.save_normal_order(
  p_location_id uuid,
  p_order_id uuid,
  p_order_date date,
  p_ordered_by text,
  p_status text,
  p_items jsonb
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
      'Normal order status must be draft, submitted, completed, or cancelled.';

  end if;

  -- =======================================================
  -- ITEM ARRAY
  -- =======================================================

  if p_items is null
     or jsonb_typeof(
       p_items
     ) <> 'array' then

    raise exception
      'Normal order items must be provided as an array.';

  end if;

  if jsonb_array_length(
    p_items
  ) = 0 then

    raise exception
      'A normal order must contain at least one product.';

  end if;

  -- =======================================================
  -- ITEM OBJECT STRUCTURE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
    ) as item(value)
    where jsonb_typeof(
      item.value
    ) <> 'object'
  ) then

    raise exception
      'Every normal order item must contain valid product and quantity information.';

  end if;

  -- =======================================================
  -- REQUIRED ITEM FIELDS
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
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

      or

      nullif(
        trim(
          item.value ->> 'requested_qty'
        ),
        ''
      ) is null
  ) then

    raise exception
      'Every order item requires Product, On Hand Qty, and Order Request Qty.';

  end if;

  -- =======================================================
  -- PRODUCT UUID FORMAT
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
    ) as item(value)
    where (
      item.value ->> 'product_id'
    ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then

    raise exception
      'One or more order items contain an invalid product identifier.';

  end if;

  -- =======================================================
  -- ON HAND QTY FORMAT
  -- =======================================================
  --
  -- Database:
  --
  -- numeric(18,4)
  --
  -- Zero is allowed.
  --
  -- Examples:
  --
  -- 0
  -- 0.5
  -- 10
  -- 1250.7500
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
    ) as item(value)
    where (
      item.value ->> 'on_hand_qty'
    ) !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'On Hand Qty must be a valid non-negative number with up to 4 decimal places.';

  end if;

  -- =======================================================
  -- REQUESTED QTY FORMAT
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
    ) as item(value)
    where (
      item.value ->> 'requested_qty'
    ) !~ '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'Order Request Qty must be a valid non-negative number with up to 4 decimal places.';

  end if;

  -- =======================================================
  -- ON HAND RANGE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
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
  -- REQUESTED RANGE
  -- =======================================================

  if exists (
    select 1
    from jsonb_array_elements(
      p_items
    ) as item(value)
    where (
      item.value ->> 'requested_qty'
    )::numeric < 0

    or

    (
      item.value ->> 'requested_qty'
    )::numeric >
      99999999999999.9999
  ) then

    raise exception
      'Order Request Qty is outside the allowed range.';

  end if;

  -- =======================================================
  -- DUPLICATE PRODUCT PROTECTION
  -- =======================================================

  if exists (
    select
      (
        item.value ->> 'product_id'
      )::uuid

    from jsonb_array_elements(
      p_items
    ) as item(value)

    group by
      (
        item.value ->> 'product_id'
      )::uuid

    having count(*) > 1
  ) then

    raise exception
      'The same product cannot appear more than once in a normal order.';

  end if;

  -- =======================================================
  -- PRODUCT LOCATION VALIDATION
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    left join public.products p
      on p.id = (
        item.value ->> 'product_id'
      )::uuid

     and p.location_id =
       p_location_id

    where p.id is null
  ) then

    raise exception
      'One or more selected products do not belong to the current location.';

  end if;

  -- =======================================================
  -- PRODUCT ACTIVE VALIDATION
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    join public.products p
      on p.id = (
        item.value ->> 'product_id'
      )::uuid

     and p.location_id =
       p_location_id

    where p.is_active is not true
  ) then

    raise exception
      'Inactive products cannot be added to a normal order.';

  end if;

  -- =======================================================
  -- CREATE ORDER
  -- =======================================================
  --
  -- order_number is deliberately omitted.
  --
  -- Existing database trigger:
  --
  --   generate_normal_order_number
  --
  -- generates:
  --
  -- FOR-NO-2026-000001
  -- FUS-NO-2026-000001
  -- =======================================================

  if p_order_id is null then

    insert into public.normal_orders (
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

    update public.normal_orders
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
        'Normal order was not found for the current location.';
    end if;

    -- =====================================================
    -- REPLACE CURRENT ITEM SET
    -- =====================================================
    --
    -- This DELETE is part of this transaction.
    --
    -- If any replacement item later fails, the DELETE is
    -- also rolled back automatically.
    -- =====================================================

    delete from public.normal_order_items
    where order_id =
      saved_order_id

      and location_id =
        p_location_id;

  end if;

  -- =======================================================
  -- INSERT ORDER ITEMS
  -- =======================================================
  --
  -- IMPORTANT:
  --
  -- We intentionally do not provide:
  --
  -- sku_snapshot
  -- product_name_snapshot
  -- category_name_snapshot
  -- uom
  --
  -- The existing BEFORE INSERT database trigger populates
  -- those fields directly from the current Product and
  -- Category records.
  --
  -- This prevents the application/browser from fabricating
  -- historical order data.
  -- =======================================================

  insert into public.normal_order_items (
    location_id,
    order_id,
    product_id,
    on_hand_qty,
    requested_qty,
    sort_order,
    uom,
    sku_snapshot,
    product_name_snapshot,
    category_name_snapshot
  )
  select
    p_location_id,

    saved_order_id,

    (
      item.value ->> 'product_id'
    )::uuid,

    (
      item.value ->> 'on_hand_qty'
    )::numeric,

    (
      item.value ->> 'requested_qty'
    )::numeric,

    (
      item.ordinality - 1
    )::integer,

    -- -----------------------------------------------------
    -- Placeholder values.
    --
    -- populate_normal_order_item_product executes BEFORE
    -- INSERT and overwrites all four values from Product /
    -- Category master data before constraints are checked.
    -- -----------------------------------------------------

    (
      select p.uom
      from public.products p
      where p.id =
        (
          item.value ->> 'product_id'
        )::uuid
        and p.location_id =
          p_location_id
    ),

    (
      select p.sku
      from public.products p
      where p.id =
        (
          item.value ->> 'product_id'
        )::uuid
        and p.location_id =
          p_location_id
    ),

    (
      select p.name
      from public.products p
      where p.id =
        (
          item.value ->> 'product_id'
        )::uuid
        and p.location_id =
          p_location_id
    ),

    (
      select c.name
      from public.products p
      inner join public.categories c
        on c.id =
          p.category_id
       and c.location_id =
          p.location_id
      where p.id =
        (
          item.value ->> 'product_id'
        )::uuid
        and p.location_id =
          p_location_id
    )

  from jsonb_array_elements(
    p_items
  )
  with ordinality
  as item(
    value,
    ordinality
  )

  order by
    item.ordinality;

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
on function public.save_normal_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb
)
from public;

revoke all
on function public.save_normal_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb
)
from anon;

revoke all
on function public.save_normal_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb
)
from authenticated;

grant execute
on function public.save_normal_order(
  uuid,
  uuid,
  date,
  text,
  text,
  jsonb
)
to service_role;

commit;
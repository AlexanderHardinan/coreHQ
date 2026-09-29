-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- =========================================================
--
-- Normal Orders — Create Product UOM Sync
--
-- Migration:
-- 0024_normal_order_create_product_uom_sync.sql
--
-- Human and Technology System
-- Developed by Chef Alex
--
-- =========================================================
--
-- PURPOSE
-- =========================================================
--
-- Extends the existing create-only Normal Order synchronization
-- wrapper so Normal Orders [Create] may edit:
--
--   products.amount_qty
--   products.uom
--   products.packaging_size_amount
--   products.packaging_uom
--
-- The Product master remains the single source of truth.
--
-- Existing:
--
--   public.save_normal_order(...)
--
-- remains unchanged.
--
-- Existing Normal Order snapshot triggers remain unchanged.
--
-- FLOW
-- =========================================================
--
-- Normal Order Create
--        ↓
-- Validate Product Size + Product UOM + Packaging
--        ↓
-- Update Product master
--        ↓
-- Call existing save_normal_order(...)
--        ↓
-- Existing Normal Order item trigger reads Product master
--        ↓
-- Historical Product Size + Product UOM + Packaging
-- snapshots are stored
--
-- Everything executes inside one PostgreSQL transaction.
--
-- If any part fails, all Product and Normal Order changes
-- roll back automatically.
--
-- =========================================================

begin;


-- =========================================================
-- CREATE NORMAL ORDER WITH PRODUCT SIZE + UOM + PACKAGING
-- =========================================================
--
-- Signature is intentionally unchanged so the current
-- application action continues calling the same RPC:
--
--   create_normal_order_with_packaging(...)
--
-- =========================================================

create or replace function
public.create_normal_order_with_packaging(
  p_location_id uuid,
  p_order_date date,
  p_ordered_by text,
  p_status text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  saved_order_id uuid;

  order_items jsonb;
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
  -- REQUIRED CREATE FIELDS
  -- =======================================================
  --
  -- Existing save_normal_order() remains authoritative for
  -- Normal Order quantities and order-level validation.
  --
  -- This wrapper additionally requires Product Size,
  -- Product UOM, and packaging values for Product master
  -- synchronization.
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

      or

      nullif(
        trim(
          item.value ->> 'amount_qty'
        ),
        ''
      ) is null

      or

      nullif(
        trim(
          item.value ->> 'uom'
        ),
        ''
      ) is null

      or

      nullif(
        trim(
          item.value ->> 'packaging_size_amount'
        ),
        ''
      ) is null

      or

      nullif(
        trim(
          item.value ->> 'packaging_uom'
        ),
        ''
      ) is null
  ) then

    raise exception
      'Every order item requires Product, On Hand Qty, Order Request Qty, Product Size, Product UOM, Packaging Size, and Packaging UOM.';

  end if;


  -- =======================================================
  -- PRODUCT UUID FORMAT
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where trim(
      item.value ->> 'product_id'
    ) !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then

    raise exception
      'One or more order items contain an invalid product identifier.';

  end if;


  -- =======================================================
  -- DUPLICATE PRODUCT PROTECTION
  -- =======================================================

  if exists (
    select
      (
        trim(
          item.value ->> 'product_id'
        )
      )::uuid

    from jsonb_array_elements(
      p_items
    ) as item(value)

    group by
      (
        trim(
          item.value ->> 'product_id'
        )
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
      on p.id =
        (
          trim(
            item.value ->> 'product_id'
          )
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
      on p.id =
        (
          trim(
            item.value ->> 'product_id'
          )
        )::uuid

     and p.location_id =
       p_location_id

    where p.is_active is not true
  ) then

    raise exception
      'Inactive products cannot be added to a normal order.';

  end if;


  -- =======================================================
  -- PRODUCT SIZE FORMAT
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where trim(
      item.value ->> 'amount_qty'
    ) !~
      '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'Product Size must be a valid positive number with up to 4 decimal places.';

  end if;


  -- =======================================================
  -- PRODUCT SIZE RANGE
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where (
      trim(
        item.value ->> 'amount_qty'
      )
    )::numeric <= 0

    or

    (
      trim(
        item.value ->> 'amount_qty'
      )
    )::numeric >
      99999999999999.9999
  ) then

    raise exception
      'Product Size is outside the allowed range.';

  end if;


  -- =======================================================
  -- PRODUCT UOM
  -- =======================================================
  --
  -- Keep this aligned with the existing application/domain
  -- contract:
  --
  --   ml
  --   pc
  --   gram
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where lower(
      trim(
        item.value ->> 'uom'
      )
    ) not in (
      'ml',
      'pc',
      'gram'
    )
  ) then

    raise exception
      'Product UOM must be ml, pc, or gram.';

  end if;


  -- =======================================================
  -- PACKAGING SIZE FORMAT
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where trim(
      item.value ->> 'packaging_size_amount'
    ) !~
      '^[0-9]{1,14}(\.[0-9]{1,4})?$'
  ) then

    raise exception
      'Packaging Size must be a valid positive number with up to 4 decimal places.';

  end if;


  -- =======================================================
  -- PACKAGING SIZE RANGE
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where (
      trim(
        item.value ->> 'packaging_size_amount'
      )
    )::numeric <= 0

    or

    (
      trim(
        item.value ->> 'packaging_size_amount'
      )
    )::numeric >
      99999999999999.9999
  ) then

    raise exception
      'Packaging Size is outside the allowed range.';

  end if;


  -- =======================================================
  -- PACKAGING UOM
  -- =======================================================

  if exists (
    select 1

    from jsonb_array_elements(
      p_items
    ) as item(value)

    where lower(
      trim(
        item.value ->> 'packaging_uom'
      )
    ) not in (
      'bottle',
      'box',
      'pack',
      'can',
      'kilo',
      'liter',
      'tray'
    )
  ) then

    raise exception
      'Packaging UOM must be bottle, box, pack, can, kilo, liter, or tray.';

  end if;


  -- =======================================================
  -- UPDATE PRODUCT MASTER
  -- =======================================================
  --
  -- products remains the single source of truth.
  --
  -- Only these Product fields are synchronized:
  --
  --   amount_qty
  --   uom
  --   packaging_size_amount
  --   packaging_uom
  --
  -- Product name, SKU, category, active state, costs, stock,
  -- and all unrelated Product data remain untouched.
  --
  -- IS DISTINCT FROM prevents unnecessary writes.
  -- =======================================================

  with product_values as (
    select
      (
        trim(
          item.value ->> 'product_id'
        )
      )::uuid
        as product_id,

      (
        trim(
          item.value ->> 'amount_qty'
        )
      )::numeric(18, 4)
        as amount_qty,

      lower(
        trim(
          item.value ->> 'uom'
        )
      )
        as uom,

      (
        trim(
          item.value ->> 'packaging_size_amount'
        )
      )::numeric(18, 4)
        as packaging_size_amount,

      lower(
        trim(
          item.value ->> 'packaging_uom'
        )
      )
        as packaging_uom

    from jsonb_array_elements(
      p_items
    ) as item(value)
  )

  update public.products p

  set
    amount_qty =
      product_values.amount_qty,

    uom =
      product_values.uom,

    packaging_size_amount =
      product_values.packaging_size_amount,

    packaging_uom =
      product_values.packaging_uom

  from product_values

  where p.id =
      product_values.product_id

    and p.location_id =
      p_location_id

    and (
      p.amount_qty
        is distinct from
          product_values.amount_qty

      or

      p.uom
        is distinct from
          product_values.uom

      or

      p.packaging_size_amount
        is distinct from
          product_values.packaging_size_amount

      or

      p.packaging_uom
        is distinct from
          product_values.packaging_uom
    );


  -- =======================================================
  -- BUILD EXISTING SAVE_NORMAL_ORDER PAYLOAD
  -- =======================================================
  --
  -- Product Size, Product UOM, and packaging fields are
  -- intentionally NOT forwarded to save_normal_order().
  --
  -- That function keeps its existing locked contract:
  --
  --   product_id
  --   on_hand_qty
  --   requested_qty
  --
  -- The normal_order_items BEFORE INSERT trigger then reads:
  --
  --   amount_qty
  --   uom
  --   packaging_size_amount
  --   packaging_uom
  --
  -- directly from the freshly synchronized Product master and
  -- stores the historical snapshots.
  --
  -- WITH ORDINALITY preserves the submitted row order.
  -- =======================================================

  select
    jsonb_agg(
      jsonb_build_object(
        'product_id',
          trim(
            item.value ->> 'product_id'
          ),

        'on_hand_qty',
          trim(
            item.value ->> 'on_hand_qty'
          ),

        'requested_qty',
          trim(
            item.value ->> 'requested_qty'
          )
      )

      order by
        item.ordinality
    )

  into order_items

  from jsonb_array_elements(
    p_items
  ) with ordinality
    as item(
      value,
      ordinality
    );


  -- =======================================================
  -- CREATE NORMAL ORDER
  -- =======================================================

  saved_order_id :=
    public.save_normal_order(
      p_location_id,
      null,
      p_order_date,
      p_ordered_by,
      p_status,
      order_items
    );


  -- =======================================================
  -- RESULT
  -- =======================================================

  if saved_order_id is null then
    raise exception
      'Normal Order was not created.';
  end if;


  return saved_order_id;

end;
$function$;


-- =========================================================
-- FUNCTION DOCUMENTATION
-- =========================================================

comment on function
public.create_normal_order_with_packaging(
  uuid,
  date,
  text,
  text,
  jsonb
)
is
'Creates a Normal Order while atomically synchronizing Product amount_qty, uom, packaging_size_amount, and packaging_uom to the Product master before the existing Normal Order snapshot trigger captures those values. Product master remains the single source of truth.';


-- =========================================================
-- SECURITY
-- =========================================================

revoke all on function
public.create_normal_order_with_packaging(
  uuid,
  date,
  text,
  text,
  jsonb
)
from public;


revoke all on function
public.create_normal_order_with_packaging(
  uuid,
  date,
  text,
  text,
  jsonb
)
from anon;


revoke all on function
public.create_normal_order_with_packaging(
  uuid,
  date,
  text,
  text,
  jsonb
)
from authenticated;


grant execute on function
public.create_normal_order_with_packaging(
  uuid,
  date,
  text,
  text,
  jsonb
)
to service_role;


commit;

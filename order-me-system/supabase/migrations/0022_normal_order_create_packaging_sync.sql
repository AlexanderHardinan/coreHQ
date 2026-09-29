-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- =========================================================
--
-- Normal Orders — Create Packaging Synchronization
--
-- Migration:
-- 0022_normal_order_create_packaging_sync.sql
--
-- Human and Technology System
-- Developed by Chef Alex
--
-- =========================================================
--
-- PURPOSE
-- =========================================================
--
-- Normal Orders [Create] may edit:
--
--   products.packaging_size_amount
--   products.packaging_uom
--
-- The Product master remains the single source of truth.
--
-- The existing:
--
--   public.save_normal_order(...)
--
-- function remains unchanged.
--
-- Existing Normal Order snapshot triggers remain unchanged.
--
-- FLOW
-- =========================================================
--
-- Normal Order Create
--        ↓
-- Validate submitted packaging
--        ↓
-- Update Product master packaging
--        ↓
-- Call existing save_normal_order(...)
--        ↓
-- Existing Normal Order item trigger reads Product master
--        ↓
-- Historical packaging snapshot is stored
--
-- All operations execute inside the same PostgreSQL
-- transaction.
--
-- If order creation fails, Product packaging changes are
-- automatically rolled back.
--
-- =========================================================

begin;


-- =========================================================
-- CREATE NORMAL ORDER WITH PACKAGING
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
  -- Existing save_normal_order() remains responsible for
  -- authoritative validation of normal order quantities.
  --
  -- This wrapper additionally requires the Product packaging
  -- values needed for Product master synchronization.
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
      'Every order item requires Product, On Hand Qty, Order Request Qty, Packaging Size, and Packaging UOM.';

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
  -- PACKAGING SIZE FORMAT
  -- =======================================================
  --
  -- Product packaging size is numeric(18,4).
  --
  -- Valid:
  --
  -- 1
  -- 6
  -- 12
  -- 24
  -- 1.5
  -- 12.5000
  --
  -- Zero is NOT valid because Product packaging represents
  -- an actual physical packaging quantity.
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
  -- UPDATE PRODUCT MASTER PACKAGING
  -- =======================================================
  --
  -- products remains the ONE SOURCE OF TRUTH.
  --
  -- Only packaging fields are changed.
  --
  -- Product name
  -- SKU
  -- category
  -- amount_qty
  -- Product UOM
  -- active status
  -- and all other Product fields remain untouched.
  --
  -- IS DISTINCT FROM prevents unnecessary Product updates
  -- when the submitted packaging already matches Product.
  --
  -- UPDATE acquires row locks until this transaction ends.
  -- Therefore the following Normal Order snapshot reads the
  -- packaging values belonging to this transaction.
  -- =======================================================

  with packaging_values as (
    select
      (
        trim(
          item.value ->> 'product_id'
        )
      )::uuid
        as product_id,

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
    packaging_size_amount =
      packaging_values.packaging_size_amount,

    packaging_uom =
      packaging_values.packaging_uom

  from packaging_values

  where p.id =
      packaging_values.product_id

    and p.location_id =
      p_location_id

    and (
      p.packaging_size_amount
        is distinct from
          packaging_values.packaging_size_amount

      or

      p.packaging_uom
        is distinct from
          packaging_values.packaging_uom
    );


  -- =======================================================
  -- BUILD EXISTING SAVE_NORMAL_ORDER PAYLOAD
  -- =======================================================
  --
  -- Do NOT send packaging fields into the locked
  -- save_normal_order() function.
  --
  -- Its existing contract stays:
  --
  -- product_id
  -- on_hand_qty
  -- requested_qty
  --
  -- WITH ORDINALITY preserves Product row order.
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
  --
  -- Existing function remains authoritative for:
  --
  -- Order date validation
  -- Ordered By validation
  -- Status validation
  -- Quantity validation
  -- Product validation
  -- Order number generation
  -- Normal Order creation
  -- Normal Order item creation
  --
  -- Existing normal_order_items BEFORE INSERT trigger then
  -- snapshots the freshly synchronized Product packaging.
  --
  -- Because this call executes in the SAME transaction:
  --
  --   Product update succeeds
  --   Order save fails
  --
  -- = Product update rolls back.
  --
  --   Order succeeds
  --   Snapshot fails
  --
  -- = Entire transaction rolls back.
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
'Creates a Normal Order while atomically synchronizing editable packaging_size_amount and packaging_uom values to the Product master before the existing Normal Order snapshot trigger captures them. Product master remains the single source of truth.';


-- =========================================================
-- SECURITY
-- =========================================================
--
-- Normal Order mutations are server-side operations.
--
-- Browser roles do not require direct access to this
-- SECURITY DEFINER RPC.
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
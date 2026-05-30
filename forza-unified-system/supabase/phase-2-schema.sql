-- ============================================================
-- Forza Unified System
-- Phase 2: Supabase Database, Roles, RLS, and Access Control
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

do $$ begin
  create type public.user_role as enum (
    'boh_staff',
    'foh_staff',
    'manager',
    'super_admin'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.ops_area as enum (
    'kitchen',
    'bar',
    'global'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.movement_type as enum (
    'delivery',
    'production',
    'sold',
    'adjustment',
    'waste',
    'transfer',
    'stock_count'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.alert_status as enum (
    'over_budget',
    'on_budget',
    'over_stocked',
    'low_stock',
    'inventory_discrepancy',
    'on_track',
    'expiring_soon',
    'expired',
    'safe'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_type as enum (
    'dashboard',
    'inventory',
    'kitchen_ops',
    'bar_ops',
    'recipe',
    'payroll_budget',
    'operational_budget',
    'sales',
    'discrepancy',
    'expiry',
    'budget'
  );
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- SHARED UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- CORE TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'manager',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  city text,
  country text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_unit_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, brand_unit_id)
);

-- ============================================================
-- ACCESS HELPER FUNCTIONS
-- Security definer avoids recursive RLS policy checks.
-- ============================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false);
$$;

create or replace function public.is_manager_or_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('manager', 'super_admin'), false);
$$;

create or replace function public.can_access_kitchen()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('boh_staff', 'manager', 'super_admin'), false);
$$;

create or replace function public.can_access_bar()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('foh_staff', 'manager', 'super_admin'), false);
$$;

create or replace function public.can_access_payroll()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false);
$$;

create or replace function public.can_access_unit(target_unit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.user_unit_access access
      where access.user_id = auth.uid()
        and access.brand_unit_id = target_unit_id
    );
$$;

-- ============================================================
-- PROFILE AUTO-CREATION
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url',
    'manager'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid references public.brand_units(id) on delete cascade,
  ops_area public.ops_area not null default 'global',
  name text not null,
  icon text not null default 'Boxes',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_unit_id, ops_area, name)
);

-- ============================================================
-- PRODUCTS AND INVENTORY
-- ============================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  category_id uuid references public.product_categories(id) on delete set null,
  ops_area public.ops_area not null default 'global',
  product_name text not null,
  sku text not null unique,
  unit text not null,
  supplier_name text,
  opening_stock numeric(14, 3) not null default 0,
  current_stock numeric(14, 3) not null default 0,
  minimum_stock numeric(14, 3) not null default 0,
  maximum_stock numeric(14, 3) not null default 0,
  unit_cost numeric(14, 4) not null default 0,
  expiry_date date,
  storage_area text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_brand_unit_idx on public.products(brand_unit_id);
create index if not exists products_ops_area_idx on public.products(ops_area);
create index if not exists products_sku_idx on public.products(sku);
create index if not exists products_expiry_date_idx on public.products(expiry_date);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  ops_area public.ops_area not null default 'global',
  movement_type public.movement_type not null,
  quantity numeric(14, 3) not null,
  unit_cost numeric(14, 4) not null default 0,
  total_cost numeric(14, 4) generated always as (quantity * unit_cost) stored,
  reference_code text,
  notes text,
  movement_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_brand_unit_idx on public.inventory_movements(brand_unit_id);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id);
create index if not exists inventory_movements_date_idx on public.inventory_movements(movement_date);

create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  ops_area public.ops_area not null default 'global',
  system_stock numeric(14, 3) not null default 0,
  counted_stock numeric(14, 3) not null default 0,
  discrepancy_qty numeric(14, 3) generated always as (counted_stock - system_stock) stored,
  count_date date not null default current_date,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- RECIPE MAKER
-- ============================================================

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  ops_area public.ops_area not null default 'kitchen',
  recipe_name text not null,
  recipe_category text,
  batch_yield numeric(14, 3) not null default 1,
  portion_yield numeric(14, 3) not null default 1,
  selling_price numeric(14, 4) not null default 0,
  food_cost_percent numeric(8, 3) not null default 0,
  total_recipe_cost numeric(14, 4) not null default 0,
  cost_per_portion numeric(14, 4) not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(14, 3) not null default 0,
  unit text not null,
  unit_cost_snapshot numeric(14, 4) not null default 0,
  total_cost numeric(14, 4) generated always as (quantity * unit_cost_snapshot) stored,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SALES PERFORMANCE
-- ============================================================

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  sale_date date not null default current_date,
  gross_sales numeric(14, 4) not null default 0,
  discounts numeric(14, 4) not null default 0,
  net_sales numeric(14, 4) generated always as (gross_sales - discounts) stored,
  guest_count integer not null default 0,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sold_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid references public.sales(id) on delete cascade,
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  ops_area public.ops_area not null default 'global',
  item_name text not null,
  quantity numeric(14, 3) not null default 0,
  selling_price numeric(14, 4) not null default 0,
  total_sales numeric(14, 4) generated always as (quantity * selling_price) stored,
  sold_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- PAYROLL BUDGET
-- Super Admin only.
-- ============================================================

create table if not exists public.payroll_departments (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  name text not null,
  icon text not null default 'Users',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_unit_id, name)
);

create table if not exists public.payroll_budgets (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  department_id uuid references public.payroll_departments(id) on delete set null,
  period_start date not null,
  period_end date not null,
  budget_amount numeric(14, 4) not null default 0,
  actual_amount numeric(14, 4) not null default 0,
  variance_amount numeric(14, 4) generated always as (actual_amount - budget_amount) stored,
  status public.alert_status generated always as (
    case
      when actual_amount > budget_amount then 'over_budget'::public.alert_status
      else 'on_budget'::public.alert_status
    end
  ) stored,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- OPERATIONAL COST BUDGET
-- ============================================================

create table if not exists public.operational_cost_categories (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  name text not null,
  icon text not null default 'WalletCards',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_unit_id, name)
);

create table if not exists public.operational_cost_budgets (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid not null references public.brand_units(id) on delete cascade,
  category_id uuid references public.operational_cost_categories(id) on delete set null,
  period_start date not null,
  period_end date not null,
  budget_amount numeric(14, 4) not null default 0,
  actual_amount numeric(14, 4) not null default 0,
  variance_amount numeric(14, 4) generated always as (actual_amount - budget_amount) stored,
  status public.alert_status generated always as (
    case
      when actual_amount > budget_amount then 'over_budget'::public.alert_status
      else 'on_budget'::public.alert_status
    end
  ) stored,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ALERTS
-- ============================================================

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid references public.brand_units(id) on delete cascade,
  alert_title text not null,
  alert_message text,
  alert_status public.alert_status not null,
  related_table text,
  related_id uuid,
  is_resolved boolean not null default false,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REPORTS
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid references public.brand_units(id) on delete cascade,
  report_type public.report_type not null,
  report_title text not null,
  date_from date,
  date_to date,
  filters jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid references public.brand_units(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- SETTINGS
-- ============================================================

create table if not exists public.system_settings (
  id uuid primary key default gen_random_uuid(),
  brand_unit_id uuid references public.brand_units(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_unit_id, setting_key)
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists brand_units_set_updated_at on public.brand_units;
create trigger brand_units_set_updated_at
before update on public.brand_units
for each row execute function public.set_updated_at();

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists stock_counts_set_updated_at on public.stock_counts;
create trigger stock_counts_set_updated_at
before update on public.stock_counts
for each row execute function public.set_updated_at();

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists payroll_departments_set_updated_at on public.payroll_departments;
create trigger payroll_departments_set_updated_at
before update on public.payroll_departments
for each row execute function public.set_updated_at();

drop trigger if exists payroll_budgets_set_updated_at on public.payroll_budgets;
create trigger payroll_budgets_set_updated_at
before update on public.payroll_budgets
for each row execute function public.set_updated_at();

drop trigger if exists operational_cost_categories_set_updated_at on public.operational_cost_categories;
create trigger operational_cost_categories_set_updated_at
before update on public.operational_cost_categories
for each row execute function public.set_updated_at();

drop trigger if exists operational_cost_budgets_set_updated_at on public.operational_cost_budgets;
create trigger operational_cost_budgets_set_updated_at
before update on public.operational_cost_budgets
for each row execute function public.set_updated_at();

drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.brand_units enable row level security;
alter table public.user_unit_access enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_counts enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.sales enable row level security;
alter table public.sold_items enable row level security;
alter table public.payroll_departments enable row level security;
alter table public.payroll_budgets enable row level security;
alter table public.operational_cost_categories enable row level security;
alter table public.operational_cost_budgets enable row level security;
alter table public.alerts enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- ============================================================
-- RLS POLICIES: PROFILES
-- ============================================================

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_manager_or_super_admin()
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_super_admin()
)
with check (
  id = auth.uid()
  or public.is_super_admin()
);

-- ============================================================
-- RLS POLICIES: BRAND UNITS
-- ============================================================

drop policy if exists "brand_units_select_accessible" on public.brand_units;
create policy "brand_units_select_accessible"
on public.brand_units
for select
to authenticated
using (
  public.is_super_admin()
  or public.can_access_unit(id)
);

drop policy if exists "brand_units_write_admin" on public.brand_units;
create policy "brand_units_write_admin"
on public.brand_units
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- ============================================================
-- RLS POLICIES: USER UNIT ACCESS
-- ============================================================

drop policy if exists "user_unit_access_select" on public.user_unit_access;
create policy "user_unit_access_select"
on public.user_unit_access
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_super_admin()
);

drop policy if exists "user_unit_access_write_admin" on public.user_unit_access;
create policy "user_unit_access_write_admin"
on public.user_unit_access
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- ============================================================
-- RLS POLICIES: OPS TABLES
-- ============================================================

drop policy if exists "product_categories_select_accessible" on public.product_categories;
create policy "product_categories_select_accessible"
on public.product_categories
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "product_categories_write_by_role" on public.product_categories;
create policy "product_categories_write_by_role"
on public.product_categories
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

drop policy if exists "products_select_accessible" on public.products;
create policy "products_select_accessible"
on public.products
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
    or ops_area = 'global'
  )
);

drop policy if exists "products_write_by_role" on public.products;
create policy "products_write_by_role"
on public.products
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

drop policy if exists "inventory_movements_select_accessible" on public.inventory_movements;
create policy "inventory_movements_select_accessible"
on public.inventory_movements
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "inventory_movements_write_by_role" on public.inventory_movements;
create policy "inventory_movements_write_by_role"
on public.inventory_movements
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

drop policy if exists "stock_counts_select_accessible" on public.stock_counts;
create policy "stock_counts_select_accessible"
on public.stock_counts
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "stock_counts_write_by_role" on public.stock_counts;
create policy "stock_counts_write_by_role"
on public.stock_counts
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

-- ============================================================
-- RLS POLICIES: RECIPES
-- ============================================================

drop policy if exists "recipes_select_accessible" on public.recipes;
create policy "recipes_select_accessible"
on public.recipes
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "recipes_write_by_role" on public.recipes;
create policy "recipes_write_by_role"
on public.recipes
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

drop policy if exists "recipe_items_access_via_recipe" on public.recipe_items;
create policy "recipe_items_access_via_recipe"
on public.recipe_items
for all
to authenticated
using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_items.recipe_id
      and public.can_access_unit(r.brand_unit_id)
  )
)
with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_items.recipe_id
      and public.can_access_unit(r.brand_unit_id)
  )
);

-- ============================================================
-- RLS POLICIES: SALES
-- ============================================================

drop policy if exists "sales_select_accessible" on public.sales;
create policy "sales_select_accessible"
on public.sales
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "sales_write_manager_admin" on public.sales;
create policy "sales_write_manager_admin"
on public.sales
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
)
with check (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
);

drop policy if exists "sold_items_select_accessible" on public.sold_items;
create policy "sold_items_select_accessible"
on public.sold_items
for select
to authenticated
using (
  public.can_access_unit(brand_unit_id)
);

drop policy if exists "sold_items_write_by_role" on public.sold_items;
create policy "sold_items_write_by_role"
on public.sold_items
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
)
with check (
  public.can_access_unit(brand_unit_id)
  and (
    public.is_manager_or_super_admin()
    or (ops_area = 'kitchen' and public.can_access_kitchen())
    or (ops_area = 'bar' and public.can_access_bar())
  )
);

-- ============================================================
-- RLS POLICIES: PAYROLL
-- ============================================================

drop policy if exists "payroll_departments_super_admin_only" on public.payroll_departments;
create policy "payroll_departments_super_admin_only"
on public.payroll_departments
for all
to authenticated
using (
  public.can_access_payroll()
  and public.can_access_unit(brand_unit_id)
)
with check (
  public.can_access_payroll()
  and public.can_access_unit(brand_unit_id)
);

drop policy if exists "payroll_budgets_super_admin_only" on public.payroll_budgets;
create policy "payroll_budgets_super_admin_only"
on public.payroll_budgets
for all
to authenticated
using (
  public.can_access_payroll()
  and public.can_access_unit(brand_unit_id)
)
with check (
  public.can_access_payroll()
  and public.can_access_unit(brand_unit_id)
);

-- ============================================================
-- RLS POLICIES: OPERATIONAL BUDGET
-- ============================================================

drop policy if exists "operational_cost_categories_manager_admin" on public.operational_cost_categories;
create policy "operational_cost_categories_manager_admin"
on public.operational_cost_categories
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
)
with check (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
);

drop policy if exists "operational_cost_budgets_manager_admin" on public.operational_cost_budgets;
create policy "operational_cost_budgets_manager_admin"
on public.operational_cost_budgets
for all
to authenticated
using (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
)
with check (
  public.can_access_unit(brand_unit_id)
  and public.is_manager_or_super_admin()
);

-- ============================================================
-- RLS POLICIES: ALERTS, REPORTS, AUDIT, SETTINGS
-- ============================================================

drop policy if exists "alerts_accessible" on public.alerts;
create policy "alerts_accessible"
on public.alerts
for all
to authenticated
using (
  brand_unit_id is null
  or public.can_access_unit(brand_unit_id)
)
with check (
  brand_unit_id is null
  or public.can_access_unit(brand_unit_id)
);

drop policy if exists "reports_accessible" on public.reports;
create policy "reports_accessible"
on public.reports
for all
to authenticated
using (
  brand_unit_id is null
  or public.can_access_unit(brand_unit_id)
)
with check (
  brand_unit_id is null
  or public.can_access_unit(brand_unit_id)
);

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (
  public.is_manager_or_super_admin()
);

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated"
on public.audit_logs
for insert
to authenticated
with check (
  actor_id = auth.uid()
  or public.is_super_admin()
);

drop policy if exists "system_settings_manager_admin" on public.system_settings;
create policy "system_settings_manager_admin"
on public.system_settings
for all
to authenticated
using (
  brand_unit_id is null
  or (
    public.can_access_unit(brand_unit_id)
    and public.is_manager_or_super_admin()
  )
)
with check (
  brand_unit_id is null
  or (
    public.can_access_unit(brand_unit_id)
    and public.is_manager_or_super_admin()
  )
);

-- ============================================================
-- DEFAULT GLOBAL SEED DATA
-- ============================================================

insert into public.brand_units (
  name,
  code,
  address,
  city,
  country
)
values (
  'Main Brand Unit',
  'MAIN',
  'Primary Location',
  'Default City',
  'Default Country'
)
on conflict (code) do nothing;

insert into public.product_categories (
  brand_unit_id,
  ops_area,
  name,
  icon
)
select
  bu.id,
  category.ops_area::public.ops_area,
  category.name,
  category.icon
from public.brand_units bu
cross join (
  values
    ('kitchen', 'Food', 'ChefHat'),
    ('kitchen', 'Meat', 'Beef'),
    ('kitchen', 'Seafood', 'Fish'),
    ('kitchen', 'Dry Goods', 'Package'),
    ('bar', 'Wine', 'Wine'),
    ('bar', 'Spirits', 'GlassWater'),
    ('bar', 'Beer', 'Beer'),
    ('bar', 'Mixers', 'CupSoda'),
    ('global', 'Cleaning', 'Sparkles'),
    ('global', 'Packaging', 'Package')
) as category(ops_area, name, icon)
where bu.code = 'MAIN'
on conflict (brand_unit_id, ops_area, name) do nothing;

insert into public.payroll_departments (
  brand_unit_id,
  name,
  icon
)
select
  bu.id,
  department.name,
  department.icon
from public.brand_units bu
cross join (
  values
    ('Front of House', 'Users'),
    ('Back of House', 'ChefHat'),
    ('Management', 'ShieldCheck'),
    ('Support', 'Handshake'),
    ('Admin', 'BriefcaseBusiness')
) as department(name, icon)
where bu.code = 'MAIN'
on conflict (brand_unit_id, name) do nothing;

insert into public.operational_cost_categories (
  brand_unit_id,
  name,
  icon
)
select
  bu.id,
  category.name,
  category.icon
from public.brand_units bu
cross join (
  values
    ('Food', 'ChefHat'),
    ('Beverage', 'GlassWater'),
    ('Cleaning', 'Sparkles'),
    ('Utilities', 'Zap'),
    ('Maintenance', 'Wrench'),
    ('Packaging', 'Package'),
    ('Marketing', 'Megaphone'),
    ('Rent', 'Building2'),
    ('Subscriptions', 'Receipt')
) as category(name, icon)
where bu.code = 'MAIN'
on conflict (brand_unit_id, name) do nothing;
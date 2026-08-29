-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0002_categories.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- CATEGORIES
-- =========================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),

  location_id uuid not null,

  name text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_location_id_fkey
    foreign key (location_id)
    references public.locations(id)
    on update cascade
    on delete restrict,

  constraint categories_name_not_blank
    check (char_length(trim(name)) > 0),

  constraint categories_name_length
    check (char_length(trim(name)) <= 100)
);

-- =========================================================
-- UNIQUE CATEGORY NAME PER LOCATION
-- =========================================================

-- Prevent:
--
-- Forza → Meat
-- Forza → meat
-- Forza → MEAT
--
-- while still allowing:
--
-- Forza  → Meat
-- Fusion → Meat

create unique index if not exists categories_location_name_unique_ci
  on public.categories (
    location_id,
    lower(trim(name))
  );

-- =========================================================
-- QUERY INDEXES
-- =========================================================

create index if not exists categories_location_id_idx
  on public.categories (location_id);

create index if not exists categories_location_active_idx
  on public.categories (
    location_id,
    is_active
  );

create index if not exists categories_updated_at_idx
  on public.categories (updated_at desc);

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

drop trigger if exists set_categories_updated_at
on public.categories;

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.categories enable row level security;

-- No public policies are created yet.
--
-- Access will remain blocked through the publishable key
-- until the Order Me authentication/session security layer
-- and final RLS policies are implemented.

commit;
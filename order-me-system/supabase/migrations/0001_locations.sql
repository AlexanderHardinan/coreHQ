-- =========================================================
-- ORDER ME SYSTEM BY FORZA
-- Phase 1 — Foundation
-- Migration: 0001_locations.sql
--
-- Human and Technology System
-- Developed by Chef Alex
-- =========================================================

begin;

-- =========================================================
-- UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- LOCATIONS
-- =========================================================

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  code text not null,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint locations_name_not_blank
    check (char_length(trim(name)) > 0),

  constraint locations_code_not_blank
    check (char_length(trim(code)) > 0),

  constraint locations_code_format
    check (code ~ '^[A-Z0-9_-]{2,10}$'),

  constraint locations_code_unique
    unique (code)
);

-- Prevent duplicate location names regardless of capitalization.
create unique index if not exists locations_name_unique_ci
  on public.locations (lower(trim(name)));

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

drop trigger if exists set_locations_updated_at
on public.locations;

create trigger set_locations_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.locations enable row level security;

-- No public RLS policies are created yet.
--
-- This is intentional.
--
-- Until the Order Me authentication/session architecture is
-- completed, anon/authenticated clients must not automatically
-- receive database access simply because they possess the
-- Supabase project URL and publishable key.

-- =========================================================
-- DEFAULT LOCATIONS
-- =========================================================

insert into public.locations (
  name,
  code,
  is_active
)
values
  ('Forza', 'FOR', true),
  ('Fusion', 'FUS', true)
on conflict (code)
do update set
  name = excluded.name,
  is_active = excluded.is_active,
  updated_at = now();

commit;
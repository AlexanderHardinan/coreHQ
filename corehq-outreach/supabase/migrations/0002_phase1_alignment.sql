/*
  CoreHQ – Outreach
  Phase 1.2 — Align existing schema to locked model (SAFE)

  What this does:
  - Adds/ensures updated_at trigger function
  - Ensures updated_at triggers exist on tables that have updated_at
  - Adds missing defaults
  - Adds NOT NULL only when safe (guards: abort if null rows exist)
  - Adds key indexes (if not exists)

  What this does NOT do:
  - No table drops
  - No column renames
  - No data rewrites (except setting defaults at schema level)
  - No RLS policies (Phase 2)
*/

-- 1) updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Ensure updated_at triggers exist (only for tables that have updated_at)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'brands_set_updated_at') then
    create trigger brands_set_updated_at
    before update on public.brands
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'contacts_set_updated_at') then
    create trigger contacts_set_updated_at
    before update on public.contacts
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'contact_brands_set_updated_at') then
    create trigger contact_brands_set_updated_at
    before update on public.contact_brands
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'campaigns_set_updated_at') then
    create trigger campaigns_set_updated_at
    before update on public.campaigns
    for each row execute function public.set_updated_at();
  end if;
end$$;

-- 3) Defaults (safe)
alter table public.brands
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.contacts
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.contact_brands
  alter column tags set default '{}'::text[],
  alter column opt_in_status set default 'pending'::public.opt_in_status,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.campaigns
  alter column status set default 'draft'::public.campaign_status,
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.emails
  alter column created_at set default now();

alter table public.email_events
  alter column metadata set default '{}'::jsonb,
  alter column timestamp set default now();

alter table public.suppression_list
  alter column global set default true,
  alter column created_at set default now();

-- 4) NOT NULL hardening WITH GUARDS (aborts if existing null rows exist)
do $$
declare
  n bigint;
begin
  -- brands created_at / updated_at
  select count(*) into n from public.brands where created_at is null;
  if n > 0 then raise exception 'Abort: brands.created_at has % NULL rows', n; end if;
  alter table public.brands alter column created_at set not null;

  select count(*) into n from public.brands where updated_at is null;
  if n > 0 then raise exception 'Abort: brands.updated_at has % NULL rows', n; end if;
  alter table public.brands alter column updated_at set not null;

  -- contacts created_at / updated_at
  select count(*) into n from public.contacts where created_at is null;
  if n > 0 then raise exception 'Abort: contacts.created_at has % NULL rows', n; end if;
  alter table public.contacts alter column created_at set not null;

  select count(*) into n from public.contacts where updated_at is null;
  if n > 0 then raise exception 'Abort: contacts.updated_at has % NULL rows', n; end if;
  alter table public.contacts alter column updated_at set not null;

  -- contact_brands tags/opt_in_status/created_at/updated_at
  select count(*) into n from public.contact_brands where tags is null;
  if n > 0 then raise exception 'Abort: contact_brands.tags has % NULL rows', n; end if;
  alter table public.contact_brands alter column tags set not null;

  select count(*) into n from public.contact_brands where opt_in_status is null;
  if n > 0 then raise exception 'Abort: contact_brands.opt_in_status has % NULL rows', n; end if;
  alter table public.contact_brands alter column opt_in_status set not null;

  select count(*) into n from public.contact_brands where created_at is null;
  if n > 0 then raise exception 'Abort: contact_brands.created_at has % NULL rows', n; end if;
  alter table public.contact_brands alter column created_at set not null;

  select count(*) into n from public.contact_brands where updated_at is null;
  if n > 0 then raise exception 'Abort: contact_brands.updated_at has % NULL rows', n; end if;
  alter table public.contact_brands alter column updated_at set not null;

  -- campaigns status/created_at/updated_at
  select count(*) into n from public.campaigns where status is null;
  if n > 0 then raise exception 'Abort: campaigns.status has % NULL rows', n; end if;
  alter table public.campaigns alter column status set not null;

  select count(*) into n from public.campaigns where created_at is null;
  if n > 0 then raise exception 'Abort: campaigns.created_at has % NULL rows', n; end if;
  alter table public.campaigns alter column created_at set not null;

  select count(*) into n from public.campaigns where updated_at is null;
  if n > 0 then raise exception 'Abort: campaigns.updated_at has % NULL rows', n; end if;
  alter table public.campaigns alter column updated_at set not null;

  -- emails created_at
  select count(*) into n from public.emails where created_at is null;
  if n > 0 then raise exception 'Abort: emails.created_at has % NULL rows', n; end if;
  alter table public.emails alter column created_at set not null;

  -- email_events email_id/contact_id/metadata/timestamp
  select count(*) into n from public.email_events where email_id is null;
  if n > 0 then raise exception 'Abort: email_events.email_id has % NULL rows', n; end if;
  alter table public.email_events alter column email_id set not null;

  select count(*) into n from public.email_events where contact_id is null;
  if n > 0 then raise exception 'Abort: email_events.contact_id has % NULL rows', n; end if;
  alter table public.email_events alter column contact_id set not null;

  select count(*) into n from public.email_events where metadata is null;
  if n > 0 then raise exception 'Abort: email_events.metadata has % NULL rows', n; end if;
  alter table public.email_events alter column metadata set not null;

  select count(*) into n from public.email_events where timestamp is null;
  if n > 0 then raise exception 'Abort: email_events.timestamp has % NULL rows', n; end if;
  alter table public.email_events alter column timestamp set not null;

  -- suppression_list global/created_at
  select count(*) into n from public.suppression_list where global is null;
  if n > 0 then raise exception 'Abort: suppression_list.global has % NULL rows', n; end if;
  alter table public.suppression_list alter column global set not null;

  select count(*) into n from public.suppression_list where created_at is null;
  if n > 0 then raise exception 'Abort: suppression_list.created_at has % NULL rows', n; end if;
  alter table public.suppression_list alter column created_at set not null;
end$$;

-- 5) Indexes (safe, idempotent)
create index if not exists campaigns_brand_id_idx on public.campaigns (brand_id);
create index if not exists campaigns_status_idx on public.campaigns (status);

create index if not exists contact_brands_brand_id_idx on public.contact_brands (brand_id);
create index if not exists contact_brands_contact_id_idx on public.contact_brands (contact_id);

create index if not exists emails_campaign_id_idx on public.emails (campaign_id);

create index if not exists email_events_email_id_idx on public.email_events (email_id);
create index if not exists email_events_contact_id_idx on public.email_events (contact_id);
create index if not exists email_events_event_idx on public.email_events (event);
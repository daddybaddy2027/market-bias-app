-- AI Market Expert: Technical and Fundamental Outlook
-- Safe to run more than once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists models_access boolean,
  add column if not exists outlook_access boolean;

-- Preserve existing active Pro subscribers as Models subscribers.
update public.profiles
set models_access = true
where plan = 'pro'
  and subscription_status in ('active', 'trialing')
  and models_access is null;

update public.profiles
set models_access = false
where models_access is null;

update public.profiles
set outlook_access = false
where outlook_access is null;

alter table public.profiles
  alter column models_access set default false,
  alter column models_access set not null,
  alter column outlook_access set default false,
  alter column outlook_access set not null;

create table if not exists public.macro_commentary (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  author_name text not null default 'Bongani Mantjate',
  published_at timestamptz,
  preview_sentences text[] not null default '{}',
  market_regime text,
  currency_outlook text,
  main_drivers text,
  important_events text,
  pair_of_the_week text,
  technical_structure text,
  base_scenario text,
  alternative_scenario text,
  invalidation text,
  commentary_type text not null default 'weekly_outlook',
  access_level text not null default 'premium',
  published boolean not null default false,
  chart_image_path text,
  chart_image_alt text,
  chart_image_caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint macro_commentary_access_level_check
    check (access_level in ('public', 'premium')),
  constraint macro_commentary_type_check
    check (
      commentary_type in (
        'weekly_outlook',
        'event_preview',
        'event_reaction',
        'market_update',
        'pair_analysis'
      )
    )
);

-- Adds chart support when the table was created by an earlier migration.
alter table public.macro_commentary
  add column if not exists chart_image_path text,
  add column if not exists chart_image_alt text,
  add column if not exists chart_image_caption text;

create index if not exists macro_commentary_published_at_idx
  on public.macro_commentary(published_at desc);

create index if not exists macro_commentary_published_idx
  on public.macro_commentary(published, published_at desc);

alter table public.macro_commentary enable row level security;

-- Remove the earlier unsafe policy that allowed every visitor to select every
-- column from a published premium row.
drop policy if exists "Published outlook previews are public"
  on public.macro_commentary;

drop policy if exists "Outlook subscribers can read published commentary"
  on public.macro_commentary;

-- Only authenticated users with active Outlook entitlement can read full rows.
create policy "Outlook subscribers can read published commentary"
  on public.macro_commentary
  for select
  to authenticated
  using (
    published = true
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.outlook_access = true
        and p.subscription_status in ('active', 'trialing')
        and (
          p.subscription_expires_at is null
          or p.subscription_expires_at > now()
        )
    )
  );

revoke all on table public.macro_commentary from anon;
revoke all on table public.macro_commentary from authenticated;
grant select on table public.macro_commentary to authenticated;

-- Public-safe view. It intentionally exposes metadata and two preview
-- sentences, but none of the premium body fields or private image paths.
drop view if exists public.macro_commentary_previews;

create view public.macro_commentary_previews
with (security_barrier = true)
as
select
  id,
  slug,
  title,
  author_name,
  published_at,
  preview_sentences,
  commentary_type,
  access_level
from public.macro_commentary
where published = true;

grant select on public.macro_commentary_previews to anon;
grant select on public.macro_commentary_previews to authenticated;

comment on view public.macro_commentary_previews is
  'Public metadata and preview sentences only. Premium body fields remain protected by macro_commentary RLS.';

-- Private Storage bucket for Outlook charts.
insert into storage.buckets (id, name, public)
values ('outlook-media', 'outlook-media', false)
on conflict (id) do update
set public = false;

drop policy if exists "Outlook subscribers can read outlook media"
  on storage.objects;

create policy "Outlook subscribers can read outlook media"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'outlook-media'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = auth.uid()
        and p.outlook_access = true
        and p.subscription_status in ('active', 'trialing')
        and (
          p.subscription_expires_at is null
          or p.subscription_expires_at > now()
        )
    )
  );

-- Manual Complete access for the owner:
-- update public.profiles
-- set
--   plan = 'pro',
--   subscription_status = 'active',
--   subscription_provider = 'manual_owner',
--   models_access = true,
--   outlook_access = true,
--   subscription_expires_at = null,
--   updated_at = now()
-- where lower(email) = lower('veljkom350@gmail.com');

-- Manual Complete access for Bongani after he creates an account:
-- update public.profiles
-- set
--   plan = 'pro',
--   subscription_status = 'active',
--   subscription_provider = 'manual_partner',
--   models_access = true,
--   outlook_access = true,
--   subscription_expires_at = null,
--   updated_at = now()
-- where lower(email) = lower('bongani2mantjate679@gmail.com');

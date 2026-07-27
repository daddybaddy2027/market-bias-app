-- AI Market Expert: Technical and Fundamental Outlook
-- Run this file in Supabase SQL Editor before enabling Outlook checkout.

alter table public.profiles
  add column if not exists models_access boolean,
  add column if not exists outlook_access boolean;

-- Preserve existing Pro subscribers as Models subscribers.
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

create index if not exists macro_commentary_published_at_idx
  on public.macro_commentary(published_at desc);

create index if not exists macro_commentary_published_idx
  on public.macro_commentary(published, published_at desc);

alter table public.macro_commentary enable row level security;

drop policy if exists "Published outlook previews are public"
  on public.macro_commentary;

create policy "Published outlook previews are public"
  on public.macro_commentary
  for select
  using (published = true);

-- The client must still hide premium body fields unless profiles.outlook_access is true.
-- For stronger database-level protection, expose public previews through a dedicated view
-- and fetch complete rows through an authenticated Edge Function in the next phase.

-- Manual partner access for Bongani after he creates an account:
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

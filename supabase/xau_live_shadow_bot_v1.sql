-- XAUUSD Live Shadow Bot v1
-- Research/live-shadow only. No broker order execution.

create table if not exists public.xau_bot_state (
  bot_id text primary key,
  updated_at timestamptz not null default now(),
  status text not null,
  current_price double precision,
  active_trade_id text,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.xau_bot_trades (
  trade_id text primary key,
  bot_id text not null,
  status text not null,
  side integer not null check (side in (-1, 1)),
  direction text not null,
  opened_at timestamptz not null,
  closed_at timestamptz,
  entry_price double precision not null,
  sl_price double precision not null,
  tp_price double precision not null,
  exit_price double precision,
  gross_r double precision,
  net_r double precision,
  gross_pips double precision,
  net_pips double precision,
  exit_reason text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists xau_bot_trades_opened_idx
  on public.xau_bot_trades (opened_at desc);

create table if not exists public.xau_bot_events (
  event_id text primary key,
  bot_id text not null,
  event_time timestamptz not null,
  event_type text not null,
  trade_id text,
  episode_id text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists xau_bot_events_time_idx
  on public.xau_bot_events (event_time desc);

create table if not exists public.xau_bot_metrics (
  bot_id text primary key,
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.xau_bot_candles (
  asset text not null,
  timeframe text not null check (timeframe in ('M15', 'H1')),
  time_utc timestamptz not null,
  open double precision not null,
  high double precision not null,
  low double precision not null,
  close double precision not null,
  volume double precision,
  spread_points double precision,
  source text,
  primary key (asset, timeframe, time_utc)
);

create index if not exists xau_bot_candles_lookup_idx
  on public.xau_bot_candles (asset, timeframe, time_utc desc);

alter table public.xau_bot_state enable row level security;
alter table public.xau_bot_trades enable row level security;
alter table public.xau_bot_events enable row level security;
alter table public.xau_bot_metrics enable row level security;
alter table public.xau_bot_candles enable row level security;

-- Admin-only while live validation continues.
drop policy if exists "xau bot admin read state" on public.xau_bot_state;
create policy "xau bot admin read state"
on public.xau_bot_state for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists "xau bot admin read trades" on public.xau_bot_trades;
create policy "xau bot admin read trades"
on public.xau_bot_trades for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists "xau bot admin read events" on public.xau_bot_events;
create policy "xau bot admin read events"
on public.xau_bot_events for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists "xau bot admin read metrics" on public.xau_bot_metrics;
create policy "xau bot admin read metrics"
on public.xau_bot_metrics for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

drop policy if exists "xau bot admin read candles" on public.xau_bot_candles;
create policy "xau bot admin read candles"
on public.xau_bot_candles for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and coalesce(p.is_admin, false) = true
  )
);

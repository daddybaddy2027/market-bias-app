-- AI Market Expert: XAUUSD Live Shadow Bot V1
-- Run once in Supabase SQL Editor before enabling the XAU Bot page.
-- Read access is Pro/Models subscribers + admins only.
-- Local backend writes with SUPABASE_SECRET_KEY / service role.

begin;

create table if not exists public.xau_bot_state (
  id text primary key,
  updated_at timestamptz not null default now(),
  status text not null default 'INITIALIZING',
  mode text not null default 'LIVE_SHADOW',
  starting_balance_usd numeric not null default 500,
  balance_usd numeric not null default 500,
  equity_usd numeric not null default 500,
  realized_pnl_usd numeric not null default 0,
  open_pnl_usd numeric not null default 0,
  total_pips numeric not null default 0,
  total_trades integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  win_rate numeric,
  profit_factor numeric,
  max_drawdown_usd numeric not null default 0,
  max_drawdown_pct numeric not null default 0,
  best_trade_usd numeric,
  worst_trade_usd numeric,
  open_positions integer not null default 0,
  max_open_positions integer not null default 3,
  current_price numeric,
  h1_regime text,
  prediction_side text,
  prediction_confidence numeric,
  pending_route text,
  next_decision_at timestamptz,
  source_version text,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.xau_bot_trades (
  trade_id text primary key,
  move_id text,
  prediction_time timestamptz,
  trigger_time timestamptz,
  entry_time timestamptz not null,
  exit_time timestamptz,
  side smallint not null check (side in (-1, 1)),
  route text not null,
  status text not null check (status in ('open', 'closed', 'cancelled')),
  entry_price numeric not null,
  sl_price numeric not null,
  tp_price numeric not null,
  be_price numeric,
  exit_price numeric,
  lot_size numeric not null default 0.01,
  initial_risk_usd numeric,
  r_result numeric,
  pnl_usd numeric,
  pips numeric,
  exit_reason text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xau_bot_trades_entry_time_idx
  on public.xau_bot_trades (entry_time desc);
create index if not exists xau_bot_trades_status_idx
  on public.xau_bot_trades (status, entry_time desc);

create table if not exists public.xau_bot_equity (
  time_utc timestamptz primary key,
  balance_usd numeric not null,
  equity_usd numeric not null,
  realized_pnl_usd numeric not null default 0,
  open_pnl_usd numeric not null default 0,
  drawdown_usd numeric not null default 0,
  drawdown_pct numeric not null default 0,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.xau_bot_candles (
  timeframe text not null check (timeframe in ('M15', 'H1')),
  time_utc timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric,
  primary key (timeframe, time_utc)
);

create index if not exists xau_bot_candles_tf_time_idx
  on public.xau_bot_candles (timeframe, time_utc desc);

insert into public.xau_bot_state (
  id, status, mode, starting_balance_usd, balance_usd, equity_usd,
  max_open_positions, source_version
)
values (
  'live', 'INITIALIZING', 'LIVE_SHADOW', 500, 500, 500, 3,
  'xau-tabular-2way-drop-short-aligned-cap3-v1'
)
on conflict (id) do nothing;

insert into public.xau_bot_equity (
  time_utc, balance_usd, equity_usd, realized_pnl_usd,
  open_pnl_usd, drawdown_usd, drawdown_pct
)
values (now(), 500, 500, 0, 0, 0, 0)
on conflict do nothing;

alter table public.xau_bot_state enable row level security;
alter table public.xau_bot_trades enable row level security;
alter table public.xau_bot_equity enable row level security;
alter table public.xau_bot_candles enable row level security;

-- Browser clients can only read through the authenticated Pro/Admin RLS policies below.
grant select on public.xau_bot_state to authenticated;
grant select on public.xau_bot_trades to authenticated;
grant select on public.xau_bot_equity to authenticated;
grant select on public.xau_bot_candles to authenticated;

-- The local Python shadow backend authenticates as service_role and requires
-- explicit table privileges in addition to bypassing RLS.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.xau_bot_state to service_role;
grant select, insert, update, delete on public.xau_bot_trades to service_role;
grant select, insert, update, delete on public.xau_bot_equity to service_role;
grant select, insert, update, delete on public.xau_bot_candles to service_role;

revoke all on public.xau_bot_state from anon;
revoke all on public.xau_bot_trades from anon;
revoke all on public.xau_bot_equity from anon;
revoke all on public.xau_bot_candles from anon;

drop policy if exists "Pro can read XAU bot state" on public.xau_bot_state;
create policy "Pro can read XAU bot state"
  on public.xau_bot_state for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (
          p.is_admin = true
          or (
            p.subscription_status in ('active', 'trialing')
            and (p.subscription_expires_at is null or p.subscription_expires_at > now())
            and (p.models_access = true or p.plan = 'pro')
          )
        )
    )
  );

drop policy if exists "Pro can read XAU bot trades" on public.xau_bot_trades;
create policy "Pro can read XAU bot trades"
  on public.xau_bot_trades for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (
          p.is_admin = true
          or (
            p.subscription_status in ('active', 'trialing')
            and (p.subscription_expires_at is null or p.subscription_expires_at > now())
            and (p.models_access = true or p.plan = 'pro')
          )
        )
    )
  );

drop policy if exists "Pro can read XAU bot equity" on public.xau_bot_equity;
create policy "Pro can read XAU bot equity"
  on public.xau_bot_equity for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (
          p.is_admin = true
          or (
            p.subscription_status in ('active', 'trialing')
            and (p.subscription_expires_at is null or p.subscription_expires_at > now())
            and (p.models_access = true or p.plan = 'pro')
          )
        )
    )
  );

drop policy if exists "Pro can read XAU bot candles" on public.xau_bot_candles;
create policy "Pro can read XAU bot candles"
  on public.xau_bot_candles for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and (
          p.is_admin = true
          or (
            p.subscription_status in ('active', 'trialing')
            and (p.subscription_expires_at is null or p.subscription_expires_at > now())
            and (p.models_access = true or p.plan = 'pro')
          )
        )
    )
  );

commit;

-- AI Market Expert: XAUUSD public live-shadow read access
-- Browser clients may read the paper/shadow board without signing in.
-- Only service_role keeps write privileges.

begin;

grant select on table public.xau_bot_state to anon, authenticated;
grant select on table public.xau_bot_trades to anon, authenticated;
grant select on table public.xau_bot_equity to anon, authenticated;
grant select on table public.xau_bot_candles to anon, authenticated;

-- No browser write privileges.
revoke insert, update, delete on table public.xau_bot_state from anon, authenticated;
revoke insert, update, delete on table public.xau_bot_trades from anon, authenticated;
revoke insert, update, delete on table public.xau_bot_equity from anon, authenticated;
revoke insert, update, delete on table public.xau_bot_candles from anon, authenticated;

drop policy if exists "Public can read XAU bot state" on public.xau_bot_state;
create policy "Public can read XAU bot state"
on public.xau_bot_state for select
to anon, authenticated
using (true);

drop policy if exists "Public can read XAU bot trades" on public.xau_bot_trades;
create policy "Public can read XAU bot trades"
on public.xau_bot_trades for select
to anon, authenticated
using (true);

drop policy if exists "Public can read XAU bot equity" on public.xau_bot_equity;
create policy "Public can read XAU bot equity"
on public.xau_bot_equity for select
to anon, authenticated
using (true);

drop policy if exists "Public can read XAU bot candles" on public.xau_bot_candles;
create policy "Public can read XAU bot candles"
on public.xau_bot_candles for select
to anon, authenticated
using (true);

commit;

-- AI MARKET EXPERT: final 13-model board verification
-- Run after backend_integration/13_upload_to_supabase.py succeeds.

create index if not exists predictions_model_key_time_idx
on public.predictions (model_key, prediction_time_utc desc);

-- Market-state payload must contain exactly 13 model cards.
select
  tier,
  payload->>'modelBoardVersion' as board_version,
  jsonb_array_length(payload->'assets') as asset_count,
  payload->'counts'->>'free_models_total' as free_models,
  payload->'counts'->>'pro_models_total' as pro_models,
  generated_at
from public.market_state_latest
order by tier;

-- Exact identity and access split. Expected: 2 Free, 11 Pro.
select
  tier,
  asset->>'model_key' as model_key,
  asset->>'asset' as asset,
  (asset->>'horizon_h')::int as horizon_h,
  asset->>'access_tier' as access_tier,
  asset->>'model_family' as model_family,
  asset->>'model_mode' as model_mode,
  asset->>'performance_source' as performance_source,
  asset->>'bias' as current_bias,
  asset->>'locked' as locked
from public.market_state_latest state,
lateral jsonb_array_elements(state.payload->'assets') asset
order by tier, asset->>'model_key';

-- Free payload: only two model keys may expose current output.
select
  asset->>'model_key' as model_key,
  asset->>'access_tier' as access_tier,
  asset->>'locked' as locked,
  asset->>'bias' as visible_bias,
  asset->>'prob_up' as visible_probability,
  asset->>'expectedMove' as visible_move
from public.market_state_latest state,
lateral jsonb_array_elements(state.payload->'assets') asset
where state.tier = 'free'
order by asset->>'model_key';

-- Verified history rows for the two explicitly promoted old models.
select
  model_key,
  count(*) filter (where evaluation_status = 'evaluated') as evaluated,
  count(*) filter (where direction_hit is true) as hits,
  round(
    count(*) filter (where direction_hit is true)::numeric /
    nullif(count(*) filter (where direction_hit is not null), 0),
    4
  ) as direction_accuracy,
  count(*) filter (
    where coalesce((payload->>'is_non_overlapping')::boolean, false)
  ) as independent_n,
  count(*) filter (
    where coalesce((payload->>'is_non_overlapping')::boolean, false)
      and direction_hit is true
  ) as independent_hits
from public.predictions
where model_key in (
  'EURUSD_3H_PROD_V1',
  'EURUSD_12H_FINAL_APP_V2'
)
  and prediction_time_utc >= '2026-07-13T00:00:00Z'
  and prediction_time_utc < '2026-07-16T00:00:00Z'
group by model_key
order by model_key;

-- Expected verified summary:
-- EURUSD_3H_PROD_V1:         evaluated 21, hits 15, accuracy .7143, independent 10/8
-- EURUSD_12H_FINAL_APP_V2:   evaluated  6, hits  6, accuracy 1.0000, independent  2/2

-- V3 predictions must remain labelled as evaluation + live verification.
select
  model_key,
  count(*) as rows,
  count(*) filter (where evaluation_status = 'evaluated') as live_resolved,
  count(*) filter (where evaluation_status = 'pending') as live_pending
from public.predictions
where model_key like '%_V3_STRICT'
group by model_key
order by model_key;

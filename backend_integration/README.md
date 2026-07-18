# Final 13-model integration

This folder connects the existing local production pipeline, the seven V3 shadow models, Supabase, and the final frontend catalog.

## Final public catalog

Free:

1. `EURUSD_3H_PROD_V1`
2. `USDJPY_6H_V3_STRICT`

Pro:

3. `USDJPY_12H_MLP_WIDE`
4. `GBPJPY_12H_LEGACY`
5. `EURUSD_12H_FINAL_APP_V2`
6. `EURUSD_12H_MLP_COMBINED`
7. `GBPUSD_12H_FINAL_APP_V2`
8. `EURUSD_3H_V3_STRICT`
9. `EURUSD_6H_V3_STRICT`
10. `GBPUSD_6H_V3_STRICT`
11. `USDJPY_12H_V3_STRICT`
12. `AUDUSD_6H_V3_STRICT`
13. `XAUUSD_6H_V3_STRICT`

## Performance labels

- `Verified live accuracy` is used only for stored real prediction history.
- `Independent non-overlapping sample` is a subset of those same stored rows.
- `Evaluation accuracy` is purged out-of-sample walk-forward performance.
- V3 models remain marked `Live verification in progress` while real outcomes accumulate.

The public verified statistics are checked against stored rows before upload:

- EURUSD 3h Production: 15/21 = 71.4%; independent 8/10 = 80.0%.
- EURUSD 12h Final V2: 6/6 = 100%; average signed result +33.4 pips; independent 2/2.

## Install into the local backend

From PowerShell inside the frontend repository:

```powershell
cd C:\Users\Veljko\Desktop\AI-Market-Bias-App\market-bias-app
powershell -ExecutionPolicy Bypass -File .\backend_integration\install_into_backend.ps1
```

The installer:

- copies this folder to `C:\Users\Veljko\Desktop\Multi-asset-12h\backend_integration`;
- copies `live_model_policy.json` to the backend root;
- backs up and patches `04_run_live_scheduler.py` so cloud upload uses `13_upload_to_supabase.py`.

## First manual run

The old pipeline must already have produced:

```text
C:\Users\Veljko\Desktop\Multi-asset-12h\live_outputs\app_signals_latest.json
C:\Users\Veljko\Desktop\Multi-asset-12h\live_outputs\live_performance_full_report.csv
```

Then run:

```powershell
cd C:\Users\Veljko\Desktop\Multi-asset-12h
python -u .\backend_integration\merge_13_model_board.py
python -u .\backend_integration\build_verified_history_backfill.py
python -u .\backend_integration\13_upload_to_supabase.py
```

`build_verified_history_backfill.py` refuses to publish the two promoted statistics if the stored rows do not reproduce the expected counts. That failure is intentional.

## V3 live source

The merger looks for the first available file:

```text
live_outputs\v3_shadow_live\logs\latest_shadow_predictions.csv
live_outputs\v3_shadow_live\logs\shadow_predictions.parquet
live_outputs\v3_shadow_live\reports\shadow_recent_predictions.csv
```

When the V3 runner has not produced a row yet, the model still appears on the board with `Live verification in progress`, while the current forecast remains `Awaiting live output`.

## Supabase verification

After a successful upload, run `verify_13_model_board.sql` in Supabase SQL Editor. Expected market-state counts:

```text
13 total models
2 Free
11 Pro
```

Expected verified history:

```text
EURUSD_3H_PROD_V1       21 evaluated, 15 hits, independent 8/10
EURUSD_12H_FINAL_APP_V2  6 evaluated,  6 hits, independent 2/2
```

## Frontend

The frontend branch uses:

- `src/config/modelCatalog.ts` as the single 13-model product catalog;
- exact `model_key` access rules in `src/config/access.ts`;
- `src/services/modelHistory.ts` for exact per-model history;
- separate evaluation, verified-live, independent and live-verification labels.

The price remains `€24.99/month`.

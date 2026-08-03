from __future__ import annotations

from pathlib import Path
import importlib.util
import json
import shutil
import subprocess
import sys
from typing import Any

import numpy as np
import pandas as pd

from model_policy_adapter import FINAL_MODEL_TIERS, configure_uploader, derive_model_key

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
INTEGRATION_DIR = BASE_DIR / "backend_integration"
LIVE_OUT_DIR = BASE_DIR / "live_outputs"
LEGACY_UPLOADER = BASE_DIR / "10_upload_to_supabase.py"
POLICY_SOURCE = INTEGRATION_DIR / "live_model_policy.json"
POLICY_TARGET = BASE_DIR / "live_model_policy.json"
APP_SIGNALS_PATH = LIVE_OUT_DIR / "app_signals_latest.json"
ORIGINAL_HISTORY = LIVE_OUT_DIR / "live_performance_full_report.csv"
FILTERED_HISTORY = LIVE_OUT_DIR / "live_performance_production_integrity_v2.csv"
ACTIVE_KEYS = set(FINAL_MODEL_TIERS)


def run(path: Path) -> None:
    subprocess.run([sys.executable, "-u", str(path)], cwd=BASE_DIR, check=True)


def load_uploader(path: Path):
    spec = importlib.util.spec_from_file_location("supabase_uploader_legacy", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def series(frame: pd.DataFrame, name: str, default: Any = "") -> pd.Series:
    if name in frame.columns:
        return frame[name]
    return pd.Series(default, index=frame.index)


def as_bool(values: pd.Series) -> pd.Series:
    return values.astype(str).str.strip().str.lower().isin(
        {"1", "1.0", "true", "yes", "y", "hit"}
    )


def direction_series(frame: pd.DataFrame) -> pd.Series:
    pred_dir = pd.to_numeric(series(frame, "pred_dir", 0), errors="coerce").fillna(0)
    bias = series(frame, "bias", "").fillna("").astype(str).str.lower()
    inferred = pd.Series(0.0, index=frame.index)
    inferred.loc[bias.str.contains("bull|buy|long", regex=True)] = 1.0
    inferred.loc[bias.str.contains("bear|sell|short", regex=True)] = -1.0
    return pred_dir.where(pred_dir != 0, inferred)


def first_numeric(frame: pd.DataFrame, names: list[str]) -> pd.Series:
    result = pd.Series(np.nan, index=frame.index, dtype="float64")
    for name in names:
        if name not in frame.columns:
            continue
        candidate = pd.to_numeric(frame[name], errors="coerce")
        result = result.where(result.notna(), candidate)
    return result


def normalize_pips(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    direction = direction_series(frame)
    start = first_numeric(
        frame,
        ["start_price", "start_price_used", "current_price", "currentPrice", "close"],
    )
    actual = first_numeric(frame, ["actual_close", "terminal_close", "end_price"])
    assets = series(frame, "asset", "").fillna("").astype(str).str.upper()
    pip_size = pd.Series(0.0001, index=frame.index, dtype="float64")
    pip_size.loc[assets.str.endswith("JPY")] = 0.01

    recomputed = direction * (actual - start) / pip_size
    existing = first_numeric(frame, ["signed_pips", "net_pips", "gross_pips"])
    normalized = recomputed.where(recomputed.notna(), existing)

    frame["signed_pips"] = normalized
    frame["net_pips"] = normalized
    return frame


def mark_non_overlapping(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    frame["is_non_overlapping"] = False

    for model_key, indexes in frame.groupby("model_key").groups.items():
        ordered = frame.loc[list(indexes)].sort_values("prediction_time_utc")
        last_selected: pd.Timestamp | None = None

        for index, row in ordered.iterrows():
            current = row["prediction_time_utc"]
            horizon = int(float(row.get("horizon_h", 0) or 0))
            if pd.isna(current) or horizon <= 0:
                continue
            if last_selected is None or current >= last_selected + pd.Timedelta(hours=horizon):
                frame.at[index, "is_non_overlapping"] = True
                last_selected = current

    return frame


def normalize_history(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    if "prediction_time_utc" not in frame.columns and "time_utc" in frame.columns:
        frame["prediction_time_utc"] = frame["time_utc"]
    if "prediction_time_utc" not in frame.columns:
        raise RuntimeError("History frame has no prediction_time_utc/time_utc column")

    frame["prediction_time_utc"] = pd.to_datetime(
        frame["prediction_time_utc"], utc=True, errors="coerce"
    )
    frame = frame.dropna(subset=["prediction_time_utc"]).copy()
    frame["model_key"] = frame.apply(derive_model_key, axis=1)
    frame = frame[frame["model_key"].isin(ACTIVE_KEYS)].copy()

    bias = series(frame, "bias", "").fillna("").astype(str).str.lower()
    frame = frame[~bias.str.contains("neutral")].copy()

    if "production_signal" in frame.columns:
        frame = frame[as_bool(frame["production_signal"])].copy()
    if "publish_prediction" in frame.columns:
        frame = frame[as_bool(frame["publish_prediction"])].copy()

    frame["model_id"] = frame["model_key"]
    frame["tier"] = "pro"
    frame = normalize_pips(frame)

    keys = [
        name
        for name in ["asset", "horizon_h", "prediction_time_utc", "model_key"]
        if name in frame.columns
    ]
    frame = frame.sort_values("prediction_time_utc").drop_duplicates(
        subset=keys, keep="last"
    )
    frame = mark_non_overlapping(frame)
    return frame


def build_filtered_history() -> None:
    if not ORIGINAL_HISTORY.exists():
        raise FileNotFoundError(ORIGINAL_HISTORY)

    filtered = normalize_history(pd.read_csv(ORIGINAL_HISTORY))
    filtered["prediction_time_utc"] = filtered["prediction_time_utc"].astype(str)
    FILTERED_HISTORY.parent.mkdir(parents=True, exist_ok=True)
    filtered.to_csv(FILTERED_HISTORY, index=False)

    counts = filtered.groupby("model_key").size().to_dict()
    independent = (
        filtered[filtered["is_non_overlapping"]]
        .groupby("model_key")
        .size()
        .to_dict()
    )
    print(
        "Filtered production history:",
        FILTERED_HISTORY,
        "rows=",
        len(filtered),
        "all_counts=",
        counts,
        "independent_counts=",
        independent,
    )


def filter_collection(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []

    selected: dict[str, dict[str, Any]] = {}
    for raw in items:
        if not isinstance(raw, dict):
            continue
        key = derive_model_key(raw)
        if key not in ACTIVE_KEYS:
            continue
        item = dict(raw)
        item["model_key"] = key
        item["model_id"] = key
        item["access_tier"] = "pro"
        selected[key] = item

    return [selected[key] for key in FINAL_MODEL_TIERS if key in selected]


def filter_app_signals() -> None:
    if not APP_SIGNALS_PATH.exists():
        raise FileNotFoundError(APP_SIGNALS_PATH)

    payload = json.loads(APP_SIGNALS_PATH.read_text(encoding="utf-8"))
    before = len(payload.get("assets", []) or [])

    for field in ["assets", "prediction_engines", "model_catalog", "models"]:
        if field in payload:
            payload[field] = filter_collection(payload.get(field))

    payload["modelBoardVersion"] = "production-integrity-v2"
    payload["modelBoardCount"] = len(payload.get("assets", []) or [])
    payload["freeModelCount"] = 0
    payload["proModelCount"] = len(payload.get("assets", []) or [])
    payload["productionModelKeys"] = list(FINAL_MODEL_TIERS)

    APP_SIGNALS_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        "Filtered app signals:",
        f"before={before}",
        f"after={len(payload.get('assets', []) or [])}",
        f"keys={list(FINAL_MODEL_TIERS)}",
    )


def main() -> None:
    print("=" * 100)
    print("PRODUCTION INTEGRITY V2 - THREE MODEL UPLOAD")
    print("=" * 100)

    if not LEGACY_UPLOADER.exists():
        raise FileNotFoundError(LEGACY_UPLOADER)
    if POLICY_SOURCE.exists():
        shutil.copy2(POLICY_SOURCE, POLICY_TARGET)

    # The old merger may still collect research outputs locally. Immediately
    # after it runs, the strict production allowlist removes them from every
    # public payload before Supabase sees anything.
    legacy_merger = INTEGRATION_DIR / "merge_13_model_board.py"
    if legacy_merger.exists():
        run(legacy_merger)

    filter_app_signals()
    build_filtered_history()

    uploader = load_uploader(LEGACY_UPLOADER)
    configure_uploader(uploader, POLICY_TARGET, FILTERED_HISTORY)
    uploader.main()


if __name__ == "__main__":
    main()

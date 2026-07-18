from __future__ import annotations

from pathlib import Path
from typing import Dict, List
import argparse
import json

import numpy as np
import pandas as pd

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
LIVE_OUT_DIR = BASE_DIR / "live_outputs"
DEFAULT_INPUT = LIVE_OUT_DIR / "live_performance_full_report.csv"
DEFAULT_OUTPUT = LIVE_OUT_DIR / "verified_history_backfill.csv"
DEFAULT_SUMMARY = LIVE_OUT_DIR / "verified_history_summary.json"

SAMPLE_START_UTC = pd.Timestamp("2026-07-13 00:00:00", tz="UTC")
SAMPLE_END_UTC = pd.Timestamp("2026-07-16 00:00:00", tz="UTC")

SPECS = {
    "EURUSD_3H_PROD_V1": {
        "asset": "EURUSD",
        "horizon_h": 3,
        "expected_n": 21,
        "expected_hits": 15,
        "expected_independent_n": 10,
        "expected_independent_hits": 8,
        "verified_accuracy": 0.714,
        "independent_accuracy": 0.80,
    },
    "EURUSD_12H_FINAL_APP_V2": {
        "asset": "EURUSD",
        "horizon_h": 12,
        "expected_n": 6,
        "expected_hits": 6,
        "expected_independent_n": 2,
        "expected_independent_hits": 2,
        "verified_accuracy": 1.0,
        "independent_accuracy": 1.0,
        "expected_average_signed_pips": 33.4,
    },
}


def as_bool_series(series: pd.Series) -> pd.Series:
    text = series.astype(str).str.strip().str.lower()
    return text.isin({"1", "1.0", "true", "yes", "hit"})


def choose_model_key(frame: pd.DataFrame) -> pd.Series:
    model_key = frame.get("model_key", pd.Series("", index=frame.index)).fillna("").astype(str).str.upper()
    model_id = frame.get("model_id", pd.Series("", index=frame.index)).fillna("").astype(str).str.upper()
    family = frame.get("model_family", pd.Series("", index=frame.index)).fillna("").astype(str).str.lower()
    source = frame.get("source", pd.Series("", index=frame.index)).fillna("").astype(str).str.lower()
    asset = frame.get("asset", pd.Series("", index=frame.index)).fillna("").astype(str).str.upper()
    horizon = pd.to_numeric(frame.get("horizon_h", 0), errors="coerce").fillna(0).astype(int)

    out = model_key.copy()
    prod_mask = (
        (asset == "EURUSD")
        & (horizon == 3)
        & ((family == "prod_v1") | (source == "prod_v1") | model_id.str.contains("PROD_V1"))
    )
    final_mask = (
        (asset == "EURUSD")
        & (horizon == 12)
        & (
            (family == "clean_pro_final_app_v2")
            | (source == "final_app_v2")
            | model_id.str.contains("FINAL_APP_V2")
        )
    )
    out.loc[prod_mask] = "EURUSD_3H_PROD_V1"
    out.loc[final_mask] = "EURUSD_12H_FINAL_APP_V2"
    return out


def direction_active(frame: pd.DataFrame) -> pd.Series:
    pred_dir = pd.to_numeric(frame.get("pred_dir", 0), errors="coerce").fillna(0)
    bias = frame.get("bias", pd.Series("", index=frame.index)).fillna("").astype(str).str.lower()
    visible = as_bool_series(frame.get("visible", pd.Series(False, index=frame.index)))
    eligible = as_bool_series(frame.get("direction_eligible", pd.Series(False, index=frame.index)))

    has_direction = (pred_dir != 0) | bias.isin({"bullish", "bearish"})
    is_public_signal = visible | eligible
    return has_direction & is_public_signal


def mark_non_overlapping(frame: pd.DataFrame, horizon_h: int) -> pd.Series:
    selected = pd.Series(False, index=frame.index)
    last_time = None
    for index, row in frame.sort_values("prediction_time_utc").iterrows():
        current = row["prediction_time_utc"]
        if last_time is None or current >= last_time + pd.Timedelta(hours=horizon_h):
            selected.loc[index] = True
            last_time = current
    return selected


def compute_signed_pips(frame: pd.DataFrame, asset: str) -> pd.Series:
    for column in ["net_pips", "signed_pips", "gross_pips"]:
        if column in frame.columns:
            values = pd.to_numeric(frame[column], errors="coerce")
            if values.notna().any():
                return values

    actual_return = pd.to_numeric(
        frame.get("actual_log_return", frame.get("actual_return", np.nan)),
        errors="coerce",
    )
    pred_dir = pd.to_numeric(frame.get("pred_dir", 0), errors="coerce").fillna(0)
    start_price = pd.to_numeric(
        frame.get("start_price_used", frame.get("current_price", np.nan)),
        errors="coerce",
    )
    actual_close = pd.to_numeric(frame.get("actual_close", np.nan), errors="coerce")
    pip_size = 0.01 if "JPY" in asset else 0.0001

    from_prices = pred_dir * (actual_close - start_price) / pip_size
    from_returns = pred_dir * actual_return * start_price / pip_size
    return from_prices.where(from_prices.notna(), from_returns)


def build(input_path: Path, output_path: Path, summary_path: Path, strict: bool = True) -> Dict[str, Dict]:
    if not input_path.exists():
        raise FileNotFoundError(input_path)

    frame = pd.read_csv(input_path)
    if "prediction_time_utc" not in frame.columns:
        if "time_utc" in frame.columns:
            frame["prediction_time_utc"] = frame["time_utc"]
        else:
            raise RuntimeError("History input has no prediction_time_utc/time_utc column")

    frame["prediction_time_utc"] = pd.to_datetime(frame["prediction_time_utc"], utc=True, errors="coerce")
    frame = frame.dropna(subset=["prediction_time_utc"]).copy()
    frame["model_key"] = choose_model_key(frame)
    frame["evaluation_status"] = frame.get("evaluation_status", "evaluated").fillna("evaluated").astype(str).str.lower()

    frame = frame[
        (frame["prediction_time_utc"] >= SAMPLE_START_UTC)
        & (frame["prediction_time_utc"] < SAMPLE_END_UTC)
    ].copy()

    output_rows: List[pd.DataFrame] = []
    summary: Dict[str, Dict] = {}

    for model_key, spec in SPECS.items():
        rows = frame[
            (frame["model_key"] == model_key)
            & (frame.get("asset", "").astype(str).str.upper() == spec["asset"])
            & (pd.to_numeric(frame.get("horizon_h", 0), errors="coerce") == spec["horizon_h"])
            & (frame["evaluation_status"] == "evaluated")
        ].copy()

        rows = rows[direction_active(rows)].copy()
        rows = rows.sort_values("prediction_time_utc").drop_duplicates(
            subset=["prediction_time_utc", "model_key"], keep="last"
        )
        rows["direction_hit"] = as_bool_series(
            rows.get("direction_hit", pd.Series(False, index=rows.index))
        )
        rows["is_non_overlapping"] = mark_non_overlapping(rows, spec["horizon_h"])
        rows["performance_source"] = "verified_live_history"
        rows["history_source"] = "verified_local_live_log"
        rows["sample_period"] = "2026-07-13_to_2026-07-15"
        rows["net_pips"] = compute_signed_pips(rows, spec["asset"])

        n = int(len(rows))
        hits = int(rows["direction_hit"].sum())
        independent = rows[rows["is_non_overlapping"]]
        independent_n = int(len(independent))
        independent_hits = int(independent["direction_hit"].sum())
        avg_signed_pips = float(rows["net_pips"].mean()) if rows["net_pips"].notna().any() else None

        actual = {
            "n": n,
            "hits": hits,
            "accuracy": hits / n if n else None,
            "independent_n": independent_n,
            "independent_hits": independent_hits,
            "independent_accuracy": independent_hits / independent_n if independent_n else None,
            "average_signed_pips": avg_signed_pips,
        }
        expected = {
            "n": spec["expected_n"],
            "hits": spec["expected_hits"],
            "independent_n": spec["expected_independent_n"],
            "independent_hits": spec["expected_independent_hits"],
        }
        checks = {key: actual[key] == value for key, value in expected.items()}
        summary[model_key] = {
            "actual": actual,
            "expected": expected,
            "checks": checks,
            "passed": all(checks.values()),
        }

        if strict and not all(checks.values()):
            diagnostics = rows[
                [
                    column
                    for column in [
                        "prediction_time_utc",
                        "bias",
                        "pred_dir",
                        "visible",
                        "direction_eligible",
                        "direction_hit",
                    ]
                    if column in rows.columns
                ]
            ].to_dict(orient="records")
            raise RuntimeError(
                f"Verified history mismatch for {model_key}: actual={actual}, expected={expected}. "
                f"Selected rows={diagnostics}. Nothing was written because public statistics must match stored rows."
            )

        output_rows.append(rows)

    result = pd.concat(output_rows, ignore_index=True) if output_rows else pd.DataFrame()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(output_path, index=False)
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--allow-mismatch", action="store_true")
    args = parser.parse_args()

    summary = build(args.input, args.output, args.summary, strict=not args.allow_mismatch)
    print(json.dumps(summary, indent=2, default=str))
    print("Saved:", args.output)


if __name__ == "__main__":
    main()

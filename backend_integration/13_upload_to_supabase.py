from __future__ import annotations

from pathlib import Path
import importlib.util
import shutil
import subprocess
import sys

import pandas as pd

from model_policy_adapter import FINAL_MODEL_TIERS, configure_uploader, derive_model_key

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
INTEGRATION_DIR = BASE_DIR / "backend_integration"
LIVE_OUT_DIR = BASE_DIR / "live_outputs"
LEGACY_UPLOADER = BASE_DIR / "10_upload_to_supabase.py"
POLICY_SOURCE = INTEGRATION_DIR / "live_model_policy.json"
POLICY_TARGET = BASE_DIR / "live_model_policy.json"
ORIGINAL_HISTORY = LIVE_OUT_DIR / "live_performance_full_report.csv"
VERIFIED_HISTORY = LIVE_OUT_DIR / "verified_history_backfill.csv"
COMBINED_HISTORY = LIVE_OUT_DIR / "live_performance_13_models.csv"

VERIFIED_KEYS = {
    "EURUSD_3H_PROD_V1",
    "EURUSD_12H_FINAL_APP_V2",
}
VERIFIED_START_UTC = pd.Timestamp("2026-07-13 00:00:00", tz="UTC")
VERIFIED_END_UTC = pd.Timestamp("2026-07-16 00:00:00", tz="UTC")


def run(path: Path) -> None:
    subprocess.run([sys.executable, "-u", str(path)], cwd=BASE_DIR, check=True)


def load_uploader(path: Path):
    spec = importlib.util.spec_from_file_location("supabase_uploader_legacy", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def normalize_history(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    if "prediction_time_utc" not in frame.columns and "time_utc" in frame.columns:
        frame["prediction_time_utc"] = frame["time_utc"]
    if "prediction_time_utc" not in frame.columns:
        raise RuntimeError("History frame has no prediction_time_utc/time_utc column")

    frame["prediction_time_utc"] = pd.to_datetime(
        frame["prediction_time_utc"],
        utc=True,
        errors="coerce",
    )
    frame = frame.dropna(subset=["prediction_time_utc"]).copy()
    frame["model_key"] = frame.apply(derive_model_key, axis=1)
    return frame


def build_combined_history() -> None:
    if not ORIGINAL_HISTORY.exists():
        raise FileNotFoundError(ORIGINAL_HISTORY)
    if not VERIFIED_HISTORY.exists():
        raise FileNotFoundError(VERIFIED_HISTORY)

    original = normalize_history(pd.read_csv(ORIGINAL_HISTORY))
    verified = normalize_history(pd.read_csv(VERIFIED_HISTORY))

    # Replace only the frozen public sample window for the two promoted models.
    # Rows before/after the sample remain available for ongoing live tracking.
    frozen_mask = (
        original["model_key"].isin(VERIFIED_KEYS)
        & (original["prediction_time_utc"] >= VERIFIED_START_UTC)
        & (original["prediction_time_utc"] < VERIFIED_END_UTC)
    )
    removed = int(frozen_mask.sum())
    original = original.loc[~frozen_mask].copy()

    combined = pd.concat([original, verified], ignore_index=True, sort=False)
    combined = combined[combined["model_key"].isin(FINAL_MODEL_TIERS)].copy()
    combined["model_id"] = combined["model_key"]

    keys = [
        column
        for column in ["asset", "horizon_h", "prediction_time_utc", "model_key"]
        if column in combined.columns
    ]
    combined = combined.sort_values("prediction_time_utc").drop_duplicates(
        subset=keys,
        keep="last",
    )
    combined["prediction_time_utc"] = combined["prediction_time_utc"].astype(str)
    combined.to_csv(COMBINED_HISTORY, index=False)

    frozen_after = combined[
        combined["model_key"].isin(VERIFIED_KEYS)
        & (pd.to_datetime(combined["prediction_time_utc"], utc=True) >= VERIFIED_START_UTC)
        & (pd.to_datetime(combined["prediction_time_utc"], utc=True) < VERIFIED_END_UTC)
    ]

    counts = frozen_after.groupby("model_key").size().to_dict()
    expected_counts = {
        "EURUSD_3H_PROD_V1": 21,
        "EURUSD_12H_FINAL_APP_V2": 6,
    }
    if counts != expected_counts:
        raise RuntimeError(
            f"Frozen verified window is not exact after replacement: actual={counts}, expected={expected_counts}"
        )

    print(
        "Combined history:",
        COMBINED_HISTORY,
        "rows=",
        len(combined),
        "replaced_original_rows=",
        removed,
        "verified_window_counts=",
        counts,
    )


def main() -> None:
    print("=" * 100)
    print("FINAL 13-MODEL UPLOAD")
    print("=" * 100)

    if not LEGACY_UPLOADER.exists():
        raise FileNotFoundError(LEGACY_UPLOADER)
    if POLICY_SOURCE.exists():
        shutil.copy2(POLICY_SOURCE, POLICY_TARGET)

    run(INTEGRATION_DIR / "merge_13_model_board.py")
    run(INTEGRATION_DIR / "build_verified_history_backfill.py")
    build_combined_history()

    uploader = load_uploader(LEGACY_UPLOADER)
    configure_uploader(uploader, POLICY_TARGET, COMBINED_HISTORY)
    uploader.main()


if __name__ == "__main__":
    main()

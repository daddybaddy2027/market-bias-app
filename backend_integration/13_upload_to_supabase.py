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


def run(path: Path) -> None:
    subprocess.run([sys.executable, "-u", str(path)], cwd=BASE_DIR, check=True)


def load_uploader(path: Path):
    spec = importlib.util.spec_from_file_location("supabase_uploader_legacy", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_combined_history() -> None:
    frames = []
    if ORIGINAL_HISTORY.exists():
        frames.append(pd.read_csv(ORIGINAL_HISTORY))
    if VERIFIED_HISTORY.exists():
        frames.append(pd.read_csv(VERIFIED_HISTORY))
    if not frames:
        raise FileNotFoundError("No performance history CSV was found")

    combined = pd.concat(frames, ignore_index=True, sort=False)
    if "prediction_time_utc" not in combined.columns and "time_utc" in combined.columns:
        combined["prediction_time_utc"] = combined["time_utc"]
    combined["model_key"] = combined.apply(derive_model_key, axis=1)
    combined = combined[combined["model_key"].isin(FINAL_MODEL_TIERS)].copy()
    combined["model_id"] = combined["model_key"]

    keys = [
        column
        for column in ["asset", "horizon_h", "prediction_time_utc", "model_key"]
        if column in combined.columns
    ]
    combined = combined.drop_duplicates(subset=keys, keep="last")
    combined.to_csv(COMBINED_HISTORY, index=False)
    print("Combined history:", COMBINED_HISTORY, "rows=", len(combined))


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

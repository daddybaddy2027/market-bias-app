from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
import json
import math
import shutil

import pandas as pd

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
LIVE_OUT_DIR = BASE_DIR / "live_outputs"
APP_SIGNALS_PATH = LIVE_OUT_DIR / "app_signals_latest.json"
SHADOW_ROOT = LIVE_OUT_DIR / "v3_shadow_live"
SHADOW_CANDIDATES = [
    SHADOW_ROOT / "logs" / "latest_shadow_predictions.csv",
    SHADOW_ROOT / "logs" / "shadow_predictions.parquet",
    SHADOW_ROOT / "reports" / "shadow_recent_predictions.csv",
]

V3_MODELS: Dict[Tuple[str, int], Dict[str, Any]] = {
    ("EURUSD", 3): {
        "model_key": "EURUSD_3H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.7474,
        "n": 293,
        "expectancy": 13.82,
        "pf": 4.48,
    },
    ("EURUSD", 6): {
        "model_key": "EURUSD_6H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.7237,
        "n": 76,
        "expectancy": 18.85,
        "pf": 4.24,
    },
    ("GBPUSD", 6): {
        "model_key": "GBPUSD_6H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.7692,
        "n": 52,
        "expectancy": 29.78,
        "pf": 5.57,
    },
    ("USDJPY", 6): {
        "model_key": "USDJPY_6H_V3_STRICT",
        "tier": "free",
        "accuracy": 0.7563,
        "n": 238,
        "expectancy": 28.52,
        "pf": 6.46,
    },
    ("USDJPY", 12): {
        "model_key": "USDJPY_12H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.7867,
        "n": 75,
        "expectancy": 37.90,
        "pf": 6.39,
    },
    ("AUDUSD", 6): {
        "model_key": "AUDUSD_6H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.7090,
        "n": 134,
        "expectancy": 12.28,
        "pf": 3.85,
    },
    ("XAUUSD", 6): {
        "model_key": "XAUUSD_6H_V3_STRICT",
        "tier": "pro",
        "accuracy": 0.6810,
        "n": 116,
        "expectancy": 110.33,
        "pf": 3.31,
    },
}

FINAL_KEYS = [
    "EURUSD_3H_PROD_V1",
    "USDJPY_6H_V3_STRICT",
    "USDJPY_12H_MLP_WIDE",
    "GBPJPY_12H_LEGACY",
    "EURUSD_12H_FINAL_APP_V2",
    "EURUSD_12H_MLP_COMBINED",
    "GBPUSD_12H_FINAL_APP_V2",
    "EURUSD_3H_V3_STRICT",
    "EURUSD_6H_V3_STRICT",
    "GBPUSD_6H_V3_STRICT",
    "USDJPY_12H_V3_STRICT",
    "AUDUSD_6H_V3_STRICT",
    "XAUUSD_6H_V3_STRICT",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_float(value: Any) -> Optional[float]:
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except Exception:
        return None


def safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(value))
    except Exception:
        return default


def first_value(row: Dict[str, Any], names: Iterable[str], default: Any = None) -> Any:
    for name in names:
        value = row.get(name)
        if value is not None and str(value).strip() not in {"", "nan", "None"}:
            return value
    return default


def normalize_side(value: Any) -> Tuple[str, int]:
    text = str(value or "").strip().lower()
    if text in {"long", "buy", "bull", "bullish", "1", "+1"}:
        return "Bullish", 1
    if text in {"short", "sell", "bear", "bearish", "-1"}:
        return "Bearish", -1
    return "Neutral", 0


def read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(path)
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def asset_identity(asset: Dict[str, Any]) -> str:
    symbol = str(asset.get("asset", asset.get("symbol", ""))).upper()
    horizon = safe_int(asset.get("horizon_h"), 0)
    model_id = str(asset.get("model_id") or "").upper()
    source = str(asset.get("source") or "").lower()
    family = str(asset.get("model_family") or "").lower()
    key = str(asset.get("model_key") or "").upper()

    if key in FINAL_KEYS:
        return key
    if symbol == "EURUSD" and horizon == 3 and (source == "prod_v1" or family == "prod_v1"):
        return "EURUSD_3H_PROD_V1"
    if symbol == "GBPJPY" and horizon == 12 and ("legacy" in source or "legacy" in family):
        return "GBPJPY_12H_LEGACY"
    if symbol == "EURUSD" and horizon == 12 and (source == "final_app_v2" or family == "clean_pro_final_app_v2"):
        return "EURUSD_12H_FINAL_APP_V2"
    if symbol == "GBPUSD" and horizon == 12 and (source == "final_app_v2" or family == "clean_pro_final_app_v2"):
        return "GBPUSD_12H_FINAL_APP_V2"
    if symbol == "USDJPY" and horizon == 12 and ("MLP" in model_id and "WIDE" in model_id):
        return "USDJPY_12H_MLP_WIDE"
    if symbol == "EURUSD" and horizon == 12 and ("MLP" in model_id or source == "mlp_live_v1"):
        return "EURUSD_12H_MLP_COMBINED"
    return key


def enrich_old_asset(asset: Dict[str, Any], key: str) -> Dict[str, Any]:
    out = deepcopy(asset)
    out["model_key"] = key
    out["model_id"] = key

    if key == "EURUSD_3H_PROD_V1":
        out.update({
            "access_tier": "free",
            "performance_source": "verified_live_history",
            "verified_live_accuracy": 0.714,
            "verified_live_n": 21,
            "verified_live_hits": 15,
            "independent_accuracy": 0.80,
            "independent_n": 10,
            "independent_hits": 8,
            "validation_note": "Verified live history 13–15 Jul 2026. Independent sample 8/10.",
        })
    elif key == "EURUSD_12H_FINAL_APP_V2":
        out.update({
            "access_tier": "pro",
            "performance_source": "verified_live_history",
            "verified_live_accuracy": 1.0,
            "verified_live_n": 6,
            "verified_live_hits": 6,
            "verified_average_signed_pips": 33.4,
            "independent_accuracy": 1.0,
            "independent_n": 2,
            "independent_hits": 2,
            "validation_note": "Small verified live sample: 6/6, average +33.4 pips, independent 2/2.",
        })
    elif key == "EURUSD_12H_MLP_COMBINED":
        out.update({
            "access_tier": "pro",
            "model_family": "mlp_live_v1",
            "model_group": "mlp_live_v1",
            "model_variants": ["EURUSD_12H_MLP_WIDE", "EURUSD_12H_MLP_CONS"],
            "evaluation_label": "Wide 81.0% n=21 | Conservative 70.0% n=20",
            "validation_note": "Two variants displayed as one family; exact history remains variant-keyed.",
        })
    elif key == "USDJPY_12H_MLP_WIDE":
        out.update({
            "access_tier": "pro",
            "model_family": "mlp_live_v1",
            "model_type": "range",
            "model_mode": "range_only",
            "validation_range_path_accuracy": 0.857,
            "validation_trades": 35,
        })
    elif key == "GBPJPY_12H_LEGACY":
        out.update({
            "access_tier": "pro",
            "model_type": "range",
            "model_mode": "range_only",
            "validation_range_path_accuracy": 0.933,
            "validation_trades": 164,
        })
    elif key == "GBPUSD_12H_FINAL_APP_V2":
        out.update({
            "access_tier": "pro",
            "performance_source": "walk_forward_evaluation",
            "validation_direction_accuracy": 1.0,
            "validation_trades": 5,
            "validation_note": "Very small evaluation sample; live verification is decisive.",
        })
    return out


def read_shadow_frame() -> pd.DataFrame:
    for path in SHADOW_CANDIDATES:
        if not path.exists():
            continue
        try:
            frame = pd.read_parquet(path) if path.suffix.lower() == ".parquet" else pd.read_csv(path)
            if len(frame):
                print(f"[V3] Using shadow source: {path}")
                return frame
        except Exception as exc:
            print(f"[WARN] Could not read {path}: {exc}")
    return pd.DataFrame()


def latest_shadow_rows(frame: pd.DataFrame) -> Dict[Tuple[str, int], Dict[str, Any]]:
    if frame.empty:
        return {}
    rows: Dict[Tuple[str, int], Dict[str, Any]] = {}
    for raw in frame.to_dict(orient="records"):
        symbol = str(first_value(raw, ["asset", "symbol", "instrument"], "")).upper()
        horizon = safe_int(first_value(raw, ["horizon_h", "horizon", "forecast_horizon_h"], 0), 0)
        key = (symbol, horizon)
        if key not in V3_MODELS:
            continue
        time_value = str(first_value(raw, ["prediction_time_utc", "time_utc", "feature_time_utc", "created_at"], ""))
        previous = rows.get(key)
        if previous is None or time_value >= str(previous.get("__time", "")):
            rows[key] = {**raw, "__time": time_value}
    return rows


def make_v3_asset(symbol: str, horizon: int, meta: Dict[str, Any], row: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    raw = row or {}
    bias, pred_dir = normalize_side(first_value(raw, ["final_shadow_side", "final_side", "signal_side", "candidate_side", "side", "bias"], "Neutral"))
    p_long = safe_float(first_value(raw, ["p_long", "prob_long", "ensemble_long", "long_probability"]))
    p_short = safe_float(first_value(raw, ["p_short", "prob_short", "ensemble_short", "short_probability"]))
    prob_up = safe_float(first_value(raw, ["prob_up", "p_up", "p_long", "ensemble_long"]))
    confidence = safe_float(first_value(raw, ["meta_probability", "meta_prob", "gate_probability", "confidence", "ensemble_confidence"]))
    lower = safe_float(first_value(raw, ["forecast_lower", "range_lower", "q10", "projected_low"]))
    median = safe_float(first_value(raw, ["forecast_median", "range_median", "q50", "predicted_close"]))
    upper = safe_float(first_value(raw, ["forecast_upper", "range_upper", "q90", "projected_high"]))
    current = safe_float(first_value(raw, ["entry_price", "current_price", "close", "prediction_price"]))
    prediction_time = str(first_value(raw, ["prediction_time_utc", "time_utc", "feature_time_utc", "created_at"], utc_now()))
    selected = first_value(raw, ["selected", "meta_selected", "final_selected", "signal_active"], False)
    selected_bool = str(selected).lower() in {"1", "true", "yes"} or selected is True

    if not row:
        bias, pred_dir = "Neutral", 0

    if lower is not None and upper is not None:
        range_text = f"{lower:.3f} – {upper:.3f}" if "JPY" in symbol or symbol == "XAUUSD" else f"{lower:.5f} – {upper:.5f}"
    else:
        range_text = "Awaiting live range"

    return {
        "asset": symbol,
        "symbol": symbol,
        "display": symbol,
        "horizon_h": horizon,
        "source": "v3_shadow_live_v1",
        "model_family": "v3_strict",
        "model_group": "v3_multi_asset_v1",
        "model_id": meta["model_key"],
        "model_key": meta["model_key"],
        "model_label": "V3 strict cross-asset ensemble",
        "access_tier": meta["tier"],
        "model_type": "direction",
        "model_mode": "live_verification",
        "performance_source": "walk_forward_evaluation",
        "validation_direction_accuracy": meta["accuracy"],
        "validation_trades": meta["n"],
        "validation_win_rate": meta["accuracy"],
        "validation_profit_factor": meta["pf"],
        "evaluation_expectancy_pips": meta["expectancy"],
        "validation_note": "Purged out-of-sample walk-forward evaluation. This is not live accuracy.",
        "time_utc": prediction_time,
        "bias": bias,
        "pred_dir": pred_dir,
        "prob_up": prob_up if prob_up is not None else p_long,
        "prob_down": p_short,
        "confidence": confidence,
        "currentPrice": current,
        "projectedLow": lower,
        "projectedHigh": upper,
        "pred_future_close": median,
        "expectedMove": "Awaiting live output" if not row else currentTextMove(current, median, symbol),
        "expectedRange": range_text,
        "visible": bool(selected_bool and pred_dir != 0),
        "usable": bool(selected_bool and pred_dir != 0),
        "status": "Live verification in progress" if not row else ("Active V3 shadow signal" if selected_bool else "V3 monitoring: gate rejected current candidate"),
        "signal_status": "Collecting post-launch outcomes",
        "live_verification": True,
        "live_evaluated_n": 0,
        "live_pending_n": 0 if not row else 1,
    }


def currentTextMove(current: Optional[float], target: Optional[float], symbol: str) -> str:
    if current is None or target is None or current == 0:
        return "Model output available"
    change = (target / current - 1.0) * 100.0
    return f"{change:+.2f}%"


def merge_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    original_assets = [item for item in payload.get("assets", []) if isinstance(item, dict)]
    selected: Dict[str, Dict[str, Any]] = {}
    mlp_candidates: List[Dict[str, Any]] = []

    for asset in original_assets:
        key = asset_identity(asset)
        if key == "EURUSD_12H_MLP_COMBINED":
            mlp_candidates.append(asset)
            continue
        if key in FINAL_KEYS and key not in V3_MODELS:
            selected[key] = enrich_old_asset(asset, key)

    if mlp_candidates:
        conservative = next((item for item in mlp_candidates if "CONS" in str(item.get("model_id", "")).upper()), mlp_candidates[0])
        selected["EURUSD_12H_MLP_COMBINED"] = enrich_old_asset(conservative, "EURUSD_12H_MLP_COMBINED")

    shadow_rows = latest_shadow_rows(read_shadow_frame())
    for (symbol, horizon), meta in V3_MODELS.items():
        selected[meta["model_key"]] = make_v3_asset(symbol, horizon, meta, shadow_rows.get((symbol, horizon)))

    placeholders = {
        "EURUSD_3H_PROD_V1": ("EURUSD", 3, "prod_v1"),
        "USDJPY_12H_MLP_WIDE": ("USDJPY", 12, "mlp_live_v1"),
        "GBPJPY_12H_LEGACY": ("GBPJPY", 12, "legacy_jpy_12h"),
        "EURUSD_12H_FINAL_APP_V2": ("EURUSD", 12, "clean_pro_final_app_v2"),
        "EURUSD_12H_MLP_COMBINED": ("EURUSD", 12, "mlp_live_v1"),
        "GBPUSD_12H_FINAL_APP_V2": ("GBPUSD", 12, "clean_pro_final_app_v2"),
    }
    for key, (symbol, horizon, family) in placeholders.items():
        if key in selected:
            continue
        selected[key] = enrich_old_asset({
            "asset": symbol,
            "symbol": symbol,
            "display": symbol,
            "horizon_h": horizon,
            "source": family,
            "model_family": family,
            "model_id": key,
            "model_key": key,
            "bias": "Neutral",
            "pred_dir": 0,
            "expectedMove": "Awaiting existing pipeline output",
            "expectedRange": "Awaiting existing pipeline output",
            "confidence": None,
            "visible": False,
            "usable": False,
            "status": "Awaiting latest output",
            "time_utc": payload.get("generatedAt", utc_now()),
        }, key)

    payload = deepcopy(payload)
    payload["assets"] = [selected[key] for key in FINAL_KEYS]
    payload["modelBoardVersion"] = "13-model-board-v1"
    payload["modelBoardCount"] = 13
    payload["freeModelCount"] = 2
    payload["proModelCount"] = 11
    payload["generatedAt"] = payload.get("generatedAt") or utc_now()
    return payload


def main() -> None:
    print("=" * 100)
    print("MERGE FINAL 13-MODEL BOARD")
    print("=" * 100)
    payload = read_json(APP_SIGNALS_PATH)
    backup = APP_SIGNALS_PATH.with_suffix(".before_13_model_board.json")
    if not backup.exists():
        shutil.copy2(APP_SIGNALS_PATH, backup)
    merged = merge_payload(payload)
    write_json(APP_SIGNALS_PATH, merged)
    print(f"Saved: {APP_SIGNALS_PATH}")
    print("Models:", len(merged.get("assets", [])))
    for asset in merged.get("assets", []):
        print("-", asset.get("model_key"), asset.get("access_tier"), asset.get("status"))


if __name__ == "__main__":
    main()

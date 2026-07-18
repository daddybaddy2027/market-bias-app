from __future__ import annotations

from typing import Any, Dict, Optional

FINAL_MODEL_TIERS = {
    "EURUSD_3H_PROD_V1": "free",
    "USDJPY_6H_V3_STRICT": "free",
    "USDJPY_12H_MLP_WIDE": "pro",
    "GBPJPY_12H_LEGACY": "pro",
    "EURUSD_12H_FINAL_APP_V2": "pro",
    "EURUSD_12H_MLP_COMBINED": "pro",
    "GBPUSD_12H_FINAL_APP_V2": "pro",
    "EURUSD_3H_V3_STRICT": "pro",
    "EURUSD_6H_V3_STRICT": "pro",
    "GBPUSD_6H_V3_STRICT": "pro",
    "USDJPY_12H_V3_STRICT": "pro",
    "AUDUSD_6H_V3_STRICT": "pro",
    "XAUUSD_6H_V3_STRICT": "pro",
}


def normalize(value: Any) -> str:
    return str(value or "").strip().upper().replace("-", "_").replace(" ", "_")


def derive_model_key(asset: Dict[str, Any]) -> str:
    direct = normalize(asset.get("model_key"))
    if direct in FINAL_MODEL_TIERS:
        return direct

    model_id = normalize(asset.get("model_id"))
    if model_id in FINAL_MODEL_TIERS:
        return model_id

    symbol = normalize(asset.get("asset", asset.get("symbol", "")))
    try:
        horizon = int(float(asset.get("horizon_h", 0)))
    except Exception:
        horizon = 0
    source = str(asset.get("source") or "").lower()
    family = str(asset.get("model_family") or "").lower()

    if symbol == "EURUSD" and horizon == 3 and (source == "prod_v1" or family == "prod_v1"):
        return "EURUSD_3H_PROD_V1"
    if symbol == "EURUSD" and horizon == 12 and (source == "final_app_v2" or family == "clean_pro_final_app_v2"):
        return "EURUSD_12H_FINAL_APP_V2"
    if symbol == "GBPUSD" and horizon == 12 and (source == "final_app_v2" or family == "clean_pro_final_app_v2"):
        return "GBPUSD_12H_FINAL_APP_V2"
    if symbol == "GBPJPY" and horizon == 12 and ("legacy" in source or "legacy" in family):
        return "GBPJPY_12H_LEGACY"
    if symbol == "USDJPY" and horizon == 12 and "MLP" in model_id and "WIDE" in model_id:
        return "USDJPY_12H_MLP_WIDE"
    if symbol == "EURUSD" and horizon == 12 and ("MLP" in model_id or source == "mlp_live_v1"):
        return "EURUSD_12H_MLP_COMBINED"
    if family == "v3_strict" or source == "v3_shadow_live_v1":
        candidate = f"{symbol}_{horizon}H_V3_STRICT"
        if candidate in FINAL_MODEL_TIERS:
            return candidate

    return direct or model_id or f"{symbol}_{horizon}H_UNKNOWN"


def tier_from_identity(asset: str, horizon_h: int, model_id: Any = None) -> Optional[str]:
    direct = normalize(model_id)
    if direct in FINAL_MODEL_TIERS:
        return FINAL_MODEL_TIERS[direct]

    prefix = f"{normalize(asset)}_{int(horizon_h)}H_"
    unique = [(key, tier) for key, tier in FINAL_MODEL_TIERS.items() if key.startswith(prefix)]
    return unique[0][1] if len(unique) == 1 else None


def configure_uploader(uploader, policy_path, performance_path) -> None:
    uploader.MODEL_POLICY_PATH = policy_path
    uploader.PERFORMANCE_FULL_CSV_PATH = performance_path
    uploader.SOURCE_VERSION = "13-model-board-v1-v3-live-verification"
    uploader.CANDLE_ASSETS = sorted(set(list(getattr(uploader, "CANDLE_ASSETS", [])) + ["XAUUSD"]))
    uploader.derive_model_key_from_asset = derive_model_key
    uploader.get_tier = tier_from_identity
    uploader.FREE_BASE_MODEL_KEYS = set()
    uploader.FREE_EXACT_MODEL_IDS = {
        ("EURUSD", 3, "EURUSD_3H_PROD_V1"),
        ("USDJPY", 6, "USDJPY_6H_V3_STRICT"),
    }
    uploader.PRO_BASE_MODEL_KEYS = set()
    uploader.FREE_MODEL_KEYS = set()
    uploader.PRO_MODEL_KEYS = set()
    uploader.PUBLIC_MODEL_KEYS = set()

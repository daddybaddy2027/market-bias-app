from __future__ import annotations

from typing import Any, Dict, Optional

# Single source of truth for the commercial production board.
# Research, shadow, legacy and quarantined models must not be uploaded.
FINAL_MODEL_TIERS = {
    "GBPUSD_12H_FINAL_APP_V2": "pro",
    "EURUSD_3H_PROD_V1": "pro",
    "EURUSD_6H_FINAL_APP_V2": "pro",
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

    if symbol == "EURUSD" and horizon == 3 and (
        source == "prod_v1" or family == "prod_v1" or "PROD_V1" in model_id
    ):
        return "EURUSD_3H_PROD_V1"

    if symbol == "EURUSD" and horizon == 6 and (
        source == "final_app_v2"
        or family == "clean_pro_final_app_v2"
        or "FINAL_APP_V2" in model_id
    ):
        return "EURUSD_6H_FINAL_APP_V2"

    if symbol == "GBPUSD" and horizon == 12 and (
        source == "final_app_v2"
        or family == "clean_pro_final_app_v2"
        or "FINAL_APP_V2" in model_id
    ):
        return "GBPUSD_12H_FINAL_APP_V2"

    return direct or model_id or f"{symbol}_{horizon}H_UNKNOWN"


def tier_from_identity(
    asset: str,
    horizon_h: int,
    model_id: Any = None,
) -> Optional[str]:
    direct = normalize(model_id)
    if direct in FINAL_MODEL_TIERS:
        return FINAL_MODEL_TIERS[direct]

    candidate = derive_model_key(
        {
            "asset": asset,
            "horizon_h": horizon_h,
            "model_id": model_id,
        }
    )
    return FINAL_MODEL_TIERS.get(candidate)


def configure_uploader(uploader, policy_path, performance_path) -> None:
    uploader.MODEL_POLICY_PATH = policy_path
    uploader.PERFORMANCE_FULL_CSV_PATH = performance_path
    uploader.SOURCE_VERSION = "production-integrity-v2-three-model-board"
    uploader.derive_model_key_from_asset = derive_model_key
    uploader.get_tier = tier_from_identity

    # No free model output. Every commercial model requires Models access.
    uploader.FREE_BASE_MODEL_KEYS = set()
    uploader.FREE_EXACT_MODEL_IDS = set()
    uploader.PRO_BASE_MODEL_KEYS = set()
    uploader.FREE_MODEL_KEYS = set()
    uploader.PRO_MODEL_KEYS = set()
    uploader.PUBLIC_MODEL_KEYS = set()

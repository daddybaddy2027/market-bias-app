from __future__ import annotations

from pathlib import Path
import re
import shutil

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
SCHEDULER = BASE_DIR / "04_run_live_scheduler.py"
BACKUP = BASE_DIR / "04_run_live_scheduler.before_performance_integrity_v2.py"

NEW_UPLOAD_BLOCK = '''SCRIPT_UPLOAD_SUPABASE = (
    BASE_DIR
    / "backend_integration"
    / "13_upload_to_supabase.py"
)'''

UPLOAD_ASSIGNMENT_PATTERNS = [
    re.compile(r'(?ms)^SCRIPT_UPLOAD_SUPABASE\s*=\s*\(.*?^\)'),
    re.compile(
        r'(?m)^SCRIPT_UPLOAD_SUPABASE\s*=\s*BASE_DIR\s*/\s*["\'](?:10_upload_to_supabase|13_upload_to_supabase)\.py["\']\s*$'
    ),
]

# These engines are quarantined from the commercial production board. Their
# feature inputs remain available to the market-state layer, but their local
# predictor scripts no longer run every hour.
DISABLED_PREDICTOR_CALLS = [
    "SCRIPT_PREDICT_JPY_LEGACY",
    "SCRIPT_PREDICT_MLP_LIVE",
]


def remove_run_script_call(text: str, script_name: str) -> tuple[str, int]:
    pattern = re.compile(
        rf'(?ms)^\s*run_script\(\s*{re.escape(script_name)},\s*env,\s*\)\s*'
    )
    return pattern.subn("", text)


def main() -> None:
    if not SCHEDULER.exists():
        raise FileNotFoundError(SCHEDULER)

    original = SCHEDULER.read_text(encoding="utf-8")
    patched = original

    normalized = patched.replace("\\", "/")
    if not (
        "backend_integration" in normalized
        and "13_upload_to_supabase.py" in normalized
        and "SCRIPT_UPLOAD_SUPABASE" in normalized
    ):
        replacement_count = 0
        for pattern in UPLOAD_ASSIGNMENT_PATTERNS:
            patched, replacement_count = pattern.subn(
                NEW_UPLOAD_BLOCK, patched, count=1
            )
            if replacement_count:
                break
        if not replacement_count:
            raise RuntimeError(
                "Could not locate the SCRIPT_UPLOAD_SUPABASE assignment. "
                "The scheduler was not modified."
            )

    removed: dict[str, int] = {}
    for script_name in DISABLED_PREDICTOR_CALLS:
        patched, count = remove_run_script_call(patched, script_name)
        removed[script_name] = count

    if patched == original:
        print("Scheduler already satisfies Performance Integrity V2.")
        return

    if not BACKUP.exists():
        shutil.copy2(SCHEDULER, BACKUP)

    SCHEDULER.write_text(patched, encoding="utf-8")
    verify = SCHEDULER.read_text(encoding="utf-8").replace("\\", "/")

    if "backend_integration" not in verify or "13_upload_to_supabase.py" not in verify:
        raise RuntimeError("Scheduler uploader patch verification failed")

    for script_name in DISABLED_PREDICTOR_CALLS:
        if re.search(
            rf'(?ms)run_script\(\s*{re.escape(script_name)},\s*env,\s*\)',
            verify,
        ):
            raise RuntimeError(f"Quarantined predictor still runs: {script_name}")

    print("Patched:", SCHEDULER)
    print("Backup:", BACKUP)
    print("Disabled predictor calls:", removed)
    print("Active predictors: SCRIPT_PREDICT_PROD_V1, SCRIPT_PREDICT_FINAL_APP_V2")


if __name__ == "__main__":
    main()

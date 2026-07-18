from __future__ import annotations

from pathlib import Path
import re
import shutil

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
SCHEDULER = BASE_DIR / "04_run_live_scheduler.py"
BACKUP = BASE_DIR / "04_run_live_scheduler.before_13_model_board.py"

NEW_BLOCK = '''SCRIPT_UPLOAD_SUPABASE = (
    BASE_DIR
    / "backend_integration"
    / "13_upload_to_supabase.py"
)'''

ASSIGNMENT_PATTERNS = [
    re.compile(
        r'(?ms)^SCRIPT_UPLOAD_SUPABASE\s*=\s*\(.*?^\)',
    ),
    re.compile(
        r'(?m)^SCRIPT_UPLOAD_SUPABASE\s*=\s*BASE_DIR\s*/\s*["\'](?:10_upload_to_supabase|13_upload_to_supabase)\.py["\']\s*$',
    ),
]


def main() -> None:
    if not SCHEDULER.exists():
        raise FileNotFoundError(SCHEDULER)

    text = SCHEDULER.read_text(encoding="utf-8")
    normalized = text.replace("\\", "/")
    if (
        'backend_integration' in normalized
        and '13_upload_to_supabase.py' in normalized
        and 'SCRIPT_UPLOAD_SUPABASE' in normalized
    ):
        print("Scheduler already uses the 13-model uploader.")
        return

    replacement_count = 0
    patched = text
    for pattern in ASSIGNMENT_PATTERNS:
        patched, replacement_count = pattern.subn(NEW_BLOCK, patched, count=1)
        if replacement_count:
            break

    if not replacement_count:
        raise RuntimeError(
            "Could not locate the SCRIPT_UPLOAD_SUPABASE assignment. "
            "The scheduler was not modified."
        )

    if not BACKUP.exists():
        shutil.copy2(SCHEDULER, BACKUP)

    SCHEDULER.write_text(patched, encoding="utf-8")
    verify = SCHEDULER.read_text(encoding="utf-8").replace("\\", "/")
    if "backend_integration" not in verify or "13_upload_to_supabase.py" not in verify:
        raise RuntimeError("Scheduler patch verification failed after writing the file")

    print("Patched:", SCHEDULER)
    print("Backup:", BACKUP)


if __name__ == "__main__":
    main()

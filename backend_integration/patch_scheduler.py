from __future__ import annotations

from pathlib import Path
import shutil

BASE_DIR = Path(r"C:\Users\Veljko\Desktop\Multi-asset-12h")
SCHEDULER = BASE_DIR / "04_run_live_scheduler.py"
BACKUP = BASE_DIR / "04_run_live_scheduler.before_13_model_board.py"

OLD_BLOCK = '''SCRIPT_UPLOAD_SUPABASE = (
    BASE_DIR
    / "10_upload_to_supabase.py"
)'''

NEW_BLOCK = '''SCRIPT_UPLOAD_SUPABASE = (
    BASE_DIR
    / "backend_integration"
    / "13_upload_to_supabase.py"
)'''


def main() -> None:
    if not SCHEDULER.exists():
        raise FileNotFoundError(SCHEDULER)

    text = SCHEDULER.read_text(encoding="utf-8")
    if NEW_BLOCK in text:
        print("Scheduler already uses the 13-model uploader.")
        return
    if OLD_BLOCK not in text:
        raise RuntimeError(
            "Could not find the expected SCRIPT_UPLOAD_SUPABASE block. "
            "The scheduler was not modified."
        )

    if not BACKUP.exists():
        shutil.copy2(SCHEDULER, BACKUP)

    SCHEDULER.write_text(text.replace(OLD_BLOCK, NEW_BLOCK, 1), encoding="utf-8")
    print("Patched:", SCHEDULER)
    print("Backup:", BACKUP)


if __name__ == "__main__":
    main()

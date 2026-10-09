"""
Measure exact audio duration (in seconds) for every generated clip using ffprobe,
and save a lookup JSON next to dialogue.json keyed by line id.

Output: src/episodes/ep01-degree/durations.json
  { "1": 2.34, "2": 0.87, … }

Usage:
    python tts/measure_durations.py
"""
import json
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR   = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
DIALOGUE     = PROJECT_ROOT / "src" / "episodes" / "ep01-degree" / "dialogue.json"
DURATIONS    = DIALOGUE.parent / "durations.json"
PUBLIC_DIR   = PROJECT_ROOT / "public"


def ffprobe_duration(path: Path) -> float:
    """Return duration in seconds via ffprobe. Raises on failure."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


def main():
    dialogue = json.loads(DIALOGUE.read_text())
    print(f"Measuring {len(dialogue)} clips…\n")

    durations: dict[str, float] = {}
    missing = []

    for line in dialogue:
        line_id   = str(line["id"])
        audio     = line["audio"]
        clip_path = PUBLIC_DIR / audio

        if not clip_path.exists():
            print(f"  [{line_id.zfill(3)}] MISSING  {audio}")
            missing.append(line_id)
            continue

        try:
            dur = ffprobe_duration(clip_path)
            durations[line_id] = round(dur, 4)
            print(f"  [{line_id.zfill(3)}] {dur:.3f}s  {audio}")
        except Exception as exc:
            print(f"  [{line_id.zfill(3)}] ERROR  {exc}")
            missing.append(line_id)

    if missing:
        ids = ", ".join(missing)
        print(f"\nERROR: {len(missing)} clip(s) missing or unreadable: {ids}")
        print("Run tts/generate_voices.py first, then re-run this script.")
        sys.exit(1)

    DURATIONS.write_text(json.dumps(durations, indent=2) + "\n")
    print(f"\nDurations saved → {DURATIONS.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()

"""
Measure every generated clip with ffprobe and write audioDurations.json.

Usage:
    python scripts/measure_durations.py

Looks for audio/degree/001.mp3 … 026.mp3 under public/ (where Remotion serves
audio from). Missing clips are skipped silently, so the timeline falls back to
its placeholder length for them. Output shape, frames at 30 fps:
    { "1": { "file": "audio/degree/001.mp3", "frames": 52.4 }, ... }
"""
import json
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"
OUTPUT = PROJECT_ROOT / "src" / "episodes" / "ep01-degree" / "audioDurations.json"

FPS = 30
FIRST_ID, LAST_ID = 1, 26


def ffprobe_seconds(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


def main() -> None:
    durations, seconds_by_id = {}, {}
    for line_id in range(FIRST_ID, LAST_ID + 1):
        file = f"audio/degree/{line_id:03d}.mp3"
        path = PUBLIC_DIR / file
        if not path.exists():
            continue
        seconds = ffprobe_seconds(path)
        seconds_by_id[line_id] = seconds
        durations[str(line_id)] = {"file": file, "frames": round(seconds * FPS, 1)}

    OUTPUT.write_text(json.dumps(durations, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(durations)} durations to {OUTPUT.relative_to(PROJECT_ROOT)}\n")

    for line_id, seconds in seconds_by_id.items():
        print(f"  line {line_id:2d}  {seconds:6.2f}s")
    print(f"\nTotal runtime: {sum(seconds_by_id.values()):.2f}s")


if __name__ == "__main__":
    main()
